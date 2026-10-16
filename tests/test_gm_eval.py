"""scripts/dev/gm_eval.py: the frozen case set builds through the production prompt builders and cleaners, and the
scoring / regression check is deterministic (a fake model, no network)."""

from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from pathlib import Path
from typing import Any

SPEC = importlib.util.spec_from_file_location(
    "gm_eval", Path(__file__).resolve().parents[1] / "scripts" / "dev" / "gm_eval.py"
)
assert SPEC and SPEC.loader
ev = importlib.util.module_from_spec(SPEC)
sys.modules["gm_eval"] = ev  # dataclasses look their module up by name
SPEC.loader.exec_module(ev)


class ScriptedLLM:
    """Answers per route: a plausible line for narration / talk and a valid verdict for improvise."""

    name = "scripted"

    def complete(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int,
        temperature: float,
        timeout: float,
        json_schema: dict[str, Any] | None = None,
    ) -> str:
        if json_schema is not None:
            return json.dumps(
                {
                    "stat": "int",
                    "dc": 5,
                    "reward": "trace_down",
                    "risk": "trace",
                    "success": {"ko": "경보가 꺼진다.", "en": "The alarm dies."},
                    "failure": {"ko": "경보가 울린다.", "en": "The alarm wails."},
                }
            )
        if "IX" in system:
            return (
                "접속자님의 진입을 기록했습니다. 결론은 바뀌지 않습니다."
                if "한국어" in system
                else "Your entry is logged. The verdict stands."
            )
        if "English" in system:
            return "The air is wet and the light is red. Somewhere, boots."
        return "젖은 공기 속으로 붉은 비상등이 번진다. 어딘가에서 군화 소리가 난다."


class GmEvalTest(unittest.TestCase):
    def test_case_set_covers_every_route_and_both_languages(self) -> None:
        cases = ev.cases()
        ids = [c.id for c in cases]
        self.assertEqual(len(ids), len(set(ids)))
        routes = {c.route.split(":")[0] for c in cases}
        self.assertEqual(routes, {"narrate", "talk", "improvise"})
        self.assertTrue({"talk:companion", "talk:ix", "talk:enemy"} <= {c.route for c in cases})
        self.assertEqual({c.lang for c in cases}, {"ko", "en"})
        dejavu = next(c for c in cases if c.id == "event_open_dejavu_ko")
        self.assertIn("데자뷔", dejavu.system)

    def test_scoring_and_regressions_are_deterministic(self) -> None:
        results = ev.run(ScriptedLLM(), ev.cases(), reps=2)
        summary = ev.summarize(results)
        self.assertEqual(summary["errors"], 0)
        self.assertGreater(summary["usable"], 0.5)
        # Every rep returned the same text: the second one counts as a repeat.
        some = next(row for row in summary["cases"].values() if row["usable"] == 1)
        self.assertEqual(some["repeats"], 0.5)
        base = {**json.loads(json.dumps(summary)), "p95": 1.0}
        worse = {**json.loads(json.dumps(summary)), "p95": 2.0}
        worse["cases"]["boss_ko"]["usable"] = 0.0
        found = ev.regressions(worse, base)
        self.assertTrue(any(line.startswith("boss_ko") for line in found), found)
        self.assertTrue(any(line.startswith("p95") for line in found), found)
        self.assertEqual(ev.regressions(summary, summary), [])


if __name__ == "__main__":
    unittest.main()
