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

    def test_acid_lowers_effective_defense_with_floor(self) -> None:
        engine, state, player, foe = self._fixture()
        base_dc = foe.effective_defense
        engine._apply_status_effect(state, player, foe, "acid", 2)
        self.assertEqual(foe.effective_defense, max(1, base_dc - 2))

    def test_freeze_blocks_movement_but_not_actions(self) -> None:
        engine, state, player, foe = self._fixture()
        engine._apply_status_effect(state, player, foe, "freeze", 1)
        # AI movement helper refuses to step while frozen.
        fx, fy = foe.x, foe.y
        engine._move_to_band(state, foe, player, desired=1)
        self.assertEqual((foe.x, foe.y), (fx, fy))
        # Board affordance: no reachable tiles while frozen.
        self.assertEqual(engine._reachable_tiles(state, foe), [])
        # Player-side move_to is held with a ❄ log line.
        engine._apply_status_effect(state, player, player, "freeze", 1)
        self.assertTrue(engine._movement_frozen(state, player))
        self.assertTrue(any(e.detail.get("held") for e in state.log))

    def test_shock_freezes_focus_regen_and_cooldowns(self) -> None:
        engine, state, player, foe = self._fixture()
        foe.max_focus = 4
        foe.focus = 1
        foe.cooldowns["some_skill"] = 2
        engine._apply_status_effect(state, player, foe, "shock", 1)
        engine._tick_round_upkeep(state, foe)
        self.assertEqual(foe.focus, 1)  # no regen while shocked
        self.assertEqual(foe.cooldowns["some_skill"], 2)  # cooldown frozen
        self.assertNotIn("shock", foe.status_effects)  # 1T shock expired at tick
        engine._tick_round_upkeep(state, foe)
        self.assertEqual(foe.focus, 2)  # regen resumes
        self.assertEqual(foe.cooldowns["some_skill"], 1)

    def test_system_intrusion_hacks_enemy_to_attack_its_own(self) -> None:
        # 시스템 침투 (hack_control) was a PHANTOM effect — defined in content,
        # labeled in the UI, but with zero engine handling. It now seizes the
        # target's next turn: the hacked enemy attacks its nearest fellow enemy.
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _drone, _skilled_player

        from mythos_combat import CombatEngine, PlayerAction

        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)],
            [_drone("d1", x=2, y=0, hp=40, defense=1, speed=0),
             _drone("d2", x=3, y=0, hp=40, defense=1, speed=0)],
            seed="hacked", arena=(8, 6),
        )
        player = state.player()
        assert player is not None
        engine._player_skill(
            state, player,
            PlayerAction(type="skill", skill_id="system_intrusion", target_id="d1"),
            engine.skills_pool["system_intrusion"], True,
        )
        d1 = state.by_id("d1")
        d2 = state.by_id("d2")
        assert d1 is not None and d2 is not None
        self.assertIn("hacked", d1.status_effects)
        self.assertIn("hacked", d1.status)  # 🕹 badge visible
        engine._npc_turn(state, d1)
        self.assertNotIn("hacked", d1.status_effects)  # consumed by the betrayal turn
        self.assertTrue(any(e.detail.get("status") == "hacked" and e.detail.get("target") == "d2" for e in state.log))
        self.assertLess(d2.hp, 40)  # defense 1 → the betrayal blow lands
        # Chip clears at the unit's next upkeep, not silently mid-transition.
        engine._tick_round_upkeep(state, d1)
        self.assertNotIn("hacked", d1.status)

    def test_status_effects_survive_serialization(self) -> None:
        from mythos_combat import combat_state_from_dict, combat_state_to_dict

        engine, state, player, foe = self._fixture()
        engine._apply_status_effect(state, player, foe, "burn", 2)
        restored = combat_state_from_dict(combat_state_to_dict(state))
        rfoe = restored.by_id(foe.id)
        assert rfoe is not None
        self.assertEqual(rfoe.status_effects, {"burn": 2})


