"""WS-C/WS-D isolated fake-runner E2E for scripts/overnight/browser-qa.sh.

Drives the QA phase with the REAL candidate filter but a FAKE AGY hook in a
throwaway git repo, so the skip/pass/stop/dedup control paths are proven with no
model, browser, or API cost (plan §14 WS-C/WS-D completion criteria).
"""

from __future__ import annotations

import stat
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BROWSER_QA = REPO_ROOT / "scripts" / "overnight" / "browser-qa.sh"
FILTER = REPO_ROOT / "scripts" / "overnight" / "browser-qa-filter.sh"

_GIT_ENV = {
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null",
    "GIT_AUTHOR_NAME": "qa",
    "GIT_AUTHOR_EMAIL": "qa@example.com",
    "GIT_COMMITTER_NAME": "qa",
    "GIT_COMMITTER_EMAIL": "qa@example.com",
}
_PATH = "/usr/bin:/bin:/usr/local/bin"

# Fake AGY hook: counts invocations, emits the authoritative outcome line, and
# exits with the contract code. FAKE_OUTCOME selects the verdict.
FAKE_HOOK = """#!/usr/bin/env bash
echo "call" >> "$CALLS"
echo "live-qa: AGY actor run=fake-$(wc -l < "$CALLS" | tr -d ' ')"
echo "LIVE_QA_OUTCOME: ${FAKE_OUTCOME:-PASS_CANDIDATE}"
case "${FAKE_OUTCOME:-PASS_CANDIDATE}" in
  FAIL_EVIDENCE) exit 4 ;;
  NEEDS_HUMAN) exit 5 ;;
  *) exit 0 ;;
esac
"""


def _git(repo: Path, *args: str) -> str:
    out = subprocess.run(
        ["git", *args], cwd=repo,
        env={"PATH": _PATH, **_GIT_ENV},
        capture_output=True, text=True, check=True,
    )
    return out.stdout.strip()


class BrowserQARunnerTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self._tmp.name)
        _git(self.repo, "init", "-q", "-b", "main")
        # checklist file so qa_ledger_key has a stable hash
        cl = self.repo / "docs" / "test" / "neo_seoul_live_qa.md"
        cl.parent.mkdir(parents=True)
        cl.write_text("# checklist\n")
        (self.repo / "README.md").write_text("seed\n")
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-q", "-m", "seed")

        # Keep hook/ledger OUTSIDE the repo so `git add -A` never captures them
        # (else the fake hook script would land in the commit and skew the filter).
        self._work = tempfile.TemporaryDirectory()
        work = Path(self._work.name)
        self.calls = work / "calls.log"
        self.hook = work / "fake-hook.sh"
        self.hook.write_text(FAKE_HOOK)
        self.hook.chmod(self.hook.stat().st_mode | stat.S_IXUSR)
        self.logdir = work / "qa-logs"

    def tearDown(self) -> None:
        self._tmp.cleanup()
        self._work.cleanup()

    def _commit(self, rel: str) -> str:
        before = _git(self.repo, "rev-parse", "HEAD")
        p = self.repo / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text("x\n")
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-q", "-m", rel)
        after = _git(self.repo, "rev-parse", "HEAD")
        return f"{before}..{after}"

    def _run(self, *args: str, outcome: str = "PASS_CANDIDATE") -> tuple[str, int]:
        env = {
            "PATH": _PATH,
            "QA_LOG_DIR": str(self.logdir),
            "BROWSER_QA_FILTER": str(FILTER),
            "LIVE_QA_HOOK_CMD": str(self.hook),
            "LIVE_QA_CHECKLIST": "docs/test/neo_seoul_live_qa.md",
            "CALLS": str(self.calls),
            "FAKE_OUTCOME": outcome,
        }
        proc = subprocess.run(
            ["bash", str(BROWSER_QA), *args],
            cwd=self.repo, env=env, capture_output=True, text=True,
        )
        return proc.stdout + proc.stderr, proc.returncode

    def _call_count(self) -> int:
        return len(self.calls.read_text().splitlines()) if self.calls.exists() else 0

    def _head(self) -> str:
        return _git(self.repo, "rev-parse", "HEAD")

    # --- candidate filter skip: hook must NOT run -----------------------------
    def test_docs_commit_filter_skips_without_invoking_agy(self) -> None:
        rng = self._commit("docs/notes.md")
        out, code = self._run("maybe_browser_qa", "post-commit", rng, self._head())
        self.assertEqual(code, 0, out)
        self.assertIn("filter-skip", out)
        self.assertEqual(self._call_count(), 0, "AGY hook was invoked for a docs-only commit")

    # --- candidate pass: hook runs, loop continues ----------------------------
    def test_ui_commit_pass_continues(self) -> None:
        rng = self._commit("src/mythos_ui/App.tsx")
        out, code = self._run("maybe_browser_qa", "post-commit", rng, self._head(),
                              outcome="PASS_CANDIDATE")
        self.assertEqual(code, 0, out)
        self.assertIn("QA_RESULT: PASS_CANDIDATE", out)
        self.assertEqual(self._call_count(), 1)
        ledger = (self.logdir / "qa-status.tsv").read_text()
        self.assertIn("PASS_CANDIDATE", ledger)

    # --- candidate fail: hook runs, loop stops (exit 3), no revert -------------
    def test_ui_commit_fail_stops(self) -> None:
        rng = self._commit("src/mythos_api/serializers.py")
        out, code = self._run("maybe_browser_qa", "post-commit", rng, self._head(),
                              outcome="FAIL_EVIDENCE")
        self.assertEqual(code, 3, out)
        self.assertIn("QA_RESULT: FAIL_EVIDENCE", out)
        self.assertEqual(self._call_count(), 1)

    def test_needs_human_stops(self) -> None:
        rng = self._commit("src/mythos_runtime/session.py")
        out, code = self._run("maybe_browser_qa", "post-commit", rng, self._head(),
                              outcome="NEEDS_HUMAN")
        self.assertEqual(code, 3, out)
        self.assertIn("QA_RESULT: NEEDS_HUMAN", out)

    # --- dedup: same HEAD/range runs the hook exactly once ---------------------
    def test_dedup_same_head_range(self) -> None:
        rng = self._commit("src/mythos_ui/App.tsx")
        head = self._head()
        out1, code1 = self._run("maybe_browser_qa", "post-commit", rng, head)
        out2, code2 = self._run("maybe_browser_qa", "post-commit", rng, head)
        self.assertEqual(code1, 0, out1)
        self.assertEqual(code2, 0, out2)
        self.assertIn("QA_RESULT: dedup", out2)
        self.assertEqual(self._call_count(), 1, "hook should run once across two identical calls")

    # --- drain sweep: runs once, dedups on the same HEAD ----------------------
    def test_drain_runs_once_then_dedups(self) -> None:
        self._commit("src/mythos_ui/App.tsx")
        head = self._head()
        out1, code1 = self._run("maybe_drain_browser_qa", head, outcome="PASS_CANDIDATE")
        out2, code2 = self._run("maybe_drain_browser_qa", head, outcome="PASS_CANDIDATE")
        self.assertEqual(code1, 0, out1)
        self.assertIn("QA_RESULT: PASS_CANDIDATE", out1)
        self.assertEqual(code2, 0, out2)
        self.assertIn("QA_RESULT: dedup", out2)
        self.assertEqual(self._call_count(), 1)

    # --- changed checklist hash makes the same HEAD eligible again -------------
    def test_changed_checklist_reeligible(self) -> None:
        self._commit("src/mythos_ui/App.tsx")
        head = self._head()
        self._run("maybe_drain_browser_qa", head)
        # mutate the checklist → new hash → new dedup key
        (self.repo / "docs" / "test" / "neo_seoul_live_qa.md").write_text("# checklist v2\n")
        out, code = self._run("maybe_drain_browser_qa", head)
        self.assertEqual(code, 0, out)
        self.assertIn("QA_RESULT: PASS_CANDIDATE", out)
        self.assertEqual(self._call_count(), 2, "checklist change should re-trigger the sweep")


if __name__ == "__main__":
    unittest.main()
