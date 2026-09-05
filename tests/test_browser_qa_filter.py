"""WS-A fixture matrix for scripts/overnight/browser-qa-filter.sh.

The candidate filter is Stage 1 of the automatic browser-QA decision
(bin/docs/plans/2026-06-21-overnight-auto-agy-qa.md §5): a cheap, side-effect-free
cost gate that decides whether a commit range could change anything a player
sees. These tests build real throwaway git repos, commit fixture diffs, and
assert the verdict + exit code, plus that the filter mutates nothing.
"""

from __future__ import annotations

import subprocess
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FILTER = REPO_ROOT / "scripts" / "overnight" / "browser-qa-filter.sh"

_GIT_ENV = {
    # Isolate from the developer's global git config / hooks / signing.
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null",
    "GIT_AUTHOR_NAME": "qa",
    "GIT_AUTHOR_EMAIL": "qa@example.com",
    "GIT_COMMITTER_NAME": "qa",
    "GIT_COMMITTER_EMAIL": "qa@example.com",
}


def _git(repo: Path, *args: str) -> str:
    out = subprocess.run(
        ["git", *args],
        cwd=repo,
        env={"PATH": "/usr/bin:/bin:/usr/local/bin", **_GIT_ENV},
        capture_output=True,
        text=True,
        check=True,
    )
    return out.stdout.strip()


class BrowserQAFilterTest(unittest.TestCase):
    def setUp(self) -> None:
        self.assertTrue(FILTER.exists(), f"filter helper missing: {FILTER}")
        self._tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self._tmp.name)
        _git(self.repo, "init", "-q", "-b", "main")
        # seed an initial commit so HEAD~1 / ranges resolve
        (self.repo / "README.md").write_text("seed\n")
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-q", "-m", "seed")

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _commit_files(self, files: dict[str, str]) -> str:
        """Write files, commit, return the range HEAD_BEFORE..HEAD_AFTER."""
        before = _git(self.repo, "rev-parse", "HEAD")
        for rel, content in files.items():
            p = self.repo / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content)
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-q", "-m", "fixture")
        after = _git(self.repo, "rev-parse", "HEAD")
        return f"{before}..{after}"

    def _run_filter(self, range_arg: str) -> tuple[str, int]:
        proc = subprocess.run(
            ["bash", str(FILTER), range_arg],
            cwd=self.repo,
            capture_output=True,
            text=True,
        )
        return proc.stdout.strip(), proc.returncode

    def _assert_verdict(self, files: dict[str, str], expected: str) -> None:
        rng = self._commit_files(files)
        # side-effect check: filter must not touch the working tree
        before_status = _git(self.repo, "status", "--porcelain")
        line, code = self._run_filter(rng)
        after_status = _git(self.repo, "status", "--porcelain")

        verdict = line.split("\t", 1)[0]
        self.assertEqual(verdict, expected, f"files={list(files)} → {line!r} (exit {code})")
        # exit code must agree with the printed verdict
        self.assertEqual(code, 0 if expected == "CANDIDATE" else 1, line)
        # machine-readable: exactly "VERDICT<TAB>reason"
        self.assertIn("\t", line, line)
        self.assertEqual(before_status, after_status, "filter mutated the repo")

    # --- SKIP: clearly non-browser-facing -----------------------------------
    def test_docs_only_skips(self) -> None:
        self._assert_verdict({"docs/STATUS.md": "x\n"}, "SKIP")

    def test_tests_only_skips(self) -> None:
        self._assert_verdict({"tests/test_new_invariant.py": "x\n"}, "SKIP")

    def test_harness_only_skips(self) -> None:
        self._assert_verdict({"scripts/overnight/run.sh": "# x\n"}, "SKIP")

    def test_root_config_skips(self) -> None:
        self._assert_verdict({"Makefile": "x:\n\t@true\n"}, "SKIP")

    def test_bin_archive_skips(self) -> None:
        self._assert_verdict({"bin/docs/archive/old.md": "x\n"}, "SKIP")

    def test_migrations_skip(self) -> None:
        self._assert_verdict({"migrations/009_x.sql": "select 1;\n"}, "SKIP")

    def test_multi_file_all_skip(self) -> None:
        self._assert_verdict(
            {"docs/A.md": "a\n", "tests/test_b.py": "b\n", "harness/c.sh": "c\n"},
            "SKIP",
        )

    # --- CANDIDATE: touches UI-observable behavior --------------------------
    def test_frontend_ui_is_candidate(self) -> None:
        self._assert_verdict({"src/mythos_ui/App.tsx": "x\n"}, "CANDIDATE")

    def test_api_payload_is_candidate(self) -> None:
        self._assert_verdict({"src/mythos_api/serializers.py": "x\n"}, "CANDIDATE")

    def test_runtime_session_is_candidate(self) -> None:
        self._assert_verdict({"src/mythos_runtime/session.py": "x\n"}, "CANDIDATE")

    def test_combat_is_candidate(self) -> None:
        self._assert_verdict({"src/mythos_combat/engine.py": "x\n"}, "CANDIDATE")

    def test_scenario_json_is_candidate(self) -> None:
        self._assert_verdict({"resources/neo-seoul/scenario.json": "{}\n"}, "CANDIDATE")

    def test_curated_asset_is_candidate(self) -> None:
        self._assert_verdict({"resources/neo-seoul/scenes/cut.png": "pngbytes\n"}, "CANDIDATE")

    def test_playwright_selectors_are_candidate(self) -> None:
        self._assert_verdict({"tests/playwright/test_e2e.py": "x\n"}, "CANDIDATE")

    def test_mixed_docs_and_ui_is_candidate(self) -> None:
        self._assert_verdict({"docs/X.md": "x\n", "src/mythos_ui/Y.tsx": "y\n"}, "CANDIDATE")

    def test_unknown_path_biases_candidate(self) -> None:
        self._assert_verdict({"src/mythos_brandnew/x.py": "x\n"}, "CANDIDATE")

    # --- uncertainty bias ---------------------------------------------------
    def test_empty_range_biases_candidate(self) -> None:
        head = _git(self.repo, "rev-parse", "HEAD")
        line, code = self._run_filter(f"{head}..{head}")  # no diff
        self.assertEqual(line.split("\t", 1)[0], "CANDIDATE", line)
        self.assertEqual(code, 0, line)

    def test_no_range_arg_is_usage_error(self) -> None:
        proc = subprocess.run(
            ["bash", str(FILTER)],
            cwd=self.repo,
            capture_output=True,
            text=True,
        )
        self.assertEqual(proc.returncode, 2, proc.stderr)


if __name__ == "__main__":
    unittest.main()
