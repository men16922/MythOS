"""Deterministic exception/sample selection for objective evidence reports."""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "overnight_report_evidence", REPO / "scripts/overnight/report-evidence.py"
)
assert SPEC and SPEC.loader
report_evidence = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(report_evidence)


class ReportEvidenceTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def bundle(
        self,
        run_id: str,
        *,
        status: str = "pass",
        decision: str = "pass",
        actor: str = "PASS_CANDIDATE",
        outcome: str = "PASS_CANDIDATE",
        required: bool = True,
    ) -> None:
        run = self.root / run_id
        run.mkdir()
        objective_ids = ["choice_arrival"] if required else []
        (run / "evidence-bundle.json").write_text(json.dumps({
            "run_id": run_id,
            "required_objectives": objective_ids,
            "decision": decision,
            "assertions": [{
                "id": "choice_arrival",
                "required": required,
                "status": status,
                "reason": "fixture",
            }],
        }))
        (run / "verdict.json").write_text(json.dumps({
            "requested_verdict": actor,
            "outcome": outcome,
        }))

    def test_surfaces_all_fail_incomplete_and_disagreement(self) -> None:
        self.bundle("fail", status="fail", decision="fail", outcome="FAIL_EVIDENCE")
        self.bundle(
            "incomplete",
            status="not_observed",
            decision="needs_human",
            outcome="NEEDS_HUMAN",
        )
        self.bundle(
            "disagree",
            status="pass",
            decision="pass",
            actor="NEEDS_HUMAN",
            outcome="PASS_CANDIDATE",
        )
        review = report_evidence.build_review(self.root)
        self.assertEqual(review["counts"]["attention"], 3)
        self.assertEqual(
            {item["run_id"] for item in review["attention"]},
            {"fail", "incomplete", "disagree"},
        )
        disagreement = next(
            item for item in review["attention"] if item["run_id"] == "disagree"
        )
        self.assertTrue(any("disagreement" in reason for reason in disagreement["reasons"]))

    def test_samples_twenty_percent_with_minimum_one_and_cap_three(self) -> None:
        for index in range(20):
            self.bundle(f"clean-{index:02d}")
        first = report_evidence.build_review(self.root)
        second = report_evidence.build_review(self.root)
        self.assertEqual(first["counts"]["clean"], 20)
        self.assertEqual(first["counts"]["sampled_clean"], 3)
        self.assertEqual(first["counts"]["omitted_clean"], 17)
        self.assertEqual(first["sample"], second["sample"])

    def test_ignores_generic_runs_without_required_objectives(self) -> None:
        self.bundle("generic", required=False, decision="not_required")
        review = report_evidence.build_review(self.root)
        self.assertEqual(review["counts"]["not_applicable"], 1)
        self.assertFalse(review["attention"])
        self.assertFalse(review["sample"])

    def test_invalid_bundle_is_always_attention(self) -> None:
        run = self.root / "invalid"
        run.mkdir()
        (run / "evidence-bundle.json").write_text("{")
        review = report_evidence.build_review(self.root)
        self.assertEqual(review["counts"]["invalid"], 1)
        self.assertEqual(review["attention"][0]["run_id"], "invalid")

    def test_rejects_invalid_sampling_policy(self) -> None:
        with self.assertRaises(ValueError):
            report_evidence.build_review(self.root, sample_rate=1.1)
        with self.assertRaises(ValueError):
            report_evidence.build_review(self.root, sample_cap=-1)


if __name__ == "__main__":
    unittest.main()
