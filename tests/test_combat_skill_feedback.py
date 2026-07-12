"""Source-level locks for the 2026-07-12 combat feedback batch.

Owner findings from live play on the 00052 deploy:
- 자기 견인/밀기 "발동이 됐는지도 모르겠다" → forced movement renders as a YANK
  (accelerating snatch + drag trail + arrival crunch), driven by the engine's
  ``forced``/``from`` log metadata.
- 스턴이 보드에서 안 보임 → stunned units get a 💫 pill + dashed halo.
- 신규 AoE 스킬(펄스 폭발)은 blast-wave ring으로 범위가 읽혀야 한다.
"""

from __future__ import annotations

import sys
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


class ShotForecastTest(unittest.TestCase):
    """Two-tier slice 2: deterministic shot preview on target chips."""

    def test_targets_payload_carries_hit_chance_and_damage_range(self) -> None:
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _drone, _player

        from mythos_combat import CombatEngine

        engine = CombatEngine()
        state = engine.start(
            [_player(x=0, y=0)], [_drone(x=1, y=0, hp=30, defense=11)],
            seed="forecast", arena=(8, 6),
        )
        actions = engine.available_actions(state)
        target = actions["targets"][0]
        self.assertIn("hit_chance", target)
        self.assertGreaterEqual(target["hit_chance"], 5)  # crit floor: never 0
        self.assertLessEqual(target["hit_chance"], 100)
        self.assertGreaterEqual(target["damage_max"], target["damage_min"])
        self.assertGreaterEqual(target["damage_min"], 1)
        # vibro_blade 2d6 + str(8)//2 = 6..16, no armor on the drone.
        self.assertEqual((target["damage_min"], target["damage_max"]), (6, 16))

    def test_forecast_reflects_ranged_cover(self) -> None:
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _drone, _player

        from mythos_combat import CombatEngine

        engine = CombatEngine()
        state = engine.start(
            [_player(x=0, y=0, weapon="rivet_gun")], [_drone(x=3, y=0, hp=30, defense=11)],
            seed="forecast-cover", arena=(8, 6),
        )
        enemy = state.living_enemies()[0]
        player = state.player()
        assert player is not None
        open_preview = engine._attack_preview(state, player, enemy)
        state.covers[f"{enemy.x},{enemy.y}"] = "full"
        covered_preview = engine._attack_preview(state, player, enemy)
        self.assertEqual(covered_preview["cover_bonus"], 6)
        self.assertLess(covered_preview["hit_chance"], open_preview["hit_chance"])


class IntentLensTest(unittest.TestCase):
    """Two-tier slice 3: pointing at an enemy spotlights ITS telegraph."""

    def test_canvas_spotlights_focused_enemy_intent(self) -> None:
        source = read("src/mythos_ui/src/combatCanvas.ts")
        self.assertIn("focusedEnemyId", source)
        self.assertIn("dimmed", source)

    def test_inspector_shows_enemy_own_next_action(self) -> None:
        source = read("src/mythos_ui/src/StoryPanel.tsx")
        self.assertIn("ownIntent", source)
        self.assertIn("i.enemy_id === occupant.id", source)


class CombatResponsivenessTest(unittest.TestCase):
    """Regression locks for the 2026-07-12 responsiveness diagnosis.

    Measured: one click serialized 4-6 full-screen cinemas -> 7-10.5s forced
    watching (owner: "제멋대로 진행"). Fix: cinema only for the commanded
    unit's blow / kill blows (measured p50 3.6s), plus tap-to-skip.
    """

    def test_cinema_reserved_for_commanded_blows_and_defeats(self) -> None:
        source = read("src/mythos_ui/src/hooks/useCombatCinemaQueue.ts")
        self.assertIn("deservesCinema", source)
        self.assertIn('if (entry.action === "defeat") return true;', source)
        self.assertIn("prev.radar?.current", source)

    def test_tap_to_skip_flushes_the_queue(self) -> None:
        queue = read("src/mythos_ui/src/hooks/useCombatCinemaQueue.ts")
        self.assertIn("flushCinema", queue)
        cinema = read("src/mythos_ui/src/CombatCinema.tsx")
        self.assertIn("onPointerDown={onSkip}", cinema)
        self.assertIn("cinema-skip-hint", cinema)


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
