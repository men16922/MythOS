"""Locks for the narrative eval harness (scripts/eval/) — golden bank + LLM-judge.

Pure-function coverage only: transcript validation, judge-prompt assembly, verdict
parsing, report rendering. No CLI/model invocation (that path is manual via
`make eval-narrative`). Background: docs/reference/2026-07-17-anthropic-openai-
agent-stacks.md §3-1 (trace→eval gap).
"""

from __future__ import annotations

import importlib.util
import json
import os
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]

_spec = importlib.util.spec_from_file_location(
    "narrative_judge", ROOT / "scripts" / "eval" / "narrative_judge.py"
)
assert _spec is not None and _spec.loader is not None
judge = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(judge)

_bank_spec = importlib.util.spec_from_file_location(
    "bank_loop", ROOT / "scripts" / "eval" / "bank_loop.py"
)
assert _bank_spec is not None and _bank_spec.loader is not None
bank_loop = importlib.util.module_from_spec(_bank_spec)
_bank_spec.loader.exec_module(bank_loop)


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


class BankLanguageTest(unittest.TestCase):
    def test_stored_language_is_used(self) -> None:
        self.assertEqual(bank_loop.resolve_language({"language": "ko"}, None), "ko")

    def test_explicit_language_overrides_missing_legacy_state(self) -> None:
        self.assertEqual(bank_loop.resolve_language({}, "en"), "en")

    def test_missing_legacy_language_fails_closed(self) -> None:
        with self.assertRaisesRegex(ValueError, "pass --language"):
            bank_loop.resolve_language({}, None)


class SplitPolicyTest(unittest.TestCase):
    def test_frozen_development_and_promotion_lanes_are_disjoint(self) -> None:
        development = judge.load_split_paths("development")
        promotion = judge.load_split_paths("promotion")
        self.assertEqual(
            {path.name for path in development},
            {"local-evidence-safety.json", "local-people-help.json"},
        )
        self.assertEqual(
            {path.name for path in promotion},
            {
                "prod-evidence-safety-20260728.json",
                "prod-people-help-20260728.json",
                # Admitted 2026-08-13 (DECISIONS): the 22+25 two-build arm. This set
                # is pinned so growing the frozen bank stays a deliberate act — a
                # sample that appears here without an owner ruling is a mistake.
                "prod-people-help-20260808.json",
            },
        )
        self.assertTrue(set(development).isdisjoint(promotion))
        self.assertNotIn("sample-fallback-ko.json", {path.name for path in development})

    def test_promotion_requires_explicit_mode_and_metrics(self) -> None:
        with self.assertRaises(SystemExit):
            judge.main(["golden/prod-people-help-20260728.json"])
        with self.assertRaises(SystemExit):
            judge.main(["--promotion"])

    def test_promotion_metrics_must_cover_every_frozen_sample(self) -> None:
        path = ROOT / "scripts" / "eval" / "_tmp_metrics.json"
        path.write_text(
            json.dumps(
                {
                    "samples": {
                        "prod-evidence-safety-20260728": {
                            "cost_per_loop_usd": 1.0,
                            "repetition_compliance": "fail",
                            "length_compliance": "pass",
                        }
                    }
                }
            ),
            encoding="utf-8",
        )
        try:
            with self.assertRaisesRegex(ValueError, "exactly match"):
                judge.load_promotion_metrics(
                    path,
                    {
                        "prod-evidence-safety-20260728",
                        "prod-people-help-20260728",
                    },
                )
        finally:
            path.unlink()


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

    def test_promotion_report_pairs_scores_with_companion_metrics(self) -> None:
        verdict = {
            "scores": {"repetition": 2},
            "overall": 3,
            "issues": [],
            "one_line": "반복 있음",
        }
        metrics = {
            "samples": {
                "t1": {
                    "cost_per_loop_usd": 1.125,
                    "repetition_compliance": "fail",
                    "length_compliance": "pass",
                    "note": "measured production sample",
                }
            }
        }
        report = judge.render_report([("t1", verdict)], "20260729-000000", metrics)
        self.assertIn("Promotion companion metrics", report)
        self.assertIn("cost/loop $1.1250", report)
        self.assertIn("repetition fail · length pass", report)


class JudgeProvenanceTest(unittest.TestCase):
    """Score drift must be attributable to an engine or a rubric edit.

    Two hash-frozen transcripts scored 2/5 on 2026-08-13 where they scored 3/5 in
    July, and nothing in either run recorded what did the scoring.
    """

    def test_prompt_is_excluded_from_the_recorded_command(self) -> None:
        # The default form puts the prompt at index 2 and the override form puts
        # it last, so dropping the tail records the wrong argv for the default.
        with mock.patch.dict(os.environ, {"EVAL_JUDGE_CMD": ""}, clear=False):
            command = judge.judge_provenance()["command"]
        self.assertEqual(command, ["claude", "-p", "--permission-mode", "plan"])

    def test_override_command_is_recorded_and_flagged(self) -> None:
        with mock.patch.dict(os.environ, {"EVAL_JUDGE_CMD": "my-judge --json"}, clear=False):
            provenance = judge.judge_provenance()
        self.assertEqual(provenance["command"], ["my-judge", "--json"])
        self.assertTrue(provenance["judge_cmd_override"])

    def test_rubric_hash_is_recorded_so_a_rubric_edit_is_attributable(self) -> None:
        # The rubric is injected into the judge prompt verbatim, so editing it
        # moves scores exactly like swapping the engine does.
        provenance = judge.judge_provenance()
        self.assertEqual(provenance["rubric_sha256"], judge._sha256(judge.RUBRIC_PATH))

    def test_report_states_the_judge_and_rubric_up_front(self) -> None:
        report = judge.render_report(
            [("t1", {"scores": {"a": 3}, "overall": 3})],
            "20260814-000000",
            None,
            {
                "command": ["claude", "-p"],
                "judge_version": "2.1.231 (Claude Code)",
                "rubric_sha256": "abc123",
            },
        )
        header = report.split("## t1")[0]
        self.assertIn("Judge: `claude -p`", header)
        self.assertIn("2.1.231 (Claude Code)", header)
        self.assertIn("abc123", header)


if __name__ == "__main__":
    unittest.main()
