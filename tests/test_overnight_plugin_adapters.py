from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
COMPILER = REPO / "scripts/overnight/compile-contract.sh"
VERIFIERS = REPO / "scripts/overnight/verifiers.d"


def run(
    argv: list[str | Path],
    *,
    cwd: Path = REPO,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    return subprocess.run(
        [str(value) for value in argv],
        cwd=cwd,
        env=merged,
        text=True,
        capture_output=True,
        check=False,
    )


class ContractCompilerTests(unittest.TestCase):
    def base_env(self, plan: Path) -> dict[str, str]:
        return {
            "CONTRACT_PLAN_DOC": str(plan),
            "CONTRACT_MISSION_ID": "mission-fixture",
            "CONTRACT_ENGINE": "codex",
            "CONTRACT_WALL_MINUTES": "30",
            "CONTRACT_RETRIES": "2",
            "CONTRACT_SUBAGENTS": "0",
            "CONTRACT_CRITIC": "1",
        }

    def test_compiles_top_lane_item_and_required_verifiers(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            temp = Path(raw)
            plan = temp / "NEXT_PLAN.md"
            output = temp / "contract.json"
            plan.write_text(
                "- [ ] [auto:codex] 전투 UI 수정. Done: route test와 browser evidence 통과.\n"
            )
            result = run([COMPILER, output], env=self.base_env(plan))
            self.assertEqual(result.returncode, 0, result.stderr)
            contract = json.loads(output.read_text())
            names = {entry["verifier"] for entry in contract["evidence"]}
            self.assertTrue(
                {"gate", "critic", "10-diff-scope", "20-gameplay-oracle", "30-browser-objective"}
                <= names
            )
            self.assertEqual(contract["oversight"]["mode"], "monitored")


    def test_compiles_six_objective_assertions_into_browser_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            temp = Path(raw)
            plan = temp / "NEXT_PLAN.md"
            output = temp / "contract.json"
            plan.write_text(
                "- [ ] [auto:codex] Browser QA for image arrival, companion join, "
                "party distribution, cutscene cardinality/return, Choice-arrival, "
                "and first-use gloss. Done: all objective assertions emit evidence.\n"
            )
            result = run([COMPILER, output], env=self.base_env(plan))
            self.assertEqual(result.returncode, 0, result.stderr)
            contract = json.loads(output.read_text())
            browser = next(
                entry
                for entry in contract["evidence"]
                if entry["verifier"] == "30-browser-objective"
            )
            self.assertEqual(browser["assertions"], [
                "image_arrival",
                "companion_join",
                "party_distribution",
                "cutscene_cardinality_return",
                "choice_arrival",
                "first_use_gloss",
            ])

    def test_drained_and_all_blocked_are_distinct(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            temp = Path(raw)
            plan = temp / "NEXT_PLAN.md"
            output = temp / "contract.json"
            plan.write_text("- [ ] [manual] owner review\n")
            self.assertEqual(run([COMPILER, output], env=self.base_env(plan)).returncode, 3)
            plan.write_text("- [ ] [auto:codex] [blocked] waiting. Done: dependency available.\n")
            self.assertEqual(run([COMPILER, output], env=self.base_env(plan)).returncode, 4)


class VerifierTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self._tmp.name)
        run(["git", "init", "-q"], cwd=self.repo)
        run(["git", "config", "user.name", "fixture"], cwd=self.repo)
        run(["git", "config", "user.email", "fixture@example.invalid"], cwd=self.repo)
        (self.repo / "src").mkdir()
        (self.repo / "docs").mkdir()
        (self.repo / "src/base.py").write_text("VALUE = 1\n")
        (self.repo / "docs/note.md").write_text("base\n")
        run(["git", "add", "."], cwd=self.repo)
        run(["git", "commit", "-qm", "base"], cwd=self.repo)
        self.base = run(["git", "rev-parse", "HEAD"], cwd=self.repo).stdout.strip()

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def commit(self, path: str, value: str) -> str:
        target = self.repo / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(value)
        run(["git", "add", path], cwd=self.repo)
        result = run(["git", "commit", "-qm", f"change {path}"], cwd=self.repo)
        self.assertEqual(result.returncode, 0, result.stderr)
        return f"{self.base}..HEAD"

    def contract(self, include: list[str]) -> Path:
        path = self.repo / "contract.json"
        path.write_text(json.dumps({"scope": {"include": include, "exclude": [".env"]}}))
        return path

    def test_diff_scope_accepts_in_scope_and_rejects_escape(self) -> None:
        diff_range = self.commit("src/base.py", "VALUE = 2\n")
        verifier = VERIFIERS / "10-diff-scope.sh"
        ok = run(
            [verifier, diff_range],
            cwd=self.repo,
            env={"OVERNIGHT_CONTRACT_FILE": str(self.contract(["src/"]))},
        )
        self.assertEqual(ok.returncode, 0, ok.stdout + ok.stderr)
        escaped = run(
            [verifier, diff_range],
            cwd=self.repo,
            env={"OVERNIGHT_CONTRACT_FILE": str(self.contract(["docs/"]))},
        )
        self.assertEqual(escaped.returncode, 1)
        self.assertIn("out-of-scope", escaped.stdout)

    def test_non_applicable_semantic_verifiers_pass(self) -> None:
        diff_range = self.commit("docs/note.md", "documentation only\n")
        for name in ("20-gameplay-oracle.sh", "40-image-identity.sh"):
            result = run([VERIFIERS / name, diff_range], cwd=self.repo)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("not applicable", result.stdout)

    def test_browser_outcomes_map_to_plugin_protocol(self) -> None:
        diff_range = self.commit("src/browser.tsx", "export const value = 1\n")
        filter_script = self.repo / "filter.sh"
        runner_script = self.repo / "runner.sh"
        filter_script.write_text("#!/usr/bin/env bash\nprintf 'CANDIDATE\\tfixture\\n'\n")
        runner_script.write_text("#!/usr/bin/env bash\nprintf 'QA_RESULT: NEEDS_HUMAN\\n'\nexit 3\n")
        filter_script.chmod(0o755)
        runner_script.chmod(0o755)
        result = run(
            [VERIFIERS / "30-browser-objective.sh", diff_range],
            cwd=self.repo,
            env={
                "BROWSER_QA_FILTER": str(filter_script),
                "BROWSER_QA_RUNNER": str(runner_script),
            },
        )
        self.assertEqual(result.returncode, 3, result.stdout + result.stderr)
        self.assertIn("needs human", result.stdout)


    def test_browser_verifier_forwards_contract_assertions_and_evidence_ref(self) -> None:
        diff_range = self.commit("src/objective.tsx", "export const objective = 1\n")
        filter_script = self.repo / "filter-objective.sh"
        runner_script = self.repo / "runner-objective.sh"
        capture = self.repo / "captured-objectives.txt"
        contract = self.repo / "objective-contract.json"
        contract.write_text(json.dumps({
            "evidence": [{
                "verifier": "30-browser-objective",
                "required": True,
                "assertions": ["choice_arrival", "first_use_gloss"],
            }]
        }))
        filter_script.write_text(
            "#!/usr/bin/env bash\nprintf 'CANDIDATE\\tfixture\\n'\n"
        )
        runner_script.write_text(
            "#!/usr/bin/env bash\n"
            "printf '%s' \"$LIVE_QA_OBJECTIVES\" > \"$CAPTURE\"\n"
            "printf 'LIVE_QA_EVIDENCE: outputs/live-qa/fixture/evidence-bundle.json\\n'\n"
            "printf 'QA_RESULT: PASS_CANDIDATE\\n'\n"
        )
        filter_script.chmod(0o755)
        runner_script.chmod(0o755)
        result = run(
            [VERIFIERS / "30-browser-objective.sh", diff_range],
            cwd=self.repo,
            env={
                "BROWSER_QA_FILTER": str(filter_script),
                "BROWSER_QA_RUNNER": str(runner_script),
                "OVERNIGHT_CONTRACT_FILE": str(contract),
                "CAPTURE": str(capture),
            },
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(capture.read_text(), "choice_arrival,first_use_gloss")
        self.assertIn("evidence=outputs/live-qa/fixture/evidence-bundle.json", result.stdout)


if __name__ == "__main__":
    unittest.main()
