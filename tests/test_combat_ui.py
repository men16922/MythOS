from __future__ import annotations

import unittest

from mythos_combat import CombatEngine, render_radar
from mythos_combat.factory import build_enemy_combatant, build_player_combatant
from mythos_runtime.combat_ui import render_radar_html

WEAPONS = {
    "blade": {"id": "blade", "name": "단검", "kind": "melee", "damage": "2d6", "reach": 1},
    "claw": {"id": "claw", "name": "절단날", "kind": "melee", "damage": "1d4", "reach": 1},
}


def _radar():
    player = build_player_combatant(
        combatant_id="player",
        name="당신",
        stats={"strength": 8, "agility": 6},
        weapon_ids=["blade"],
        weapons_pool=WEAPONS,
        x=0,
        y=0,
    )
    drone = build_enemy_combatant(
        entry={"id": "drone", "name": "드론", "hp": 8, "weapons": ["claw"], "blip": "●"},
        weapons_pool=WEAPONS,
        x=3,
        y=2,
    )
    state = CombatEngine().start([player], [drone], seed="ui", arena=(8, 6))
    return render_radar(state)


class CombatUITest(unittest.TestCase):
    def test_radar_html_contains_grid_and_contacts(self) -> None:
        html = render_radar_html(_radar())
        self.assertIn("TACTICAL RADAR", html)
        self.assertIn("당신", html)
        self.assertIn("드론", html)
        self.assertIn("rdr-grid", html)
        # Enemy blips pulse (blink animation class present).
        self.assertIn("rdr-pulse", html)
        self.assertIn("rdr-hp", html)

    def test_radar_html_escapes_names(self) -> None:
        radar = {
            "round": 1,
            "arena": {"w": 4, "h": 3},
            "blips": [
                {
                    "id": "x",
                    "name": "<script>",
                    "faction": "enemy",
                    "glyph": "●",
                    "x": 1,
                    "y": 1,
                    "hp": 5,
                    "max_hp": 5,
                    "alive": True,
                }
            ],
        }
        html = render_radar_html(radar)
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;", html)

    def test_outcome_shown_when_present(self) -> None:
        radar = {"round": 3, "outcome": "player_victory", "arena": {"w": 4, "h": 3}, "blips": []}
        html = render_radar_html(radar)
        self.assertIn("OUTCOME", html)
        self.assertIn("player_victory", html)


if __name__ == "__main__":
    unittest.main()
