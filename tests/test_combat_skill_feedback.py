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


class StatusLegibilityTest(unittest.TestCase):
    def test_canvas_badges_stunned_and_status_units(self) -> None:
        source = read("src/mythos_ui/src/combatCanvas.ts")
        self.assertIn("STATUS_BADGES", source)
        self.assertIn("💫", source)
        self.assertIn("🔥", source)
        self.assertIn("🧪", source)
        self.assertIn('activeBadges.includes("stunned")', source)


class StatusEffectEngineTest(unittest.TestCase):
    """Slice 1 of docs/plans/2026-07-12-status-effects-design.md: burn/corrode."""

    def _fixture(self):
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _drone, _player

        from mythos_combat import CombatEngine

        engine = CombatEngine()
        state = engine.start(
            [_player(x=0, y=0)], [_drone(x=5, y=0, hp=30, defense=11, speed=0, armor=3)],
            seed="status-fx", arena=(8, 6),
        )
        player = state.player()
        foe = state.living_enemies()[0]
        assert player is not None
        return engine, state, player, foe

    def test_burn_ticks_at_turn_start_and_expires(self) -> None:
        engine, state, player, foe = self._fixture()
        engine._apply_status_effect(state, player, foe, "burn", 2)
        self.assertIn("burn", foe.status)
        hp0 = foe.hp
        engine._tick_status_effects(state, foe)
        self.assertLess(foe.hp, hp0)
        self.assertEqual(foe.status_effects["burn"], 1)
        engine._tick_status_effects(state, foe)
        self.assertNotIn("burn", foe.status_effects)
        self.assertNotIn("burn", foe.status)
        self.assertTrue(any(e.detail.get("expired") for e in state.log))

    def test_corrode_reduces_effective_armor(self) -> None:
        engine, state, player, foe = self._fixture()
        self.assertEqual(engine._effective_armor(foe), 3)
        engine._apply_status_effect(state, player, foe, "corrode", 2)
        self.assertEqual(engine._effective_armor(foe), 1)

    def test_unknown_status_id_is_rejected(self) -> None:
        engine, state, player, foe = self._fixture()
        engine._apply_status_effect(state, player, foe, "poison", 2)
        self.assertEqual(foe.status_effects, {})

    def test_skill_applies_rider_lands_status_on_hit(self) -> None:
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _drone, _skilled_player

        from mythos_combat import CombatEngine, PlayerAction

        engine = CombatEngine()
        engine.skills_pool["heat_lash"] = {
            "id": "heat_lash", "name": "과열 채찍", "role": "damage",
            "range": 3, "cooldown": 0, "cost": {},
            "effect": {"damage": "1d6", "applies": {"burn": 2}},
        }
        state = engine.start(
            [_skilled_player(x=0, y=0)], [_drone(x=2, y=0, hp=40, defense=1, speed=0)],
            seed="applies", arena=(8, 6),
        )
        player = state.player()
        assert player is not None
        foe = state.living_enemies()[0]
        engine._player_skill(
            state, player,
            PlayerAction(type="skill", skill_id="heat_lash", target_id=foe.id),
            engine.skills_pool["heat_lash"], True,
        )
        self.assertIn("burn", foe.status_effects)

    def test_status_effects_survive_serialization(self) -> None:
        from mythos_combat import combat_state_from_dict, combat_state_to_dict

        engine, state, player, foe = self._fixture()
        engine._apply_status_effect(state, player, foe, "burn", 2)
        restored = combat_state_from_dict(combat_state_to_dict(state))
        rfoe = restored.by_id(foe.id)
        assert rfoe is not None
        self.assertEqual(rfoe.status_effects, {"burn": 2})


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


