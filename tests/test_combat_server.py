from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from test_session_combat import _InMemoryStore, _seed_loop

from mythos_runtime.combat_server import combat_action_response, combat_state_response
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
