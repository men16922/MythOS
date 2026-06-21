"""WS-B fixture matrix for the AGY live-QA outcome classifier.

`scripts/live-qa/artifacts.py` is loaded by path (it is a standalone script, not
a package). `decide_outcome` is pure, so fake AGY transcripts classify without a
browser/API/git; `finalize` is exercised against on-disk fixture evidence dirs.
"""

from __future__ import annotations

import importlib.util
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
_SPEC = importlib.util.spec_from_file_location(
    "live_qa_artifacts", REPO_ROOT / "scripts" / "live-qa" / "artifacts.py"
)
assert _SPEC and _SPEC.loader
artifacts = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(artifacts)

RUN_END = (
    "AGY_BROWSER_TOOL: PLAYWRIGHT_MCP\n"
    "LIVE_QA_VERDICT: PASS_CANDIDATE — looks good\n"
)


def _full_evidence(**over):
    facts = dict(
        event_count=2,
        screenshot_count=2,
        empty_screenshot=False,
        console_present=True,
        agy_exit=0,
        server_stopped=True,
    )
    facts.update(over)
    return facts


class DecideOutcomeTest(unittest.TestCase):
    def _classify(self, raw, **facts):
        return artifacts.decide_outcome(raw, **_full_evidence(**facts))[0]

    def test_skip_decision_clean(self):
        self.assertEqual(
            self._classify("QA_DECISION: SKIP — docs only", event_count=0, screenshot_count=0,
                           console_present=False),
            "SKIP",
        )

    def test_skip_decision_with_infra_fault_needs_human(self):
        self.assertEqual(
            self._classify("QA_DECISION: SKIP — docs only", event_count=0, screenshot_count=0,
                           console_present=False, agy_exit=1),
            "NEEDS_HUMAN",
        )

    def test_run_full_evidence_pass(self):
        self.assertEqual(self._classify("QA_DECISION: RUN — ui change\n" + RUN_END), "PASS_CANDIDATE")

    def test_run_full_evidence_fail(self):
        raw = (
            "QA_DECISION: RUN — ui change\n"
            "AGY_BROWSER_TOOL: CHROME_DEVTOOLS\n"
            "LIVE_QA_VERDICT: FAIL_EVIDENCE — console threw on load\n"
        )
        self.assertEqual(self._classify(raw), "FAIL_EVIDENCE")

    def test_run_full_evidence_needs_human_verdict(self):
        raw = (
            "QA_DECISION: RUN — ui change\n"
            "AGY_BROWSER_TOOL: CHROME_DEVTOOLS\n"
            "LIVE_QA_VERDICT: NEEDS_HUMAN — ambiguous\n"
        )
        self.assertEqual(self._classify(raw), "NEEDS_HUMAN")

    def test_run_missing_screenshots_needs_human(self):
        self.assertEqual(self._classify("QA_DECISION: RUN\n" + RUN_END, screenshot_count=1),
                         "NEEDS_HUMAN")

    def test_run_missing_verdict_needs_human(self):
        self.assertEqual(self._classify("QA_DECISION: RUN\nAGY_BROWSER_TOOL: CHROME_DEVTOOLS\n"),
                         "NEEDS_HUMAN")

    def test_run_no_tool_needs_human(self):
        raw = "QA_DECISION: RUN\nLIVE_QA_VERDICT: PASS_CANDIDATE — ok\n"
        self.assertEqual(self._classify(raw), "NEEDS_HUMAN")  # tool defaults NONE

    def test_unspecified_decision_treated_as_run(self):
        # no QA_DECISION line, but complete evidence + positive verdict
        self.assertEqual(self._classify(RUN_END), "PASS_CANDIDATE")

    def test_server_not_stopped_needs_human(self):
        self.assertEqual(self._classify("QA_DECISION: RUN\n" + RUN_END, server_stopped=False),
                         "NEEDS_HUMAN")

    def test_exit_code_mapping(self):
        self.assertEqual(artifacts.OUTCOME_EXIT["PASS_CANDIDATE"], 0)
        self.assertEqual(artifacts.OUTCOME_EXIT["SKIP"], 0)
        self.assertEqual(artifacts.OUTCOME_EXIT["FAIL_EVIDENCE"], 4)
        self.assertEqual(artifacts.OUTCOME_EXIT["NEEDS_HUMAN"], 5)


