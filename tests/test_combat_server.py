from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dataclasses import replace

from test_session_combat import _InMemoryStore, _seed_loop

from mythos_core.models import LoopPhase
from mythos_runtime.combat_server import (
    _snapshot_response,
    combat_action_response,
    combat_state_response,
)
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.session import RuntimeSessionService


class CombatServerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.service = RuntimeSessionService(self.store, director=None)
        self.loop_id = _seed_loop(self.store, "p1", "비접속자 (Ghost)")
        self.service.start_combat(self.loop_id, "patrol_ambush", RuntimeOptions(fallback=True))

    def test_state_response_returns_active_combat_payload(self) -> None:
        response = combat_state_response(self.service, self.loop_id, "neo-seoul")

        self.assertTrue(response["ok"])
        self.assertEqual(response["loop_id"], self.loop_id)
        self.assertFalse(response["combat"]["finished"])
        self.assertIn("radar", response["combat"])
        self.assertIn("available", response["combat"])
        self.assertIsInstance(response["inventory"], dict)

    def test_action_response_applies_skill_and_returns_state(self) -> None:
        before = combat_state_response(self.service, self.loop_id, "neo-seoul")
        before_focus = int(before["combat"]["available"]["focus"])

        response = combat_action_response(
            self.service,
            self.loop_id,
            "neo-seoul",
            {"type": "skill", "skill_id": "packet_shot"},
        )

        self.assertTrue(response["ok"])
        self.assertIn("combat", response)
        self.assertIn("prose", response)
        if not response["combat"]["finished"]:
            after_focus = int(response["combat"]["available"]["focus"])
            self.assertLessEqual(after_focus, before_focus)

    def test_response_carries_ending_when_combat_ended_the_run(self) -> None:
        # A run-ending combat (boss climax, permadeath) resolves the ending
        # mid-combat and `resume` refuses ended loops, so the action response is
        # the SPA's only source for the ENDED screen — without the ending block
        # the client keeps its stale pre-combat phase and the ending art is
        # never shown (live 2026-07-04: IX defeat exited straight to main).
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        self.store.save_loop(
            replace(
                loop,
                phase=LoopPhase.ENDED,
                state={
                    **loop.state,
                    "ending_id": "ending_erasure",
                    "ending_label": "강제 최적화 (Forced Erasure)",
                    "ending_image": "endings/forced-erasure.png",
                    "ending_narration": "모든 것이 하얗게 비워집니다.",
                },
            )
        )

        response = _snapshot_response(
            self.service, self.loop_id, "neo-seoul", {"finished": True}, ""
        )

        self.assertEqual(response["loop_phase"], "ended")
        self.assertEqual(response["ending"]["ending_id"], "ending_erasure")
        self.assertEqual(response["ending"]["ending_image"], "endings/forced-erasure.png")
        self.assertTrue(response["ending"]["ending_narration"])

    def test_response_has_no_ending_while_loop_is_live(self) -> None:
        response = combat_state_response(self.service, self.loop_id, "neo-seoul")
        self.assertNotEqual(response["loop_phase"], "ended")
        self.assertNotIn("ending", response)

    def test_action_response_maps_move_coordinates(self) -> None:
        state = combat_state_response(self.service, self.loop_id, "neo-seoul")
        reachable = state["combat"]["available"]["reachable"]
        self.assertTrue(reachable)
        x, y = reachable[0]

        response = combat_action_response(
            self.service,
            self.loop_id,
            "neo-seoul",
            {"type": "wait", "x": x, "y": y},
        )

        self.assertTrue(response["ok"])
        player = next(
            blip for blip in response["combat"]["radar"]["blips"] if blip["faction"] == "player"
        )
        self.assertEqual((player["x"], player["y"]), (x, y))


if __name__ == "__main__":
    unittest.main()
