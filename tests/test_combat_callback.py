"""Post-combat narrative callback (live-QA #5, 2026-06-19).

Combat used to cut to/from the tactical board with the next scene never
referencing the fight ("전투 장면과 다른 장면이 매끄럽지 않다"). The scene right
after combat now gets a full-render directive to open with the aftermath. These
lock when that directive fires and what it carries.
"""

import unittest
from datetime import UTC, datetime
from typing import Any

from mythos_core import LoopPhase, LoopState
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import _combat_callback_note


def _loop(state: dict[str, Any]) -> LoopState:
    return LoopState(
        loop_id="loop_cb",
        player_id="player_cb",
        seed="seed",
        phase=LoopPhase.EXPLORE,
        location_id="loc",
        stability=60,
        tension=40,
        started_at=datetime(2026, 6, 19, tzinfo=UTC),
        state=state,
    )


class CombatCallbackTest(unittest.TestCase):
    scenario = load_scenario("neo-seoul")

    def test_fires_on_scene_immediately_after_combat(self) -> None:
        loop = _loop(
            {
                "_last_combat_turn": 4,
                "_last_combat_result": "player_victory",
                "_last_combat_encounter": "patrol_ambush",
            }
        )
        note = _combat_callback_note(self.scenario, loop, turn_index=5)
        self.assertTrue(note)
        self.assertIn("직전 전투 콜백", note)
        self.assertIn("순찰 매복", note)  # encounter name resolved from scenario
        self.assertIn("물리쳤다", note)  # victory verb

    def test_silent_when_not_the_next_scene(self) -> None:
        loop = _loop({"_last_combat_turn": 4, "_last_combat_result": "player_victory"})
        self.assertEqual(_combat_callback_note(self.scenario, loop, turn_index=7), "")

    def test_silent_without_combat_marker(self) -> None:
        self.assertEqual(_combat_callback_note(self.scenario, _loop({}), turn_index=5), "")

    def test_defeat_verb_differs(self) -> None:
        loop = _loop(
            {
                "_last_combat_turn": 4,
                "_last_combat_result": "player_defeat",
                "_last_combat_encounter": "patrol_ambush",
            }
        )
        note = _combat_callback_note(self.scenario, loop, turn_index=5)
        self.assertIn("쫓기는 처지", note)


if __name__ == "__main__":
    unittest.main()