class ParseFindingsTest(unittest.TestCase):
    def test_parses_multiple_with_severity_and_area(self):
        raw = (
            "QA_DECISION: RUN\n"
            "QA_FINDING: blocker | onboarding | start button throws TypeError in console\n"
            "QA_FINDING: minor | codex | avatar image 404 on locked entry\n"
            + RUN_END
        )
        fs = artifacts.parse_findings(raw)
        self.assertEqual(len(fs), 2)
        self.assertEqual(fs[0], {"severity": "blocker", "area": "onboarding",
                                 "detail": "start button throws TypeError in console"})
        self.assertEqual(fs[1]["severity"], "minor")
        self.assertEqual(fs[1]["area"], "codex")

    def test_none_when_absent(self):
        self.assertEqual(artifacts.parse_findings(RUN_END), [])

    def test_case_insensitive_severity(self):
        fs = artifacts.parse_findings("QA_FINDING: MAJOR | combat | hp bar not updating\n")
        self.assertEqual(fs[0]["severity"], "major")


class FinalizeTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.out = Path(self._tmp.name)
        (self.out / "screenshots").mkdir()
        (self.out / "manifest.json").write_text(
            json.dumps({"schema_version": 2, "run_id": "t", "status": "running"}) + "\n"
        )

    def tearDown(self):
        self._tmp.cleanup()

    def _evidence(self, n_events=2, n_shots=2, console=True):
        if n_events:
            lines = [json.dumps({"turn": i, "title": "t"}) for i in range(n_events)]
            (self.out / "events.jsonl").write_text("\n".join(lines) + "\n")
        for i in range(n_shots):
            (self.out / "screenshots" / f"turn-{i:02d}.png").write_bytes(b"png")
        if console:
            (self.out / "console.log").write_text("none\n")

    def _finalize(self, raw, agy_exit=0, server_stopped=True):
        raw_path = self.out / "agy-output.raw.txt"
        raw_path.write_text(raw)
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = artifacts.finalize(self.out, raw_path, agy_exit, server_stopped)
        return rc, buf.getvalue(), json.loads((self.out / "verdict.json").read_text())

    def test_finalize_pass(self):
        self._evidence()
        rc, out, verdict = self._finalize("QA_DECISION: RUN\n" + RUN_END)
        self.assertEqual(rc, 0)
        self.assertIn("LIVE_QA_OUTCOME: PASS_CANDIDATE", out)
        self.assertEqual(verdict["outcome"], "PASS_CANDIDATE")

    def test_finalize_skip(self):
        rc, out, verdict = self._finalize("QA_DECISION: SKIP — no ui surface")
        self.assertEqual(rc, 0)
        self.assertIn("LIVE_QA_OUTCOME: SKIP", out)
        self.assertEqual(verdict["outcome"], "SKIP")

    def test_finalize_fail_evidence(self):
        self._evidence()
        raw = ("QA_DECISION: RUN\nAGY_BROWSER_TOOL: CHROME_DEVTOOLS\n"
               "LIVE_QA_VERDICT: FAIL_EVIDENCE — fatal console error\n")
        rc, out, _ = self._finalize(raw)
        self.assertEqual(rc, 4)
        self.assertIn("LIVE_QA_OUTCOME: FAIL_EVIDENCE", out)

    def test_finalize_records_and_reemits_findings(self):
        self._evidence()
        raw = ("QA_DECISION: RUN\nQA_FINDING: minor | codex | locked avatar 404\n" + RUN_END)
        rc, out, verdict = self._finalize(raw)
        self.assertEqual(rc, 0)
        self.assertIn("QA_FINDING: minor | codex | locked avatar 404", out)  # re-emitted to stdout
        self.assertEqual(len(verdict["findings"]), 1)
        self.assertEqual(verdict["findings"][0]["area"], "codex")

    def test_finalize_incomplete_needs_human(self):
        self._evidence(n_shots=0)  # no screenshots
        rc, out, verdict = self._finalize("QA_DECISION: RUN\n" + RUN_END)
        self.assertEqual(rc, 5)
        self.assertIn("LIVE_QA_OUTCOME: NEEDS_HUMAN", out)
        self.assertTrue(verdict["validation_errors"])


if __name__ == "__main__":
    unittest.main()
