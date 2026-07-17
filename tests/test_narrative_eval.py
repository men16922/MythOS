"""Locks for the narrative eval harness (scripts/eval/) — golden bank + LLM-judge.

Pure-function coverage only: transcript validation, judge-prompt assembly, verdict
parsing, report rendering. No CLI/model invocation (that path is manual via
`make eval-narrative`). Background: docs/reference/2026-07-17-anthropic-openai-
agent-stacks.md §3-1 (trace→eval gap).
"""

from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

_spec = importlib.util.spec_from_file_location(
    "narrative_judge", ROOT / "scripts" / "eval" / "narrative_judge.py"
)
assert _spec is not None and _spec.loader is not None
judge = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(judge)


def _transcript(**overrides):
    base = {
        "name": "t1",
        "scenario_id": "neo-seoul",
        "language": "ko",
        "note": "unit fixture",
        "scenes": [
            {
                "turn_index": 0,
                "title": "골목",
                "location": "C-17",
                "narration": "비가 내린다. 세린이 손을 내민다.",
                "action_result": None,
                "choices": ["손을 잡는다", "물러선다"],
            },
            {
                "turn_index": 1,
                "title": "추격",
                "location": "지하보도",
                "narration": "드론 불빛이 스친다.",
                "action_result": "손을 잡았다.",
                "choices": ["달린다"],
            },
        ],
    }
    base.update(overrides)
    return base


class GoldenValidationTest(unittest.TestCase):
    def test_valid_transcript_loads(self) -> None:
        path = ROOT / "scripts" / "eval" / "_tmp_valid.json"
        path.write_text(json.dumps(_transcript(), ensure_ascii=False), encoding="utf-8")
        try:
            data = judge.load_golden(path)
            self.assertEqual(len(data["scenes"]), 2)
        finally:
            path.unlink()

    def test_missing_scene_key_rejected(self) -> None:
        bad = _transcript()
        del bad["scenes"][0]["narration"]
        path = ROOT / "scripts" / "eval" / "_tmp_bad.json"
        path.write_text(json.dumps(bad, ensure_ascii=False), encoding="utf-8")
        try:
            with self.assertRaises(ValueError):
                judge.load_golden(path)
        finally:
            path.unlink()

    def test_banked_sample_is_valid(self) -> None:
        # The committed sample must always satisfy the harness contract.
        sample = ROOT / "scripts" / "eval" / "golden" / "sample-fallback-ko.json"
        data = judge.load_golden(sample)
        self.assertEqual(data["scenario_id"], "neo-seoul")
        self.assertTrue(data["scenes"][0]["narration"])


class JudgePromptTest(unittest.TestCase):
    def test_prompt_carries_rubric_transcript_and_contract(self) -> None:
        prompt = judge.build_judge_prompt(_transcript(), "RUBRIC_BODY_SENTINEL")
        self.assertIn("RUBRIC_BODY_SENTINEL", prompt)
        self.assertIn("세린이 손을 내민다", prompt)
        self.assertIn("Turn 1 — 추격", prompt)
        self.assertIn("직전 행동 결과: 손을 잡았다.", prompt)
        self.assertIn("raw JSON verdict", prompt)

    def test_rubric_file_defines_axes_and_strict_contract(self) -> None:
        rubric = (ROOT / "scripts" / "eval" / "RUBRIC.md").read_text(encoding="utf-8")
        for axis in ("continuity", "register", "repetition", "naming", "choices"):
            self.assertIn(axis, rubric)
        self.assertIn('"overall"', rubric)


class VerdictParsingTest(unittest.TestCase):
    VERDICT = {"scores": {"continuity": 4}, "overall": 4, "issues": [], "one_line": "ok"}

    def test_raw_json(self) -> None:
        self.assertEqual(judge.parse_verdict(json.dumps(self.VERDICT))["overall"], 4)

    def test_fenced_json_tolerated(self) -> None:
        raw = "Here you go:\n```json\n" + json.dumps(self.VERDICT) + "\n```\nthanks"
        self.assertEqual(judge.parse_verdict(raw)["scores"]["continuity"], 4)

    def test_prose_wrapped_json_tolerated(self) -> None:
        raw = "verdict: " + json.dumps(self.VERDICT) + " (end)"
        self.assertEqual(judge.parse_verdict(raw)["overall"], 4)

    def test_missing_scores_rejected(self) -> None:
        with self.assertRaises(ValueError):
            judge.parse_verdict('{"overall": 4}')


class ReportTest(unittest.TestCase):
    def test_report_folds_scores_and_issues(self) -> None:
        verdict = {
            "scores": {"continuity": 4, "register": 3},
            "overall": 3,
            "issues": [{"turn": 2, "axis": "register", "quote": "잔향 회랑", "note": "반복"}],
            "one_line": "무난",
        }
        report = judge.render_report([("t1", verdict)], "20260717-000000")
        self.assertIn("t1 — overall 3/5", report)
        self.assertIn("continuity 4", report)
        self.assertIn("[turn 2] register", report)
        self.assertIn("잔향 회랑", report)


if __name__ == "__main__":
    unittest.main()