class LiveQaFixesTest(unittest.TestCase):
    """2026-07-12 owner live-QA on 00053: five findings, one lock each."""

    def test_stun_chip_survives_the_consumed_turn(self) -> None:
        # 기절 배지가 보드에 안 보임: applied+consumed in one transition left
        # no snapshot with the chip — _consume_stun keeps it, upkeep clears it.
        source = read("src/mythos_combat/engine.py")
        self.assertIn('if actor.stunned_turns <= 0 and "stunned" in actor.status:', source)

    def test_stun_result_line_is_not_a_second_skill_log(self) -> None:
        # 시스템 해킹 컷인 2회: stun_applied logged as action "skill" made the
        # orphan-skill cinema fire twice; it is a result line -> "info", and the
        # client additionally dedupes orphan cinemas per actor.
        engine_src = read("src/mythos_combat/engine.py")
        self.assertNotIn('"skill",\n            clog(\n                state.language,\n                "stun_applied"', engine_src)
        queue_src = read("src/mythos_ui/src/hooks/useCombatCinemaQueue.ts")
        self.assertIn("orphanCinemaActors", queue_src)

    def test_board_supports_click_to_move_and_body_grab(self) -> None:
        # 드래그로 안 옮겨짐 + 튜토리얼 1→2 막힘: exact-cell grab only, and the
        # tutorial copy promised click-to-move that didn't exist.
        source = read("src/mythos_ui/src/hooks/useCombatBoard.ts")
        self.assertIn("reachable.some(([rx, ry]", source)
        self.assertIn('onCombatAction({ type: "wait", x: cx, y: cy })', source)
        self.assertIn("cfg.stepY * 6", source)  # sprite-body grab tolerance

    def test_combat_images_preload_on_combat_start(self) -> None:
        # 공격 이미지가 늦게 뜸: warm portrait + pose art once per combat.
        source = read("src/mythos_ui/src/hooks/useCombatCinemaQueue.ts")
        self.assertIn("preloadedCombatRef", source)
        self.assertIn("new Image()", source)

    def test_explicit_party_roster_is_exclusive(self) -> None:
        # 시뮬레이터에서 세린 미선택인데 항상 참전: story-flag allies must not
        # auto-join when the caller pinned the roster.
        from dataclasses import replace

        from mythos_core.clock import utc_now
        from mythos_core.models import LoopPhase, LoopState
        from mythos_runtime.combat_service import CombatService
        from mythos_runtime.scenario import load_scenario

        combat_pool = load_scenario("neo-seoul").combat
        loop = LoopState(
            loop_id="loop_t", player_id="p", seed="s",
            phase=LoopPhase.EXPLORE, location_id="start", stability=50, tension=50,
            started_at=utc_now(),
            state={
                "flags": ["met_se_rin", "ally_se_rin"],
                "_party": {"members": [], "exclusive": True},
            },
        )
        service = CombatService()
        allies = service._build_allies(loop, combat_pool)
        self.assertEqual(allies, [])  # flag-unlocked se_rin held out
        loop_inclusive = replace(
            loop, state={"flags": ["met_se_rin", "ally_se_rin"], "_party": {"members": []}}
        )
        allies2 = service._build_allies(loop_inclusive, combat_pool)
        self.assertTrue(any(a.id == "se_rin" for a in allies2))  # default path unchanged


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


class AimedSkillTargetingTest(unittest.TestCase):
    """Two-tier slice 1-ext: 🎯 board pick + outcome preview for skills."""

    def test_board_hook_supports_skill_targeting_with_preview(self) -> None:
        source = read("src/mythos_ui/src/hooks/useCombatBoard.ts")
        self.assertIn("GroundTargeting", source)
        self.assertIn("startSkillTargeting", source)
        self.assertIn("displaceDest", source)  # push/pull destination preview
        self.assertIn('onCombatAction({ type: "skill", skill_id: tg.id, target_id: victim.id })', source)

    def test_controls_render_aim_toggle_for_positional_skills(self) -> None:
        source = read("src/mythos_ui/src/CombatControls.tsx")
        self.assertIn("cc-skill-aim", source)
        self.assertIn("effect.aoe_radius != null", source)
        # Casual flow preserved: the main button still auto-targets.
        self.assertIn("defaultTargetId) || undefined", source)


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
        self.assertIn("targetingPreview", source)
        self.assertIn('target_cell: [cx, cy]', source)


if __name__ == "__main__":
    unittest.main()
