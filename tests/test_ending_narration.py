"""Ending-screen narration cause (live-QA #2, 2026-06-19).

The ENDED screen used to show a bare mechanical line ("관리망 추적도가 98까지…").
Live QA: the player couldn't tell *why* the journey ended. Backend now stores a
player-facing ``ending_narration`` — the scenario's authored ending narration
when an ending resolves, else a story-framed cause for a threshold archive — and
the end panel renders that instead of the number. These lock that contract.
"""

import unittest
from dataclasses import replace
from datetime import UTC, datetime

from mythos_core import LoopPhase, LoopState
from mythos_narrative.director import _fallback_loop_summary
from mythos_runtime.scenario import load_scenario
from mythos_runtime.session import RuntimeSessionService, _loop_language


def _loop(stability: int = 50, tension: int = 50) -> LoopState:
    return LoopState(
        loop_id="loop_end",
        player_id="player_end",
        seed="seed",
        phase=LoopPhase.ARCHIVE,
        location_id="loc",
        stability=stability,
        tension=tension,
        started_at=datetime(2026, 6, 19, tzinfo=UTC),
    )


class EndingNarrationTest(unittest.TestCase):
    def setUp(self) -> None:
        # _ending_narration_text uses only load_scenario + the loop, no instance
        # state, so a bare (uninitialised) service exercises the pure logic.
        self.svc = RuntimeSessionService.__new__(RuntimeSessionService)

    def test_authored_ending_narration_used(self) -> None:
        scenario = load_scenario("neo-seoul")
        expected = next(
            str(e.get("narration")).strip()
            for e in scenario.endings
            if isinstance(e, dict) and e.get("id") == "ending_erasure"
        )
        text = self.svc._ending_narration_text("neo-seoul", "ending_erasure", _loop())
        self.assertEqual(text, expected)
        self.assertTrue(text)

    def test_tension_threshold_is_narrative_not_a_number(self) -> None:
        text = self.svc._ending_narration_text("neo-seoul", None, _loop(tension=95))
        self.assertTrue(text)
        self.assertIn("추적", text)
        # the whole point of #2: no bare mechanical number leaks into the cause
        self.assertNotRegex(text, r"\d")

    def test_stability_threshold_is_narrative(self) -> None:
        text = self.svc._ending_narration_text("neo-seoul", None, _loop(stability=5))
        self.assertTrue(text)
        self.assertIn("신호", text)
        self.assertNotRegex(text, r"\d")

    def test_no_ending_no_threshold_is_empty(self) -> None:
        # mid-range archive with no resolved ending → frontend keeps its own
        # generic fallback (we don't fabricate a cause).
        self.assertEqual(self.svc._ending_narration_text("neo-seoul", None, _loop()), "")

    def test_unknown_ending_id_falls_back_to_threshold(self) -> None:
        text = self.svc._ending_narration_text("neo-seoul", "ending_does_not_exist", _loop(tension=99))
        self.assertIn("추적", text)


class LoopSummaryLanguageTest(unittest.TestCase):
    """The archived run's ``summary_text`` sat outside the localization contract:
    the deterministic path was Korean-only and the LLM prompt hard-coded "Write the
    summary in Korean", so an EN loop archived a Korean summary that also exposed a
    raw state token (live 2026-08-08: "루프는 'combat_finished'의 잔향을…" on an EN
    Forced Erasure, while ``ending_narration`` was correct English). The fast path
    is what a combat defeat takes, so it is the one players actually hit."""

    def test_en_summary_has_no_hangul(self) -> None:
        import re

        text = _fallback_loop_summary([{"action": "Slip into the drainage pipe"}], "en")
        self.assertIsNone(re.search(r"[가-힣]", text), text)

    def test_internal_state_token_never_reaches_summary(self) -> None:
        for language in ("en", "ko"):
            text = _fallback_loop_summary([{"action": "combat_finished"}], language)
            self.assertNotIn("combat_finished", text)
            self.assertNotIn("_", text)

    def test_prose_action_is_still_quoted(self) -> None:
        action = "Have Han trigger his EMP blaster"
        self.assertIn(action, _fallback_loop_summary([{"action": action}], "en"))

    def test_ko_remains_the_default(self) -> None:
        text = _fallback_loop_summary([{"action": "배수로로 숨는다"}])
        self.assertIn("루프는", text)

    def test_loop_language_reads_persisted_state(self) -> None:
        self.assertEqual(_loop_language(_loop()), "ko")
        en_loop = replace(_loop(), state={"language": "en"})
        self.assertEqual(_loop_language(en_loop), "en")
        # An unknown/legacy value must not become a third language.
        self.assertEqual(_loop_language(replace(_loop(), state={"language": "fr"})), "ko")


if __name__ == "__main__":
    unittest.main()
