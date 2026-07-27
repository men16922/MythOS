from __future__ import annotations

import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMPILER = ROOT / "scripts/overnight/compile-contract.sh"
REGRESSION_VERIFIER = ROOT / "scripts/overnight/verifiers.d/15-regression-validity.sh"


def _write_executable(path: Path, text: str = "#!/bin/sh\nexit 0\n") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    path.chmod(0o755)


def _mission_spec(*, approved_by: str = "owner", command: list[str] | None = None) -> dict:
    return {
        "schema": 1,
        "id": "fixture-mission",
        "approval": {"decision": "approved", "by": approved_by, "at": "2026-07-26"},
        "intent": "Prove the MissionSpec seam.",
        "design": {
            "module": "fixture module",
            "interface": "one command",
            "types": ["fixture"],
            "call_flow": ["base", "candidate"],
            "invariants": ["candidate only"],
            "rollback": "revert commit",
        },
        "risk": {
            "customer_proximity": "none",
            "reversible": True,
            "secrets": False,
            "production": False,
            "destructive": False,
        },
        "slices": [
            {
                "id": "fixture-slice",
                "include": ["target.txt", "docs/fixture-plan.md"],
                "done": "target exists and the plan item is complete",
                "dependencies": [],
                "review_budget": 1,
            }
        ],
        "regression": {
            "mode": "command",
            "command": command
            or ["python3", "-c", "from pathlib import Path; assert Path('target.txt').is_file()"],
            "base_exit": 1,
            "candidate_exit": 0,
        },
    }


class MissionSpecCompilerTest(unittest.TestCase):
    def _fixture(self, directory: Path, spec: dict) -> tuple[Path, Path]:
        spec_path = directory / "docs/plans/fixture.json"
        spec_path.parent.mkdir(parents=True)
        spec_path.write_text(json.dumps(spec))
        plan_path = directory / "docs/fixture-plan.md"
        plan_path.write_text(
            "- [ ] [auto:claude] Create target. "
            "MissionSpec: docs/plans/fixture.json. Done: target exists.\n"
        )
        _write_executable(directory / "scripts/overnight/verifiers.d/10-diff-scope.sh")
        _write_executable(directory / "scripts/overnight/verifiers.d/15-regression-validity.sh")
        return spec_path, plan_path

    def _compile(self, directory: Path, plan: Path) -> subprocess.CompletedProcess[str]:
        output = directory / "logs/contract.json"
        env = os.environ.copy()
        env.update(
            {
                "CONTRACT_PLAN_DOC": str(plan),
                "CONTRACT_MISSION_ID": "mission-fixture",
                "OVERNIGHT_LANE": "claude",
                "GOAL_MAX_TURNS": "12",
                "CONTRACT_SUBAGENTS": "0",
                "CONTRACT_REVISIONS": "0",
            }
        )
        return subprocess.run(
            [str(COMPILER), str(output)],
            cwd=directory,
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_compiles_owner_approved_spec_into_existing_contract_extension_point(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            spec_path, plan = self._fixture(directory, _mission_spec())

            result = self._compile(directory, plan)

            self.assertEqual(result.returncode, 0, result.stderr)
            contract = json.loads((directory / "logs/contract.json").read_text())
            self.assertEqual(contract["scope"]["include"], ["target.txt", "docs/fixture-plan.md"])
            self.assertEqual(contract["budgets"]["turns"], 12)
            self.assertEqual(contract["budgets"]["revisions"], 0)
            self.assertEqual(contract["budgets"]["subagents"], 0)
            regression = next(
                item for item in contract["evidence"] if item["verifier"] == "15-regression-validity"
            )
            expected_hash = hashlib.sha256(spec_path.read_bytes()).hexdigest()
            self.assertEqual(
                regression["config"]["mission_spec_ref"],
                f"docs/plans/fixture.json#sha256={expected_hash}",
            )
            self.assertEqual(regression["config"]["slice_ids"], ["fixture-slice"])
            self.assertEqual(contract["oversight"]["mode"], "monitored")

    def test_rejects_spec_without_owner_approval(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            _, plan = self._fixture(directory, _mission_spec(approved_by="agent"))

            result = self._compile(directory, plan)

            self.assertEqual(result.returncode, 2)
            self.assertIn("explicit owner approval", result.stderr)


class RegressionValidityVerifierTest(unittest.TestCase):
    def test_same_assertion_fails_on_base_and_passes_on_candidate(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            repo = Path(temp)
            subprocess.run(["git", "init", "-q", str(repo)], check=True)
            subprocess.run(["git", "-C", str(repo), "config", "user.email", "fixture@mythos.local"], check=True)
            subprocess.run(["git", "-C", str(repo), "config", "user.name", "Fixture"], check=True)
            spec_path = repo / "docs/plans/fixture.json"
            spec_path.parent.mkdir(parents=True)
            spec = _mission_spec()
            spec_path.write_text(json.dumps(spec))
            plan = repo / "docs/fixture-plan.md"
            plan.write_text("- [ ] [auto:claude] Create target.\n")
            subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
            subprocess.run(["git", "-C", str(repo), "commit", "-qm", "test: base"], check=True)
            base = subprocess.check_output(["git", "-C", str(repo), "rev-parse", "HEAD"], text=True).strip()
            (repo / "target.txt").write_text("candidate\n")
            plan.write_text("- [x] [auto:claude] Create target.\n")
            subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
            subprocess.run(["git", "-C", str(repo), "commit", "-qm", "test: candidate"], check=True)
            candidate = subprocess.check_output(
                ["git", "-C", str(repo), "rev-parse", "HEAD"], text=True
            ).strip()
            spec_hash = hashlib.sha256(spec_path.read_bytes()).hexdigest()
            contract = {
                "id": "mission-fixture",
                "evidence": [
                    {
                        "verifier": "15-regression-validity",
                        "required": True,
                        "config": {
                            "mission_spec_ref": f"docs/plans/fixture.json#sha256={spec_hash}",
                            "slice_ids": ["fixture-slice"],
                        },
                    }
                ],
            }
            contract_path = repo / "contract.json"
            contract_path.write_text(json.dumps(contract))
            log_dir = repo / "logs"
            env = os.environ.copy()
            env.update(
                {
                    "OVERNIGHT_CONTRACT_FILE": str(contract_path),
                    "OVERNIGHT_LOG_DIR": str(log_dir),
                }
            )

            result = subprocess.run(
                [str(REGRESSION_VERIFIER), f"{base}..{candidate}"],
                cwd=repo,
                env=env,
                text=True,
                capture_output=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("regression validity passed", result.stdout)
            report = json.loads(next(log_dir.glob("regression-validity-*.json")).read_text())
            self.assertEqual(report["base"]["exit"], 1)
            self.assertEqual(report["candidate"]["exit"], 0)
            self.assertEqual(report["range"], {"base": base, "candidate": candidate})


if __name__ == "__main__":
    unittest.main()
