"""Source-level locks for the 2026-07-12 combat feedback batch.

Owner findings from live play on the 00052 deploy:
- 자기 견인/밀기 "발동이 됐는지도 모르겠다" → forced movement renders as a YANK
  (accelerating snatch + drag trail + arrival crunch), driven by the engine's
  ``forced``/``from`` log metadata.
- 스턴이 보드에서 안 보임 → stunned units get a 💫 pill + dashed halo.
- 신규 AoE 스킬(펄스 폭발)은 blast-wave ring으로 범위가 읽혀야 한다.
"""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class YankVfxTest(unittest.TestCase):
    def test_engine_marks_forced_moves_with_metadata(self) -> None:
        source = read("src/mythos_combat/engine.py")
        self.assertIn('"forced": mode', source)
        self.assertIn('"from": from_xy', source)
        self.assertIn("skill_no_budge", source)

    def test_animator_styles_forced_moves_as_yanks(self) -> None:
        source = read("src/mythos_ui/src/combatEffects.ts")
        self.assertIn("YANK_DUR", source)
        self.assertIn("yanks.has(ev.id)", source)
        # Snatch accelerates (easeIn) while ordinary walks decelerate (easeOut).
        self.assertIn("easeIn(clamp01(local))", source)
        # Arrival crunch + board thump.
        self.assertIn("YANK_IMPACT", source)


class StunLegibilityTest(unittest.TestCase):
    def test_canvas_badges_stunned_units(self) -> None:
        source = read("src/mythos_ui/src/combatCanvas.ts")
        self.assertIn('b.status?.includes("stunned")', source)
        self.assertIn("💫", source)


class AoeAndPushSkillTest(unittest.TestCase):
    def test_overload_strike_is_the_melee_splash_skill(self) -> None:
        import json

        combat = json.loads(read("resources/neo-seoul/scenario.json"))["combat"]
        strike = combat["skills"]["overload_strike"]
        self.assertEqual(strike["effect"].get("aoe_radius"), 1)
        self.assertNotIn("push", strike["effect"])  # push moved to 자기 반발
        self.assertIn("aoe", strike["tags"])

    def test_magnetic_repulse_is_the_dedicated_push_skill(self) -> None:
        import json

        combat = json.loads(read("resources/neo-seoul/scenario.json"))["combat"]
        repulse = combat["skills"]["magnetic_repulse"]
        self.assertEqual(repulse["effect"].get("push"), 2)
        self.assertEqual(repulse["effect"].get("displace_damage"), "1d4")
        self.assertTrue((ROOT / "resources/neo-seoul/skills/magnetic_repulse.png").exists())

    def test_aoe_blast_ring_in_skill_fx(self) -> None:
        source = read("src/mythos_ui/src/combatAnim.ts")
        self.assertIn('tags.includes("aoe") && p > 0.35', source)


class XcomGroundTargetingTest(unittest.TestCase):
    def test_emp_grenade_defines_range_and_radius(self) -> None:
        import json

        combat = json.loads(read("resources/neo-seoul/scenario.json"))["combat"]
        emp = combat["items"]["emp_grenade"]
        self.assertEqual(emp.get("radius"), 1)
        self.assertGreaterEqual(int(emp.get("range", 0)), 3)

    def test_player_action_carries_target_cell_end_to_end(self) -> None:
        # engine dataclass + WS deserializer + frontend action type all speak
        # `target_cell`, so the XCOM throw survives the full round trip.
        self.assertIn("target_cell: tuple[int, int] | None = None", read("src/mythos_combat/engine.py"))
        self.assertIn('data.get("target_cell")', read("src/mythos_runtime/combat_server.py"))
        self.assertIn("target_cell?: [number, number]", read("src/mythos_ui/src/types.ts"))

    def test_board_hook_arms_and_throws(self) -> None:
        source = read("src/mythos_ui/src/hooks/useCombatBoard.ts")
        self.assertIn("startItemTargeting", source)
        self.assertIn("blastPreview", source)
        self.assertIn('target_cell: [cx, cy]', source)


if __name__ == "__main__":
    unittest.main()