class BalanceTuning20260714Test(unittest.TestCase):
    """Owner verdicts from docs/plans/2026-07-14-combat-balance-tuning.md:
    B안 split caps (burn/stun 3, utility 6) + boss consecutive-stun resistance
    + cryo freeze 2."""

    def _fixture(self, **enemy_over):
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _drone, _player

        from mythos_combat import CombatEngine

        engine = CombatEngine()
        state = engine.start(
            [_player(x=0, y=0)],
            [_drone(x=5, y=0, hp=40, defense=11, speed=0, armor=0, **enemy_over)],
            seed="balance-0714", arena=(8, 6),
        )
        player = state.player()
        foe = state.living_enemies()[0]
        assert player is not None
        return engine, state, player, foe

    def test_burn_caps_at_hard_cc_cap_while_utility_keeps_six(self) -> None:
        from mythos_combat.engine import HARD_CC_TURNS_CAP, STATUS_EFFECT_TURNS_CAP

        engine, state, player, foe = self._fixture()
        for _ in range(4):
            engine._apply_status_effect(state, player, foe, "burn", 2)
            engine._apply_status_effect(state, player, foe, "corrode", 2)
        self.assertEqual(foe.status_effects["burn"], HARD_CC_TURNS_CAP)  # 3, not 6
        self.assertEqual(foe.status_effects["corrode"], STATUS_EFFECT_TURNS_CAP)

    def test_stun_accumulation_caps_at_hard_cc_cap(self) -> None:
        from mythos_combat.engine import HARD_CC_TURNS_CAP

        engine, state, player, foe = self._fixture()
        for _ in range(4):
            engine._apply_stun(state, player, foe, 2)
        self.assertEqual(foe.stunned_turns, HARD_CC_TURNS_CAP)

    def test_boss_resists_consecutive_stun_but_not_the_first(self) -> None:
        engine, state, player, boss = self._fixture(ai="boss")
        # First stun lands in full.
        engine._apply_stun(state, player, boss, 1)
        self.assertEqual(boss.stunned_turns, 1)
        # Boss loses its turn to the stun → guard arms.
        engine._npc_turn(state, boss)
        self.assertEqual(boss.stunned_turns, 0)
        self.assertTrue(boss.stun_guard)
        # Follow-up 1-turn stun is halved to 0 → fully resisted, logged.
        engine._apply_stun(state, player, boss, 1)
        self.assertEqual(boss.stunned_turns, 0)
        self.assertTrue(any(e.detail.get("stun_resisted") for e in state.log))
        # A multi-turn follow-up stun still lands at half strength.
        engine._apply_stun(state, player, boss, 2)
        self.assertEqual(boss.stunned_turns, 1)
        # After the boss completes a non-stunned turn, the guard clears and
        # a fresh stun lands in full again.
        engine._npc_turn(state, boss)  # consumes the remaining stun → guard stays
        self.assertTrue(boss.stun_guard)
        engine._npc_turn(state, boss)  # acts normally → guard clears
        self.assertFalse(boss.stun_guard)
        engine._apply_stun(state, player, boss, 1)
        self.assertEqual(boss.stunned_turns, 1)

    def test_non_boss_units_never_gain_stun_resistance(self) -> None:
        engine, state, player, foe = self._fixture()  # ai="melee"
        engine._apply_stun(state, player, foe, 1)
        engine._npc_turn(state, foe)
        self.assertFalse(foe.stun_guard)
        engine._apply_stun(state, player, foe, 1)
        self.assertEqual(foe.stunned_turns, 1)

    def test_cryo_grenade_freeze_rider_is_two_turns(self) -> None:
        import json

        combat = json.loads(read("resources/neo-seoul/scenario.json"))["combat"]
        self.assertEqual(combat["items"]["cryo_grenade"]["applies"], {"freeze": 2})
        # Incendiary stays the damage-rider grenade — unchanged by the verdict.
        self.assertEqual(combat["items"]["incendiary_grenade"]["applies"], {"burn": 2})


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


class StatusContentMappingTest(unittest.TestCase):
    """Status slice 3: who applies what (owner greenlight 2026-07-12)."""

    def test_enemy_weapons_carry_status_riders(self) -> None:
        import json

        combat = json.loads(read("resources/neo-seoul/scenario.json"))["combat"]
        weapons = combat["weapons"]
        self.assertEqual(weapons["plasma_torch"]["applies"], {"burn": 2})
        self.assertEqual(weapons["acid_spitter"]["applies"], {"acid": 2, "corrode": 2})
        self.assertEqual(weapons["shock_baton"]["applies"], {"shock": 1})
        self.assertEqual(combat["bestiary"]["purge_drone"]["weapons"], ["plasma_torch"])
        self.assertEqual(combat["bestiary"]["tracker_spider"]["weapons"], ["acid_spitter"])

    def test_weapon_hit_applies_status(self) -> None:
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _player

        from mythos_combat import CombatEngine, build_enemy_combatant

        torch_pool = {
            "plasma_torch": {
                "id": "plasma_torch", "name": "플라즈마 토치", "kind": "melee",
                "damage": "1d6", "reach": 1, "applies": {"burn": 2},
            }
        }
        enemy = build_enemy_combatant(
            entry={
                "id": "pd", "name": "소각기", "hp": 20, "defense": 10, "speed": 3,
                "stats": {"strength": 9, "agility": 5, "perception": 4},
                "weapons": ["plasma_torch"], "ai": "melee", "blip": "🔥",
            },
            weapons_pool=torch_pool, x=1, y=0,
        )
        engine = CombatEngine()
        state = engine.start([_player(x=0, y=0)], [enemy], seed="torch", arena=(8, 6))
        player = state.player()
        assert player is not None
        player.defense = 1  # guarantee the hit so the rider is deterministic
        # The opening auto-turn may already have landed a rider — reset so the
        # assertion isolates ONE explicit hit (durations accumulate since 07-12).
        player.status_effects.clear()
        player.status.clear()
        weapon = enemy.primary_weapon()
        assert weapon is not None
        engine._attack(state, enemy, player, weapon, engine._dice(state))
        self.assertEqual(player.status_effects.get("burn"), 2)

    def test_status_grenade_deals_blast_and_applies(self) -> None:
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _drone, _skilled_player

        from mythos_combat import CombatEngine, PlayerAction

        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)],
            [_drone("d1", x=3, y=0, hp=40, defense=1, speed=0),
             _drone("d2", x=4, y=1, hp=40, defense=1, speed=0)],
            seed="incendiary", arena=(8, 6),
        )
        player = state.player()
        assert player is not None
        item_def = {
            "id": "incendiary_grenade", "name": "소이 수류탄", "kind": "consumable",
            "effect": "status_grenade", "damage": "1d4", "applies": {"burn": 2},
            "range": 4, "radius": 1,
        }
        ok = engine._player_item(
            state, player,
            PlayerAction(type="item", item_id="incendiary_grenade", target_cell=(3, 1)),
            item_def, True,
        )
        self.assertTrue(ok)
        d1 = state.by_id("d1")
        d2 = state.by_id("d2")
        assert d1 is not None and d2 is not None
        for victim in (d1, d2):
            self.assertLess(victim.hp, 40)
            self.assertEqual(victim.status_effects.get("burn"), 2)

    def test_hacked_blow_marked_for_cinema(self) -> None:
        source = read("src/mythos_combat/engine.py")
        self.assertIn('entry.detail["hacked_blow"] = True', source)
        queue = read("src/mythos_ui/src/hooks/useCombatCinemaQueue.ts")
        self.assertIn("hacked_blow", queue)

    def test_board_fx_status_pops_and_icon_badges(self) -> None:
        fx = read("src/mythos_ui/src/combatEffects.ts")
        self.assertIn("statusPops", fx)
        self.assertIn("STATUS_POP_DUR", fx)
        canvas = read("src/mythos_ui/src/combatCanvas.ts")
        self.assertIn("/status/${sid}.png", canvas)  # icon-image badge convention
        self.assertIn("export const STATUS_BADGES", canvas)


class SkillCardCoverageTest(unittest.TestCase):
    """Every player/companion skill must have a cinema card (owner 2026-07-12
    "자기 견인/자기 반발 스킬카드가 안 뜸" — the registry only had 5 skills)."""

    def test_every_scenario_skill_has_cinema_metadata(self) -> None:
        import json
        import re

        combat = json.loads(read("resources/neo-seoul/scenario.json"))["combat"]
        skill_ids = set(combat.get("skills", {})) | set(combat.get("companion_skills", {}))
        registry_src = read("src/mythos_ui/src/hooks/useCombatCinema.ts")
        registry_ids = set(re.findall(r"^\s{2}(\w+):\s*\{", registry_src, re.MULTILINE))
        # Every combat skill id resolves to a card by exact id.
        self.assertTrue(
            skill_ids <= registry_ids,
            f"skills missing cinema cards: {skill_ids - registry_ids}",
        )

    def test_getskillid_prefers_exact_id(self) -> None:
        source = read("src/mythos_ui/src/hooks/useCombatCinema.ts")
        self.assertIn("if (SKILL_REGISTRY[n]) return n;", source)


class SkillDamageRiderTest(unittest.TestCase):
    """EMP-family and grenade damage (owner 2026-07-12 "EMP 펄스 등도 데미지가 없음")."""

    def _fx(self):
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import SKILLS, _drone, _skilled_player

        from mythos_combat import CombatEngine, PlayerAction

        return CombatEngine, PlayerAction, SKILLS, _drone, _skilled_player

    def test_emp_pulse_deals_shock_damage_and_aoe_stun(self) -> None:
        CombatEngine, PlayerAction, SKILLS, _drone, _skilled_player = self._fx()
        e = CombatEngine()
        s = e.start(
            [_skilled_player(0, 0)],
            [_drone("d1", 2, 0, hp=40, defense=1, speed=0),
             _drone("d2", 2, 1, hp=40, defense=1, speed=0)],
            seed="emp", arena=(8, 6),
        )
        p = s.player()
        assert p is not None
        e._player_skill(
            s, p, PlayerAction(type="skill", skill_id="emp_pulse", target_id="d1"),
            SKILLS["emp_pulse"], True,
        )
        d1, d2 = s.by_id("d1"), s.by_id("d2")
        assert d1 is not None and d2 is not None
        self.assertLess(d1.hp, 40)
        self.assertLess(d2.hp, 40)  # aoe splash zaps the neighbor too
        self.assertEqual(d1.stunned_turns, 1)

    def test_overload_splash_is_half_damage(self) -> None:
        CombatEngine, PlayerAction, SKILLS, _drone, _skilled_player = self._fx()
        e = CombatEngine()
        s = e.start(
            [_skilled_player(0, 0)],
            [_drone("d1", 1, 0, hp=60, defense=1, speed=0),
             _drone("d2", 1, 1, hp=60, defense=1, speed=0)],
            seed="ov", arena=(8, 6),
        )
        p = s.player()
        assert p is not None
        e._player_skill(
            s, p, PlayerAction(type="skill", skill_id="overload_strike", target_id="d1"),
            SKILLS["overload_strike"], True,
        )
        d1, d2 = s.by_id("d1"), s.by_id("d2")
        assert d1 is not None and d2 is not None
        primary = 60 - d1.hp
        splash = 60 - d2.hp
        self.assertGreater(primary, 0)
        self.assertLessEqual(splash, (primary + 1) // 2 + 1)  # splash ≈ half, floored


class SimulatorTestKitTest(unittest.TestCase):
    """Owner 2026-07-12: every changed combat feature must be exercisable in
    the simulator — a fresh sim loop hid tier-1 skills and had no grenades."""

    def test_begin_request_and_ui_send_test_kit(self) -> None:
        self.assertIn("test_kit: bool = False", read("src/mythos_api/app.py"))
        self.assertIn("test_kit=body.test_kit", read("src/mythos_api/app.py"))
        self.assertIn("test_kit: true", read("src/mythos_ui/src/hooks/useSessionLifecycle.ts"))

    def test_kit_unlocks_full_skill_pool_and_grants_throwables(self) -> None:
        source = read("src/mythos_runtime/session.py")
        self.assertIn('meta["learned_skills"] = sorted(skills_pool.keys())', source)
        self.assertIn('"incendiary_grenade", "cryo_grenade",', source)
        self.assertIn('"emp_grenade", "emp_grenade",', source)


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
        # Skip grace (2026-07-12): a double-click's second press used to land on
        # the overlay and flush the cut-in instantly ("스킬 이미지 안 뜸" report).
        self.assertIn("onPointerDown={handleSkip}", cinema)
        self.assertIn("mountedAtRef.current > 350", cinema)
        self.assertIn("cinema-skip-hint", cinema)

    def test_zero_damage_grenade_throws_get_an_item_cinema(self) -> None:
        # EMP/cryo throws log only "item"+"info" (statuses, no damage), so the
        # hit/defeat gate silently dropped their cut-in while the incendiary
        # (damage hits) got one — measured live 2026-07-12. The throw now
        # queues an item-art cinema and the gate admits commanded item logs.
        queue = read("src/mythos_ui/src/hooks/useCombatCinemaQueue.ts")
        self.assertIn('entry.action === "item" && typeof entry.detail?.item === "string"', queue)
        self.assertIn("Orphan item cut-in", queue)
        self.assertIn('dispatched.type === "item"', queue)
        cinema = read("src/mythos_ui/src/CombatCinema.tsx")
        self.assertIn("item-illustration", cinema)


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


class StatusStackingTest(unittest.TestCase):
    """Owner call 2026-07-12: reapplying a status ACCUMULATES duration (was
    max-refresh), capped at STATUS_EFFECT_TURNS_CAP; intensity never stacks."""

    def _fixture(self):
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _drone, _player

        from mythos_combat import CombatEngine

        engine = CombatEngine()
        state = engine.start(
            [_player(x=0, y=0)], [_drone(x=5, y=0, hp=30, defense=11, speed=0, armor=3)],
            seed="status-stack", arena=(8, 6),
        )
        player = state.player()
        foe = state.living_enemies()[0]
        assert player is not None
        return engine, state, player, foe

    def test_status_duration_accumulates_on_reapply(self) -> None:
        # Accumulation (2026-07-12) demonstrated on a utility status; burn's own
        # lower cap is locked by BalanceTuning20260714Test (2026-07-14 B안).
        engine, state, player, foe = self._fixture()
        engine._apply_status_effect(state, player, foe, "corrode", 2)
        engine._apply_status_effect(state, player, foe, "corrode", 3)
        self.assertEqual(foe.status_effects["corrode"], 5)
        # The badge list carries one chip, not one per application.
        self.assertEqual(foe.status.count("corrode"), 1)

    def test_status_duration_caps(self) -> None:
        from mythos_combat.engine import STATUS_EFFECT_TURNS_CAP

        engine, state, player, foe = self._fixture()
        engine._apply_status_effect(state, player, foe, "corrode", 4)
        engine._apply_status_effect(state, player, foe, "corrode", 4)
        self.assertEqual(foe.status_effects["corrode"], STATUS_EFFECT_TURNS_CAP)
        # Corrode intensity does NOT stack with duration: still a flat -2.
        self.assertEqual(engine._effective_armor(foe), 1)

    def test_stun_accumulates_and_caps(self) -> None:
        from mythos_combat.engine import HARD_CC_TURNS_CAP

        engine, state, player, foe = self._fixture()
        engine._apply_stun(state, player, foe, 1)
        engine._apply_stun(state, player, foe, 2)
        self.assertEqual(foe.stunned_turns, HARD_CC_TURNS_CAP)
        engine._apply_stun(state, player, foe, HARD_CC_TURNS_CAP)
        self.assertEqual(foe.stunned_turns, HARD_CC_TURNS_CAP)


class MultiStatusConcurrencyTest(unittest.TestCase):
    """Owner call 2026-07-12: several DIFFERENT statuses on one unit must
    apply, tick, and expire independently (badges and logs included)."""

    def _fixture(self):
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _drone, _player

        from mythos_combat import CombatEngine

        engine = CombatEngine()
        state = engine.start(
            [_player(x=0, y=0)], [_drone(x=5, y=0, hp=30, defense=11, speed=0, armor=3)],
            seed="multi-status", arena=(8, 6),
        )
        player = state.player()
        foe = state.living_enemies()[0]
        assert player is not None
        return engine, state, player, foe

    def test_statuses_tick_and_expire_independently(self) -> None:
        engine, state, player, foe = self._fixture()
        engine._apply_status_effect(state, player, foe, "burn", 1)
        engine._apply_status_effect(state, player, foe, "corrode", 2)
        engine._apply_status_effect(state, player, foe, "freeze", 1)
        self.assertEqual(set(foe.status), {"burn", "corrode", "freeze"})
        engine._tick_status_effects(state, foe)
        # burn and freeze expired after one turn; corrode has one turn left.
        self.assertEqual(foe.status_effects, {"corrode": 1})
        self.assertEqual(foe.status, ["corrode"])
        expired = [e.detail["status"] for e in state.log if e.detail.get("expired")]
        self.assertEqual(set(expired), {"burn", "freeze"})
        # Effects composed while co-active and drop with expiry.
        self.assertEqual(engine._effective_armor(foe), 1)
        engine._tick_status_effects(state, foe)
        self.assertEqual(foe.status_effects, {})
        self.assertEqual(engine._effective_armor(foe), 3)

    def test_burn_death_in_controllable_upkeep_never_hands_it_the_turn(self) -> None:
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _ally, _drone, _skilled_player

        from mythos_combat import CombatEngine

        engine = CombatEngine()
        ally = _ally("kai", x=1, y=1, hp=2)
        ally.controllable = True
        state = engine.start(
            [_skilled_player(x=0, y=0), ally],
            [_drone(x=7, y=5, hp=40, defense=11, speed=0)],
            seed="burn-upkeep-death", arena=(8, 6),
        )
        player = state.player()
        burned = state.by_id("kai")
        assert player is not None and burned is not None
        burned.hp = 1
        engine._apply_status_effect(state, player, burned, "burn", 2)
        # Start the walk from the PLAYER's slot so the cyclic scan must pass
        # through kai: his upkeep burn tick kills him — the turn must never
        # point at the corpse.
        state.turn_ptr = state.order.index(player.id)
        engine._run_until_controllable(state)
        self.assertFalse(burned.alive)
        active = state.active_actor()
        if state.active:
            assert active is not None
            self.assertTrue(active.alive)
            self.assertNotEqual(active.id, "kai")


class CollisionSlamTest(unittest.TestCase):
    """Owner call 2026-07-12: forced movement into the board edge / a full-cover
    structure / another unit deals bonus slam damage."""

    def _engine_state(self, foe_kwargs=None, second_foe=None):
        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _drone, _skilled_player

        from mythos_combat import CombatEngine

        engine = CombatEngine()
        foes = [_drone("d1", **(foe_kwargs or {"x": 6, "y": 0, "hp": 80, "defense": 1, "speed": 0}))]
        if second_foe:
            foes.append(_drone("d2", **second_foe))
        state = engine.start(
            [_skilled_player(x=4, y=0)], foes, seed="slam", arena=(8, 6),
        )
        # Procedural terrain could drop cover on the push line — these tests
        # place obstacles explicitly, so start from a clean board.
        state.covers.clear()
        state.hazards.clear()
        player = state.player()
        assert player is not None
        return engine, state, player

    def test_push_into_edge_slams(self) -> None:
        engine, state, player = self._engine_state()
        foe = state.by_id("d1")
        assert foe is not None
        hp0 = foe.hp
        engine._skill_displace(state, player, foe, 3, toward=False)
        self.assertEqual((foe.x, foe.y), (7, 0))
        slams = [e for e in state.log if e.detail.get("slam")]
        self.assertEqual(len(slams), 1)
        self.assertEqual(slams[0].detail.get("obstacle"), "edge")
        self.assertLess(foe.hp, hp0)

    def test_push_into_full_cover_structure_slams_and_stops(self) -> None:
        engine, state, player = self._engine_state(
            foe_kwargs={"x": 5, "y": 0, "hp": 80, "defense": 1, "speed": 0}
        )
        state.covers["6,0"] = "full"
        foe = state.by_id("d1")
        assert foe is not None
        engine._skill_displace(state, player, foe, 2, toward=False)
        self.assertEqual((foe.x, foe.y), (5, 0))  # blocked before entering the structure
        slams = [e for e in state.log if e.detail.get("slam")]
        self.assertEqual(len(slams), 1)
        self.assertEqual(slams[0].detail.get("obstacle"), "cover")

    def test_half_cover_does_not_block_forced_movement(self) -> None:
        engine, state, player = self._engine_state(
            foe_kwargs={"x": 5, "y": 0, "hp": 80, "defense": 1, "speed": 0}
        )
        state.covers["6,0"] = "half"
        foe = state.by_id("d1")
        assert foe is not None
        hp0 = foe.hp
        engine._skill_displace(state, player, foe, 1, toward=False)
        self.assertEqual((foe.x, foe.y), (6, 0))  # shoved over the low barricade
        self.assertEqual(foe.hp, hp0)  # clean displacement — no slam
        self.assertFalse(any(e.detail.get("slam") for e in state.log))

    def test_push_into_another_unit_slams(self) -> None:
        engine, state, player = self._engine_state(
            foe_kwargs={"x": 5, "y": 0, "hp": 80, "defense": 1, "speed": 0},
            second_foe={"x": 6, "y": 0, "hp": 80, "defense": 1, "speed": 0},
        )
        foe = state.by_id("d1")
        blocker = state.by_id("d2")
        assert foe is not None and blocker is not None
        engine._skill_displace(state, player, foe, 2, toward=False)
        self.assertEqual((foe.x, foe.y), (5, 0))
        slams = [e for e in state.log if e.detail.get("slam")]
        self.assertEqual(len(slams), 1)
        self.assertEqual(slams[0].detail.get("obstacle"), "unit")
        self.assertEqual(blocker.hp, 80)  # the bumped unit is not damaged (yet)

    def test_pull_flush_to_caster_is_a_clean_catch(self) -> None:
        engine, state, player = self._engine_state(
            foe_kwargs={"x": 6, "y": 0, "hp": 80, "defense": 1, "speed": 0}
        )
        foe = state.by_id("d1")
        assert foe is not None
        hp0 = foe.hp
        engine._skill_displace(state, player, foe, 4, toward=True)
        self.assertEqual((foe.x, foe.y), (5, 0))  # adjacent to the caster at (4,0)
        self.assertEqual(foe.hp, hp0)  # landing against the caster is not a collision
        self.assertFalse(any(e.detail.get("slam") for e in state.log))

    def test_full_displacement_without_blocker_never_slams(self) -> None:
        engine, state, player = self._engine_state(
            foe_kwargs={"x": 5, "y": 0, "hp": 80, "defense": 1, "speed": 0}
        )
        foe = state.by_id("d1")
        assert foe is not None
        hp0 = foe.hp
        engine._skill_displace(state, player, foe, 1, toward=False)
        self.assertEqual((foe.x, foe.y), (6, 0))
        self.assertEqual(foe.hp, hp0)
        self.assertFalse(any(e.detail.get("slam") for e in state.log))


class SignatureCastabilityTest(unittest.TestCase):
    """Owner finding 2026-07-12: 한's 시스템 침투 cost ◆4 exceeded his derived
    focus pool of 3 — a permanently uncastable signature. Owner call: raise
    han's pool via an explicit max_focus override (ally builder now honors it,
    mirroring the enemy builder). Lock the invariant for EVERY companion."""

    def test_every_companion_skill_is_castable(self) -> None:
        import json

        from mythos_combat import build_ally_combatant

        combat = json.loads(read("resources/neo-seoul/scenario.json"))["combat"]
        skills = combat["skills"]
        for ally_id, entry in combat["allies"].items():
            ally = build_ally_combatant(
                entry=entry, weapons_pool=combat["weapons"], x=0, y=0
            )
            for skill_id in ally.skills:
                cost = int((skills.get(skill_id, {}).get("cost") or {}).get("focus", 0))
                self.assertLessEqual(
                    cost,
                    ally.max_focus,
                    f"{ally_id}'s {skill_id} costs ◆{cost} but max focus is {ally.max_focus} — uncastable",
                )

    def test_han_pool_honors_explicit_override(self) -> None:
        import json

        from mythos_combat import build_ally_combatant

        combat = json.loads(read("resources/neo-seoul/scenario.json"))["combat"]
        han = build_ally_combatant(
            entry=combat["allies"]["han"], weapons_pool=combat["weapons"], x=0, y=0
        )
        self.assertEqual(han.max_focus, 4)


class CryoGrenadeDamageTest(unittest.TestCase):
    """Owner call 2026-07-12: the cryo grenade deals blast damage too (was a
    pure ❄ utility throw)."""

    def test_cryo_grenade_defines_blast_damage(self) -> None:
        import json

        combat = json.loads(read("resources/neo-seoul/scenario.json"))["combat"]
        cryo = combat["items"]["cryo_grenade"]
        self.assertEqual(cryo.get("damage"), "1d4")
        # freeze 1→2 (owner call 2026-07-14): movement-only rider was strictly
        # inferior to incendiary's burn 2 at the same cost/rarity.
        self.assertEqual(cryo.get("applies"), {"freeze": 2})

    def test_cryo_grenade_deals_damage_and_freezes(self) -> None:
        import json

        sys.path.insert(0, str(ROOT / "tests"))
        from test_combat_engine import _drone, _skilled_player

        from mythos_combat import CombatEngine, PlayerAction

        item_def = json.loads(read("resources/neo-seoul/scenario.json"))["combat"]["items"][
            "cryo_grenade"
        ]
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)],
            [_drone("d1", x=3, y=0, hp=40, defense=1, speed=0)],
            seed="cryo", arena=(8, 6),
        )
        player = state.player()
        assert player is not None
        ok = engine._player_item(
            state, player,
            PlayerAction(type="item", item_id="cryo_grenade", target_cell=(3, 0)),
            item_def, True,
        )
        self.assertTrue(ok)
        foe = state.by_id("d1")
        assert foe is not None
        self.assertLess(foe.hp, 40)
        self.assertEqual(foe.status_effects.get("freeze"), 2)


if __name__ == "__main__":
    unittest.main()
