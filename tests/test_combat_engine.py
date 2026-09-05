from __future__ import annotations

import unittest

from mythos_combat import (
    CombatEngine,
    PlayerAction,
    build_ally_combatant,
    build_encounter,
    build_enemy_combatant,
    build_player_combatant,
    combat_state_from_dict,
    combat_state_to_dict,
    loadout_for_archetype,
    narrate_outcome,
    narrate_since,
    render_radar,
)
from mythos_combat.models import Combatant, Weapon, distance
from mythos_core.dice import Dice
from mythos_runtime.scenario import load_scenario

WEAPONS = {
    "vibro_blade": {
        "id": "vibro_blade",
        "name": "진동 단검",
        "kind": "melee",
        "damage": "2d6",
        "reach": 1,
    },
    "rivet_gun": {
        "id": "rivet_gun",
        "name": "리벳 건",
        "kind": "ranged",
        "damage": "1d8",
        "range": 4,
    },
    "claw": {"id": "claw", "name": "절단날", "kind": "melee", "damage": "1d4", "reach": 1},
}


def _player(x: int = 0, y: int = 0, weapon: str = "vibro_blade", **stat_overrides: int):
    stats = {"strength": 8, "intelligence": 5, "charisma": 5, "agility": 6, "perception": 6}
    stats.update(stat_overrides)
    return build_player_combatant(
        combatant_id="player",
        name="당신",
        stats=stats,
        weapon_ids=[weapon],
        weapons_pool=WEAPONS,
        x=x,
        y=y,
    )


def _drone(entry_id: str = "d", x: int = 1, y: int = 0, hp: int = 6, defense: int = 11, **over):
    entry = {
        "id": entry_id,
        "name": "드론",
        "hp": hp,
        "defense": defense,
        "speed": 4,
        "stats": {"strength": 4, "agility": 5, "perception": 4},
        "weapons": ["claw"],
        "ai": "melee",
        "blip": "●",
    }
    entry.update(over)
    return build_enemy_combatant(entry=entry, weapons_pool=WEAPONS, x=x, y=y)


def _auto_attack(engine: CombatEngine, state) -> PlayerAction:
    player = state.player()
    assert player is not None
    target = min(state.living_enemies(), key=lambda e: distance(player.x, player.y, e.x, e.y))
    actions = engine.available_actions(state)
    best_tile = None
    best_d = distance(player.x, player.y, target.x, target.y)
    for tx, ty in actions["reachable"]:
        d = distance(tx, ty, target.x, target.y)
        if d < best_d:
            best_d = d
            best_tile = (tx, ty)
    return PlayerAction(type="attack", target_id=target.id, move_to=best_tile)


class CombatEngineTest(unittest.TestCase):
    def test_perception_grants_accuracy_and_crit_range(self) -> None:
        # Perception was display/narrative-only (to-hit = STR/AGI, crit = nat 20)
        # while boon/echo descriptions promised "accuracy and crit" — the mods
        # honor that contract. Baseline (5) stays +0/+0 so default units and old
        # balance are untouched; invested perception scales both.
        from mythos_combat.engine import CombatEngine
        from mythos_combat.models import Combatant

        def unit(perception: int) -> Combatant:
            return Combatant(
                id="u", name="u", faction="player", hp=10, max_hp=10, x=0, y=0,
                stats={"strength": 5, "agility": 5, "perception": perception},
            )

        self.assertEqual(CombatEngine._perception_mods(unit(5)), (0, 0))
        self.assertEqual(CombatEngine._perception_mods(unit(8)), (1, 0))
        self.assertEqual(CombatEngine._perception_mods(unit(10)), (1, 1))  # crits 19-20
        self.assertEqual(CombatEngine._perception_mods(unit(14)), (3, 1))
        self.assertEqual(CombatEngine._perception_mods(unit(3)), (0, 0))  # never negative

    def test_encounter_enemy_overrides_merge_onto_bestiary(self) -> None:
        # A single bestiary archetype can play different roles per encounter via
        # per-spawn ``overrides`` (e.g. a fragile sentinel vs a durable decoy).
        combat_pool = {
            "weapons": WEAPONS,
            "bestiary": {
                "drone": {
                    "id": "drone",
                    "name": "드론",
                    "hp": 12,
                    "defense": 11,
                    "speed": 4,
                    "armor": 0,
                    "stats": {"strength": 4, "agility": 5, "perception": 4},
                    "weapons": ["claw"],
                    "ai": "melee",
                    "blip": "●",
                }
            },
            "encounters": {
                "checkpoint": {
                    "id": "checkpoint",
                    "arena": {"width": 8, "height": 6},
                    "enemies": [
                        {"bestiary": "drone", "count": 1, "overrides": {"hp": 6, "defense": 14}},
                        {"bestiary": "drone", "count": 1},
                    ],
                }
            },
        }
        state = build_encounter(combat_pool, "checkpoint", player=_player(), seed="ovr")
        enemies = sorted(state.living_enemies(), key=lambda e: e.max_hp)
        self.assertEqual([e.max_hp for e in enemies], [6, 12])
        self.assertEqual(enemies[0].defense, 14)  # overridden spawn
        self.assertEqual(enemies[1].defense, 11)  # base bestiary value

    def test_initiative_and_start(self) -> None:
        engine = CombatEngine()
        state = engine.start([_player()], [_drone()], seed="s1", arena=(8, 6))
        self.assertTrue(state.active)
        self.assertEqual(len(state.order), 2)
        self.assertTrue(any(e.action == "start" for e in state.log))

    def test_combat_log_language(self) -> None:
        # K6 EN gap fix: the combat log is generated *prose* and must render in the
        # active language at the source (names interpolated in are glossary-localized
        # at the API boundary, so EN here is grammatically English).
        from mythos_combat.log_i18n import clog, leads

        self.assertEqual(clog("en", "start"), "Combat begins.")
        self.assertEqual(clog("ko", "start"), "전투 개시.")
        hit = clog("en", "attack_hit", tag="", attacker="A", weapon="W", defender="B", damage=3)
        self.assertEqual(hit, "A's W hits B for 3.")
        self.assertNotRegex(hit, r"이\(가\)|을\(를\)|은\(는\)")  # no Korean particles
        self.assertEqual(clog("en", "__unknown__"), "__unknown__")  # unknown key safe
        # Same lead-pool length per language keeps narrator RNG consumption stable.
        self.assertEqual(len(leads("en", "hit")), len(leads("ko", "hit")))
        # The engine threads language into the persisted state + start entry.
        engine = CombatEngine()
        en = engine.start([_player()], [_drone()], seed="i18n", language="en")
        self.assertEqual(en.language, "en")
        self.assertTrue(any(e.text == "Combat begins." for e in en.log))
        ko = engine.start([_player()], [_drone()], seed="i18n", language="ko")
        self.assertTrue(any(e.text == "전투 개시." for e in ko.log))

    def test_deterministic_replay(self) -> None:
        def run() -> dict:
            engine = CombatEngine()
            state = engine.start([_player()], [_drone(x=3)], seed="replay", arena=(8, 6))
            guard = 0
            while state.active and guard < 60:
                guard += 1
                state = engine.take_player_turn(state, _auto_attack(engine, state))
            return combat_state_to_dict(state)

        self.assertEqual(run(), run())

    def test_combat_terminates_with_valid_outcome(self) -> None:
        engine = CombatEngine()
        state = engine.start([_player()], [_drone(x=4, y=2)], seed="term", arena=(8, 6))
        guard = 0
        while state.active and guard < 80:
            guard += 1
            state = engine.take_player_turn(state, _auto_attack(engine, state))
        self.assertFalse(state.active)
        self.assertIn(state.outcome, {"player_victory", "player_defeat", "player_fled"})

    def test_player_defeats_trivial_enemy(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_player(x=0, y=0)],
            [_drone(x=1, y=0, hp=1, defense=1)],
            seed="trivial",
            arena=(6, 6),
        )
        state = engine.take_player_turn(
            state, PlayerAction(type="attack", target_id=state.living_enemies()[0].id)
        )
        self.assertEqual(state.outcome, "player_victory")
        self.assertFalse(state.active)

    def test_attack_out_of_range_deals_no_damage(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_player(x=0, y=0, weapon="vibro_blade")],
            [_drone(x=5, y=5, hp=20, ai="ranged")],
            seed="range",
            arena=(8, 8),
        )
        enemy = state.living_enemies()[0]
        before = enemy.hp
        state = engine.take_player_turn(state, PlayerAction(type="attack", target_id=enemy.id))
        after = state.by_id(enemy.id)
        assert after is not None
        self.assertEqual(after.hp, before)
        self.assertTrue(any(e.action == "info" for e in state.log))

    def test_serialization_round_trip(self) -> None:
        engine = CombatEngine()
        state = engine.start([_player()], [_drone(x=2)], seed="ser", arena=(8, 6))
        state = engine.take_player_turn(state, _auto_attack(engine, state))
        restored = combat_state_from_dict(combat_state_to_dict(state))
        self.assertEqual(combat_state_to_dict(restored), combat_state_to_dict(state))
        restored_player = restored.player()
        assert restored_player is not None
        self.assertEqual(restored_player.name, "당신")
        self.assertEqual(len(restored.combatants), 2)

    def test_ranged_enemy_can_attack_from_distance(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_player(x=0, y=0, agility=1, strength=2)],
            [_drone(x=6, y=0, hp=30, defense=20, ai="ranged", weapons=["rivet_gun"], speed=3)],
            seed="ranged-enemy",
            arena=(10, 4),
        )
        player = state.player()
        assert player is not None
        start_hp = player.hp
        guard = 0
        took_damage = False
        while state.active and guard < 30:
            guard += 1
            state = engine.take_player_turn(state, PlayerAction(type="defend"))
            current = state.player()
            assert current is not None
            if current.hp < start_hp:
                took_damage = True
                break
        self.assertTrue(took_damage)


SKILLS = load_scenario("neo-seoul").combat["skills"]
ITEMS = load_scenario("neo-seoul").combat["items"]


def _skilled_player(x: int = 0, y: int = 0, **stat_overrides: int):
    stats = {"strength": 8, "intelligence": 9, "charisma": 5, "agility": 6, "perception": 6}
    stats.update(stat_overrides)
    return build_player_combatant(
        combatant_id="player",
        name="당신",
        stats=stats,
        weapon_ids=["vibro_blade"],
        weapons_pool=WEAPONS,
        x=x,
        y=y,
        skills=list(SKILLS.keys()),
    )


def _ally(entry_id: str = "ally", x: int = 1, y: int = 0, hp: int | None = None, **over):
    entry = {
        "id": entry_id,
        "name": "동료",
        "hp": 20,
        "defense": 11,
        "speed": 4,
        "stats": {"strength": 6, "agility": 5, "perception": 5},
        "weapons": ["vibro_blade"],
        "ai": "melee",
    }
    entry.update(over)
    return build_ally_combatant(entry=entry, weapons_pool=WEAPONS, x=x, y=y, hp=hp)


class CombatSkillTest(unittest.TestCase):
    def test_player_grants_focus_and_skills(self) -> None:
        engine = CombatEngine()
        state = engine.start([_skilled_player()], [_drone(x=3)], seed="grant", arena=(8, 6))
        player = state.player()
        assert player is not None
        self.assertGreater(player.max_focus, 0)
        self.assertEqual(player.focus, player.max_focus)
        actions = engine.available_actions(state)
        self.assertIn("focus", actions)
        self.assertEqual({s["id"] for s in actions["skills"]}, set(SKILLS.keys()))

    def test_skill_payload_carries_structured_effect(self) -> None:
        # D1 스킬 가독성 (CBT 피드백 #2): 액션 바가 기대효과 한 줄을 조립할 수
        # 있도록 available_actions 스킬 페이로드에 구조화된 effect가 실린다.
        engine = CombatEngine()
        state = engine.start([_skilled_player()], [_drone(x=3)], seed="fx", arena=(8, 6))
        skills = {s["id"]: s for s in engine.available_actions(state)["skills"]}
        self.assertEqual(skills["signal_step"]["effect"].get("move"), 4)
        self.assertEqual(skills["covering_noise"]["effect"].get("defense_bonus"), 3)
        self.assertEqual(skills["packet_shot"]["effect"].get("damage"), "1d8")

    def test_packet_shot_hits_at_range_and_spends_focus(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)],
            [_drone(x=4, y=0, hp=40, defense=1)],
            seed="packet",
            arena=(10, 6),
        )
        enemy = state.living_enemies()[0]
        before_hp = enemy.hp
        before_focus = state.player().focus  # type: ignore[union-attr]
        state = engine.take_player_turn(
            state,
            PlayerAction(type="skill", skill_id="packet_shot"),
            skill_def=SKILLS["packet_shot"],
        )
        after = state.by_id(enemy.id)
        assert after is not None
        self.assertLess(after.hp, before_hp)
        self.assertTrue(any(e.action == "skill" for e in state.log))
        # focus spent (2) then regen (+1) creates a real resource tradeoff.
        self.assertEqual(state.player().focus, before_focus - 1)  # type: ignore[union-attr]

    def test_skill_on_cooldown_is_rejected(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)],
            [_drone(x=1, y=0, hp=80, defense=1)],
            seed="cooldown",
            arena=(8, 6),
        )
        round_before = state.round
        state = engine.take_player_turn(
            state,
            PlayerAction(type="skill", skill_id="overload_strike"),
            skill_def=SKILLS["overload_strike"],
        )
        # overload_strike cd=2: after one full turn (round tick -1) it is still on cooldown.
        log_len = len(state.log)
        round_mid = state.round
        state = engine.take_player_turn(
            state,
            PlayerAction(type="skill", skill_id="overload_strike"),
            skill_def=SKILLS["overload_strike"],
        )
        self.assertTrue(any("재충전" in e.text for e in state.log[log_len:]))
        # Rejected action does not hand the turn to enemies -> round unchanged.
        self.assertEqual(state.round, round_mid)
        self.assertGreater(round_mid, round_before)

    def test_overload_strike_splashes_adjacent_enemies(self) -> None:
        # 2026-07-12 owner call: 과부하 일격 is now the melee SPLASH skill — the
        # blast that lands on the primary target spreads flat to every enemy
        # within aoe_radius of the impact cell (no separate to-hit).
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)],
            [_drone("d1", x=1, y=0, hp=80, defense=1, speed=0),
             _drone("d2", x=1, y=1, hp=80, defense=1, speed=0)],
            seed="ov-splash", arena=(8, 6),
        )
        player = state.player()
        assert player is not None
        engine._player_skill(
            state, player,
            PlayerAction(type="skill", skill_id="overload_strike", target_id="d1"),
            SKILLS["overload_strike"], True,
        )
        d1 = state.by_id("d1")
        d2 = state.by_id("d2")
        assert d1 is not None and d2 is not None
        self.assertLess(d1.hp, 80)
        self.assertLess(d2.hp, 80)
        # And it no longer shoves the target (push moved to 자기 반발).
        self.assertEqual((d1.x, d1.y), (1, 0))

    def test_magnetic_repulse_pushes_and_stops_at_board_edge(self) -> None:
        # 자기 반발 (the dedicated push skill): shoves 2 tiles along the line
        # with a guaranteed 1d4 slam; no overshoot past the wall.
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=4, y=0)], [_drone(x=6, y=0, hp=80, defense=1, speed=0)],
            seed="repulse", arena=(8, 6),
        )
        player = state.player()
        assert player is not None
        enemy = state.living_enemies()[0]
        engine._player_skill(
            state, player,
            PlayerAction(type="skill", skill_id="magnetic_repulse", target_id=enemy.id),
            SKILLS["magnetic_repulse"], True,
        )
        moved = state.by_id(enemy.id)
        assert moved is not None
        self.assertEqual((moved.x, moved.y), (7, 0))  # 2-tile push clipped at the wall
        self.assertLess(moved.hp, 80)
        self.assertTrue(
            any(e.detail.get("forced") == "push" and e.detail.get("tiles") == 1 for e in state.log)
        )

    def test_emp_grenade_stuns_area_at_target_cell(self) -> None:
        # 2026-07-12 owner call: the EMP grenade is an XCOM-style ground-target
        # AoE — thrown at a CELL, stunning every enemy in the blast radius.
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)],
            [_drone("d1", x=3, y=0, hp=80, defense=1, speed=0),
             _drone("d2", x=4, y=1, hp=80, defense=1, speed=0),
             _drone("d3", x=7, y=5, hp=80, defense=1, speed=0)],
            seed="emp-aoe", arena=(8, 6),
        )
        player = state.player()
        assert player is not None
        ok = engine._player_item(
            state, player,
            PlayerAction(type="item", item_id="emp_grenade", target_cell=(3, 1)),
            ITEMS["emp_grenade"], True,
        )
        self.assertTrue(ok)
        d1 = state.by_id("d1")
        d2 = state.by_id("d2")
        d3 = state.by_id("d3")
        assert d1 is not None and d2 is not None and d3 is not None
        self.assertEqual(d1.stunned_turns, 1)  # within radius 1 of (3,1)
        self.assertEqual(d2.stunned_turns, 1)
        self.assertEqual(d3.stunned_turns, 0)  # far corner untouched
        aoe = [e for e in state.log if e.detail.get("cell") is not None]
        self.assertTrue(aoe)
        self.assertEqual(aoe[-1].detail.get("cell"), [3, 1])
        self.assertEqual(set(aoe[-1].detail.get("stunned") or []), {"d1", "d2"})

    def test_emp_grenade_rejects_out_of_range_cell(self) -> None:
        # A cell beyond throw range must not consume the grenade; with no valid
        # fallback enemy nearby the action is refused.
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)], [_drone(x=7, y=5, hp=80, defense=1, speed=0)],
            seed="emp-range", arena=(8, 6),
        )
        player = state.player()
        assert player is not None
        ok = engine._player_item(
            state, player,
            PlayerAction(type="item", item_id="emp_grenade", target_cell=(7, 5)),
            ITEMS["emp_grenade"], True,
        )
        self.assertFalse(ok)
        foe = state.living_enemies()[0]
        self.assertEqual(foe.stunned_turns, 0)

    def test_pull_drags_enemy_toward_actor(self) -> None:
        # P1 당기기: a control skill pulls the target toward the caster.
        engine = CombatEngine()
        engine.skills_pool["tether"] = {
            "id": "tether", "name": "견인", "role": "control",
            "range": 6, "cooldown": 0, "cost": {}, "effect": {"pull": 2},
        }
        state = engine.start(
            [_skilled_player(x=0, y=0)], [_drone(x=4, y=0, hp=80, defense=1)],
            seed="pull", arena=(8, 6),
        )
        player = state.player()
        assert player is not None
        enemy = state.living_enemies()[0]
        engine._player_skill(
            state, player,
            PlayerAction(type="skill", skill_id="tether", target_id=enemy.id),
            engine.skills_pool["tether"], True,
        )
        moved = state.by_id(enemy.id)
        assert moved is not None
        self.assertEqual((moved.x, moved.y), (2, 0))

    def test_magnetic_pull_slams_for_guaranteed_damage(self) -> None:
        # 2026-07-12 rebalance: a zero-damage utility cast never justified the
        # turn — the yank now deals a guaranteed 1d4 slam (no to-hit, no armor).
        # The move log also carries from/forced metadata for the yank VFX.
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)], [_drone(x=4, y=0, hp=80, defense=1, speed=0)],
            seed="pull-slam", arena=(8, 6),
        )
        # This seed drops full cover on (3,0), which since 07-12 blocks forced
        # movement (collision slam) — clear terrain: this test is about the yank.
        state.covers.clear()
        player = state.player()
        assert player is not None
        enemy = state.living_enemies()[0]
        engine._player_skill(
            state, player,
            PlayerAction(type="skill", skill_id="magnetic_pull", target_id=enemy.id),
            SKILLS["magnetic_pull"], True,
        )
        moved = state.by_id(enemy.id)
        assert moved is not None
        self.assertEqual((moved.x, moved.y), (2, 0))
        self.assertLess(moved.hp, 80)
        self.assertGreaterEqual(moved.hp, 76)  # 1d4 slam, armor-bypassing
        move_logs = [e for e in state.log if e.detail.get("forced") == "pull" and e.detail.get("tiles")]
        self.assertTrue(move_logs)
        self.assertEqual(move_logs[-1].detail.get("from"), [4, 0])
        self.assertTrue(any(e.detail.get("shock") for e in state.log))

    def test_pull_blocked_logs_no_budge_and_still_slams(self) -> None:
        # An adjacent enemy can't be dragged into the caster's own cell: the
        # yank moves 0 tiles but must SAY so, and the slam rider still lands.
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)], [_drone(x=1, y=0, hp=80, defense=1, speed=0)],
            seed="pull-block", arena=(8, 6),
        )
        player = state.player()
        assert player is not None
        enemy = state.living_enemies()[0]
        engine._player_skill(
            state, player,
            PlayerAction(type="skill", skill_id="magnetic_pull", target_id=enemy.id),
            SKILLS["magnetic_pull"], True,
        )
        held = state.by_id(enemy.id)
        assert held is not None
        self.assertEqual((held.x, held.y), (1, 0))
        self.assertTrue(
            any(e.detail.get("forced") == "pull" and e.detail.get("tiles") == 0 for e in state.log)
        )
        self.assertLess(held.hp, 80)

    def test_signal_step_arrival_discharge_shocks_adjacent(self) -> None:
        # 2026-07-12 rebalance: blinking INTO melee discharges 1d4 on adjacent
        # enemies; blinking away stays a free escape (no target requirement).
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)], [_drone(x=4, y=0, hp=80, defense=1, speed=0)],
            seed="step-shock", arena=(8, 6),
        )
        player = state.player()
        assert player is not None
        enemy = state.living_enemies()[0]
        engine._player_skill(
            state, player,
            PlayerAction(type="skill", skill_id="signal_step", move_to=(3, 0)),
            SKILLS["signal_step"], True,
        )
        self.assertEqual((player.x, player.y), (3, 0))
        shocked = state.by_id(enemy.id)
        assert shocked is not None
        self.assertLess(shocked.hp, 80)
        self.assertGreaterEqual(shocked.hp, 76)

    def test_signal_step_away_from_enemies_costs_no_damage_logs(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=3, y=0)], [_drone(x=4, y=0, hp=80, defense=1, speed=0)],
            seed="step-away", arena=(8, 6),
        )
        player = state.player()
        assert player is not None
        enemy = state.living_enemies()[0]
        engine._player_skill(
            state, player,
            PlayerAction(type="skill", skill_id="signal_step", move_to=(0, 0)),
            SKILLS["signal_step"], True,
        )
        self.assertEqual((player.x, player.y), (0, 0))
        untouched = state.by_id(enemy.id)
        assert untouched is not None
        self.assertEqual(untouched.hp, 80)

    def test_covering_noise_applies_defense_buff(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)],
            [_drone(x=5, y=0, hp=80, defense=1)],
            seed="cover",
            arena=(10, 6),
        )
        state = engine.take_player_turn(
            state,
            PlayerAction(type="skill", skill_id="covering_noise"),
            skill_def=SKILLS["covering_noise"],
        )
        self.assertTrue(any("방어 +" in e.text for e in state.log))

    def test_patch_protocol_requires_item(self) -> None:
        engine = CombatEngine()
        # Immobile, far enemy so it cannot retaliate and skew the heal assertions.
        state = engine.start(
            [_skilled_player(x=0, y=0)],
            [_drone(x=9, y=5, hp=80, defense=1, speed=0)],
            seed="patch",
            arena=(10, 6),
        )
        player = state.player()
        assert player is not None
        player.hp = 4
        # Without the item: rejected, no heal.
        state = engine.take_player_turn(
            state,
            PlayerAction(type="skill", skill_id="patch_protocol"),
            skill_def=SKILLS["patch_protocol"],
            item_available=False,
        )
        self.assertEqual(state.player().hp, 4)  # type: ignore[union-attr]
        # With the item: heals and flags the consumed resource.
        state = engine.take_player_turn(
            state,
            PlayerAction(type="skill", skill_id="patch_protocol"),
            skill_def=SKILLS["patch_protocol"],
            item_available=True,
        )
        self.assertGreater(state.player().hp, 4)  # type: ignore[union-attr]
        self.assertTrue(any(e.detail.get("consumed") == "nanopatch" for e in state.log if e.detail))

    def test_patch_protocol_heals_an_ally_in_range(self) -> None:
        # Range-3 heal directed at a wounded ally must land on the ally, not the caster.
        engine = CombatEngine()
        ally = _ally(x=2, y=0, hp=4)  # within range 3 of the caster at (0, 0)
        state = engine.start(
            [_skilled_player(x=0, y=0), ally],
            [_drone(x=9, y=5, hp=80, defense=1, speed=0)],
            seed="ally-heal",
            arena=(10, 6),
        )
        player = state.player()
        assert player is not None
        player.hp = 5
        ally.x, ally.y, ally.hp = 2, 0, 4  # pin: AI ally may have stepped off in the opening
        engine._player_skill(
            state,
            player,
            PlayerAction(type="skill", skill_id="patch_protocol", target_id=ally.id),
            SKILLS["patch_protocol"],
            item_available=True,
        )
        healed_ally = state.by_id(ally.id)
        assert healed_ally is not None
        self.assertGreater(healed_ally.hp, 4)  # ally healed
        self.assertEqual(state.player().hp, 5)  # type: ignore[union-attr]  # caster untouched

    def test_nanoshield_projector_shields_an_ally_in_range(self) -> None:
        engine = CombatEngine()
        ally = _ally(x=2, y=0)  # within range 3
        state = engine.start(
            [_skilled_player(x=0, y=0), ally],
            [_drone(x=9, y=5, hp=80, defense=1, speed=0)],
            seed="ally-shield",
            arena=(10, 6),
        )
        player = state.player()
        assert player is not None
        ally.x, ally.y = 2, 0  # pin: AI ally may have stepped off in the opening
        engine._player_skill(
            state,
            player,
            PlayerAction(type="skill", skill_id="nanoshield_projector", target_id=ally.id),
            SKILLS["nanoshield_projector"],
            item_available=True,
        )
        shielded_ally = state.by_id(ally.id)
        assert shielded_ally is not None
        self.assertGreater(shielded_ally.defense_buff, 0)  # ally shielded
        self.assertEqual(state.player().defense_buff, 0)  # type: ignore[union-attr]

    def test_support_falls_back_to_self_when_target_out_of_range(self) -> None:
        # Ally beyond range 3 -> heal falls back to the caster (safe default).
        engine = CombatEngine()
        ally = _ally(x=8, y=5, hp=4)  # far out of range
        state = engine.start(
            [_skilled_player(x=0, y=0), ally],
            [_drone(x=9, y=0, hp=80, defense=1, speed=0)],
            seed="ally-far",
            arena=(10, 6),
        )
        player = state.player()
        assert player is not None
        player.hp = 5
        ally.x, ally.y, ally.hp = 8, 5, 4  # pin far out of range
        engine._player_skill(
            state,
            player,
            PlayerAction(type="skill", skill_id="patch_protocol", target_id=ally.id),
            SKILLS["patch_protocol"],
            item_available=True,
        )
        self.assertGreater(state.player().hp, 5)  # type: ignore[union-attr]  # caster self-healed
        self.assertEqual(state.by_id(ally.id).hp, 4)  # type: ignore[union-attr]  # ally untouched

    def test_available_actions_exposes_friendly_targets(self) -> None:
        engine = CombatEngine()
        ally = _ally(x=2, y=0)
        state = engine.start(
            [_skilled_player(x=0, y=0), ally],
            [_drone(x=9, y=5, hp=80, defense=1, speed=0)],
            seed="friendly-targets",
            arena=(10, 6),
        )
        # Drive the initiative pointer to the player so they are the active actor.
        player = state.player()
        assert player is not None
        state.turn_ptr = state.order.index(player.id)
        actions = engine.available_actions(state)
        friendly_ids = {f["id"] for f in actions["friendly_targets"]}
        self.assertIn(ally.id, friendly_ids)
        self.assertIn(player.id, friendly_ids)
        self.assertTrue(any(f["is_self"] for f in actions["friendly_targets"]))

    def test_item_nanopatch_heals_and_focus_item_restores(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)],
            [_drone(x=9, y=5, hp=80, defense=1, speed=0)],
            seed="item",
            arena=(10, 6),
        )
        player = state.player()
        assert player is not None
        player.hp = 3
        player.focus = 0
        state = engine.take_player_turn(
            state,
            PlayerAction(type="item", item_id="nanopatch"),
            item_def=ITEMS["nanopatch"],
            item_available=True,
        )
        self.assertGreater(state.player().hp, 3)  # type: ignore[union-attr]
        state = engine.take_player_turn(
            state,
            PlayerAction(type="item", item_id="stim_shard"),
            item_def=ITEMS["stim_shard"],
            item_available=True,
        )
        self.assertGreater(state.player().focus, 0)  # type: ignore[union-attr]

    def test_item_restart_core_revives_downed_ally(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0), _ally("se_rin", x=1, y=0)],
            [_drone(x=9, y=5, hp=80, defense=1, speed=0)],
            seed="revive",
            arena=(10, 6),
        )
        downed = state.by_id("se_rin")
        assert downed is not None
        downed.alive = False
        downed.hp = 0

        state = engine.take_player_turn(
            state,
            PlayerAction(type="item", item_id="restart_core"),
            item_def=ITEMS["restart_core"],
            item_available=True,
        )

        revived = state.by_id("se_rin")
        assert revived is not None
        self.assertTrue(revived.alive)
        self.assertGreaterEqual(revived.hp, 1)
        self.assertTrue(any(e.detail.get("revived") == "se_rin" for e in state.log if e.detail))

    def test_item_restart_core_not_consumed_without_downed_ally(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0), _ally("se_rin", x=1, y=0)],
            [_drone(x=9, y=5, hp=80, defense=1, speed=0)],
            seed="revive-noop",
            arena=(10, 6),
        )

        state = engine.take_player_turn(
            state,
            PlayerAction(type="item", item_id="restart_core"),
            item_def=ITEMS["restart_core"],
            item_available=True,
        )

        # Nobody was down: the core must not be consumed (no item log entry).
        self.assertFalse(
            any(e.detail.get("consumed") == "restart_core" for e in state.log if e.detail)
        )

    def test_defend_restores_focus_as_recharge_turn(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)],
            [_drone(x=9, y=5, hp=80, defense=1, speed=0)],
            seed="defend-focus",
            arena=(10, 6),
        )
        player = state.player()
        assert player is not None
        player.focus = 0

        state = engine.take_player_turn(state, PlayerAction(type="defend"))

        player = state.player()
        assert player is not None
        self.assertEqual(player.focus, 2)
        self.assertTrue(any(e.detail.get("focus_gained") == 1 for e in state.log if e.detail))

    def test_ally_uses_covering_noise_automatically(self) -> None:
        engine = CombatEngine()

        ally = Combatant(
            id="se_rin",
            name="정세린",
            faction="ally",
            hp=14,
            max_hp=14,
            x=2,
            y=2,
            stats={"strength": 4, "agility": 7, "perception": 7},
            defense=13,
            speed=5,
            focus=2,
            max_focus=4,
            skills=["covering_noise"],
            weapons=[
                Weapon(id="rivet_carbine", name="리벳 카빈", kind="ranged", range=4, damage="1d6")
            ],
        )
        drone = _drone(x=5, y=2)

        state = engine.start([_player(x=0, y=0), ally], [drone], seed="ally-cover-noise")
        state.order = ["se_rin", "player", "drone"]
        state.turn_ptr = 0

        if ally.defense_buff != 3:
            engine._npc_turn(state, ally)

        self.assertEqual(ally.defense_buff, 3)
        self.assertEqual(ally.defense_buff_turns, 1)
        self.assertTrue(any("엄호 노이즈" in e.text for e in state.log))

    def test_ally_uses_packet_shot_automatically(self) -> None:
        engine = CombatEngine()

        ally = Combatant(
            id="se_rin",
            name="정세린",
            faction="ally",
            hp=14,
            max_hp=14,
            x=2,
            y=2,
            stats={"strength": 4, "agility": 7, "perception": 7},
            defense=13,
            speed=5,
            focus=1,
            max_focus=4,
            skills=["packet_shot"],
            weapons=[
                Weapon(id="rivet_carbine", name="리벳 카빈", kind="ranged", range=4, damage="1d6")
            ],
        )
        drone = _drone(x=6, y=2, hp=20)

        state = engine.start([_player(x=0, y=0), ally], [drone], seed="ally-packet-shot")
        state.order = ["se_rin", "player", "drone"]
        state.turn_ptr = 0

        # If she hasn't used packet_shot yet, trigger her turn
        has_cast = any("패킷 사격" in e.text for e in state.log)
        if not has_cast:
            engine._npc_turn(state, ally)

        self.assertTrue(any("패킷 사격" in e.text for e in state.log))

    def test_ally_uses_restore_margin_automatically(self) -> None:
        engine = CombatEngine()
        engine.skills_pool["restore_margin"] = {
            "id": "restore_margin",
            "name": "여백 복원",
            "cost": {"focus": 2},
            "range": 3,
            "effect": {"heal": "1d8"},
            "cooldown": 2,
        }

        ally = Combatant(
            id="io",
            name="이오",
            faction="ally",
            hp=12,
            max_hp=12,
            x=2,
            y=2,
            stats={"strength": 2, "agility": 4, "perception": 8},
            defense=14,
            speed=4,
            focus=2,
            max_focus=4,
            skills=["restore_margin"],
            weapons=[
                Weapon(id="catalog_beam", name="목록 광선", kind="ranged", range=4, damage="1d6")
            ],
        )

        player = _player(x=1, y=2)
        player.max_hp = 15
        player.hp = 5
        drone = _drone(x=5, y=2, hp=20)

        state = engine.start([player, ally], [drone], seed="ally-restore-margin")

        # If Io has already cast restore_margin during opening, player hp is healed
        has_cast = any("여백 복원" in e.text for e in state.log)
        if not has_cast:
            state.order = ["io", "player", "drone"]
            state.turn_ptr = 0
            engine._npc_turn(state, ally)

        p = state.player()
        assert p is not None
        self.assertGreater(p.hp, 5)
        self.assertTrue(any("여백 복원" in e.text for e in state.log))

    def test_ally_uses_silent_shelve_automatically(self) -> None:
        engine = CombatEngine()
        engine.skills_pool["silent_shelve"] = {
            "id": "silent_shelve",
            "name": "무음 서가 이동",
            "cost": {"focus": 2},
            "range": 4,
            "effect": {"move": 4},
            "cooldown": 2,
        }

        ally = Combatant(
            id="miro",
            name="미로",
            faction="ally",
            hp=2,
            max_hp=10,
            x=2,
            y=2,
            stats={"strength": 2, "agility": 7, "perception": 6},
            defense=12,
            speed=5,
            focus=2,
            max_focus=4,
            skills=["silent_shelve"],
            weapons=[Weapon(id="index_dagger", name="색인 단검", kind="melee", damage="1d6")],
            ai="coward",
        )

        drone = _drone(x=3, y=2, hp=20)

        start_x, start_y = ally.x, ally.y
        state = engine.start([_player(x=0, y=0), ally], [drone], seed="ally-silent-shelve")

        has_cast = any("무음 서가 이동" in e.text for e in state.log)
        if not has_cast:
            state.order = ["miro", "player", "drone"]
            state.turn_ptr = 0
            engine._npc_turn(state, ally)

        self.assertNotEqual((ally.x, ally.y), (start_x, start_y))
        self.assertTrue(any("무음 서가 이동" in e.text for e in state.log))


class ScenarioPoolEncounterTest(unittest.TestCase):
    def test_neo_seoul_encounter_runs_from_pool(self) -> None:
        combat_pool = load_scenario("neo-seoul").combat
        self.assertIn("patrol_ambush", combat_pool["encounters"])
        weapon_ids = loadout_for_archetype(combat_pool, "ghost")
        self.assertEqual(weapon_ids, ["vibro_blade"])

        player = build_player_combatant(
            combatant_id="player",
            name="당신",
            stats={"strength": 8, "agility": 7, "perception": 6},
            weapon_ids=weapon_ids,
            weapons_pool=combat_pool["weapons"],
            x=0,
            y=0,
        )
        engine = CombatEngine()
        state = build_encounter(
            combat_pool, "patrol_ambush", player=player, seed="enc-seed", engine=engine
        )
        self.assertEqual(len(state.living_enemies()), 2)

        guard = 0
        while state.active and guard < 100:
            guard += 1
            state = engine.take_player_turn(state, _auto_attack(engine, state))
        self.assertFalse(state.active)
        self.assertIn(state.outcome, {"player_victory", "player_defeat", "player_fled"})


class CombatNarratorTest(unittest.TestCase):
    def test_render_radar_snapshot(self) -> None:
        engine = CombatEngine()
        state = engine.start([_player(x=0, y=0)], [_drone(x=3, y=2)], seed="radar", arena=(8, 6))
        radar = render_radar(state)
        self.assertEqual(radar["arena"], {"w": 8, "h": 6})
        self.assertEqual(len(radar["blips"]), 2)
        player_blip = next(b for b in radar["blips"] if b["faction"] == "player")
        self.assertEqual((player_blip["x"], player_blip["y"]), (0, 0))
        self.assertIn(radar["current"], radar["turn_order"])
        # Enemies acting first in the opening can already chip the player, so the
        # ratio is bounded but not guaranteed full.
        self.assertGreater(player_blip["hp_ratio"], 0.0)
        self.assertLessEqual(player_blip["hp_ratio"], 1.0)

    def test_emp_pulse_stuns_enemy_and_skips_its_turn(self) -> None:
        # F 스턴 기반 (EMP 펄스 — 기존 장식품): 스턴된 적은 자기 턴을 통째로 잃는다.
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)], [_drone(x=2, y=0, hp=30)], seed="stun", arena=(8, 6)
        )
        enemy = state.living_enemies()[0]
        player = state.player()
        assert player is not None
        hp_before = player.hp
        state = engine.take_player_turn(
            state,
            PlayerAction(type="skill", skill_id="emp_pulse", target_id=enemy.id),
            skill_def=SKILLS["emp_pulse"],
        )
        details = [e.detail for e in state.log]
        self.assertTrue(any(d.get("stunned") == enemy.id for d in details), "stun not applied")
        self.assertTrue(
            any(d.get("stunned_skip") == enemy.id for d in details), "stunned turn not skipped"
        )
        # 스턴된 드론은 이동·공격 없이 턴을 잃는다 → 플레이어 무피해.
        self.assertEqual(state.player().hp, hp_before)  # type: ignore[union-attr]
        # 지속 1턴: 스킵과 동시에 소진 — 하지만 상태 칩(💫 배지)은 남는다.
        # (2026-07-12: 같은 트랜지션 안에서 적용+소모되면 클라이언트 스냅샷에
        # 기절이 한 번도 안 보였음 — 칩은 그 유닛의 다음 upkeep에 걷힌다.)
        after = state.by_id(enemy.id)
        assert after is not None
        self.assertEqual(after.stunned_turns, 0)
        self.assertIn("stunned", after.status)
        # 다음 upkeep(그 유닛의 다음 턴 시작)에 칩이 정리된다.
        engine._tick_round_upkeep(state, after)
        self.assertNotIn("stunned", after.status)

    def test_emp_grenade_item_finally_stuns(self) -> None:
        # F: EMP 수류탄(effect="stun")이 실제로 동작한다 (인벤토리 소모 포함).
        engine = CombatEngine()
        state = engine.start(
            [_skilled_player(x=0, y=0)], [_drone(x=2, y=0, hp=30)], seed="stun-item", arena=(8, 6)
        )
        enemy = state.living_enemies()[0]
        state = engine.take_player_turn(
            state,
            PlayerAction(type="item", item_id="emp_grenade", target_id=enemy.id),
            item_def=ITEMS["emp_grenade"],
            item_available=True,
        )
        details = [e.detail for e in state.log]
        self.assertTrue(any(d.get("stunned") == enemy.id for d in details))
        self.assertTrue(any(d.get("consumed") == "emp_grenade" for d in details))

    def test_cover_saved_miss_narrates_cover(self) -> None:
        # D4 엄폐 가독성: 엄폐 보너스가 명중을 빗나가게 만든 미스는 일반 미스가
        # 아니라 '엄폐물에 막혔다'로 서술되고 detail.cover_saved가 선다.
        engine = CombatEngine()
        seen_cover_miss = False
        for i in range(80):
            state = engine.start(
                [_player(x=0, y=0, weapon="rivet_gun")],
                [_drone(x=3, y=0, hp=60, defense=14)],
                seed=f"cover-{i}",
                arena=(8, 6),
            )
            enemy = state.living_enemies()[0]
            state.covers[f"{enemy.x},{enemy.y}"] = "full"
            state = engine.take_player_turn(
                state, PlayerAction(type="attack", target_id=enemy.id)
            )
            for entry in state.log:
                if entry.action == "miss" and entry.detail.get("cover_saved"):
                    self.assertIn("엄폐", entry.text)
                    seen_cover_miss = True
            if seen_cover_miss:
                break
        self.assertTrue(seen_cover_miss, "no cover-saved miss across 80 seeds")

    def test_render_radar_serializes_buff_state(self) -> None:
        # D2 상태 칩 (CBT 피드백 #2 "엄호 노이즈가 뭘 했는지 모름"): 일시 방어
        # 버프/격노/상태 리스트가 blip에 실려야 로스터·보드 칩이 그릴 수 있다.
        engine = CombatEngine()
        state = engine.start([_player(x=0, y=0)], [_drone(x=3, y=2)], seed="buff", arena=(8, 6))
        player = state.player()
        assert player is not None
        player.defense_buff = 3
        player.defense_buff_turns = 1
        player.status.append("stunned")
        enemy = state.living_enemies()[0]
        enemy.enraged = True
        blips = {b["id"]: b for b in render_radar(state)["blips"]}
        self.assertEqual(blips[player.id]["defense_buff"], 3)
        self.assertEqual(blips[player.id]["defense_buff_turns"], 1)
        self.assertEqual(blips[player.id]["status"], ["stunned"])
        self.assertTrue(blips[enemy.id]["enraged"])
        self.assertFalse(blips[player.id]["enraged"])

    def test_narrate_since_is_nonempty_and_deterministic(self) -> None:
        engine = CombatEngine()
        state = engine.start([_player()], [_drone(x=2)], seed="narr", arena=(8, 6))
        before = len(state.log)
        state = engine.take_player_turn(state, _auto_attack(engine, state))
        prose_a = narrate_since(state, before)
        prose_b = narrate_since(state, before)
        self.assertTrue(prose_a.strip())
        self.assertEqual(prose_a, prose_b)

    def test_narrate_outcome_maps_states(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_player()], [_drone(x=1, y=0, hp=1, defense=1)], seed="out", arena=(6, 6)
        )
        state = engine.take_player_turn(
            state, PlayerAction(type="attack", target_id=state.living_enemies()[0].id)
        )
        self.assertEqual(state.outcome, "player_victory")
        self.assertIn("살아남", narrate_outcome(state))

    def test_enemy_intent_prediction(self) -> None:
        engine = CombatEngine()
        # 1. 드론이 (3, 0)에 있고 플레이어가 (0, 0)에 있는 경우 -> 이동 후 사거리 도달하여 attack 예측
        state = engine.start([_player(x=0, y=0)], [_drone(x=3, y=0)], seed="intent", arena=(8, 6))
        engine.available_actions(state)

        radar_snap = render_radar(state)
        self.assertIn("enemy_intents", radar_snap)
        intents = radar_snap["enemy_intents"]
        self.assertEqual(len(intents), 1)
        intent = intents[0]
        self.assertEqual(intent["action"], "attack")
        self.assertEqual(intent["target_x"], 0)
        self.assertEqual(intent["target_y"], 0)
        # Full telegraph (P0 2026-07-11): an announced attack carries its dice
        # cost so the threatened tile reads "⚔ 2d6", not a bare threat icon.
        attacker = state.by_id(intent["enemy_id"])
        assert attacker is not None
        weapon = attacker.primary_weapon()
        assert weapon is not None
        self.assertEqual(intent["damage_hint"], weapon.damage)

        # 2. 드론이 (7, 0)에 있어서 speed 4로도 플레이어(0, 0) 사거리 1에 닿지 못하는 경우 -> 단순 move 예측
        state2 = engine.start(
            [_player(x=0, y=0, agility=99)], [_drone(x=7, y=0)], seed="intent2", arena=(8, 6)
        )
        engine.available_actions(state2)
        intent2 = state2.enemy_intents[0]
        self.assertEqual(intent2.action, "move")
        self.assertEqual(intent2.target_x, 3)
        self.assertEqual(intent2.target_y, 0)

    def test_se_rin_ai_shields_wounded_player(self) -> None:
        engine = CombatEngine()
        engine.skills_pool["covering_noise"] = {
            "id": "covering_noise",
            "name": "엄호 노이즈",
            "cost": {"focus": 2},
            "range": 4,
            "effect": {"defense_bonus": 3, "duration": 1},
            "cooldown": 3,
        }

        ally = Combatant(
            id="se_rin",
            name="정세린",
            faction="ally",
            hp=14,
            max_hp=14,
            x=2,
            y=2,
            stats={"strength": 4, "agility": 7, "perception": 7},
            defense=13,
            speed=5,
            focus=2,
            max_focus=4,
            skills=["covering_noise"],
            weapons=[
                Weapon(id="rivet_carbine", name="리벳 카빈", kind="ranged", range=4, damage="1d6")
            ],
        )
        player = _player(x=1, y=2)
        player.max_hp = 10
        player.hp = 5
        drone = _drone(x=5, y=2)

        state = engine.start([player, ally], [drone], seed="se-rin-guard-player")
        state.order = ["se_rin", "player", "drone"]
        state.turn_ptr = 0

        engine._npc_turn(state, ally)

        self.assertEqual(player.defense_buff, 3)
        self.assertEqual(player.defense_buff_turns, 1)
        self.assertEqual(ally.defense_buff, 0)

    def test_kai_ai_targets_closest_to_player(self) -> None:
        engine = CombatEngine()
        engine.skills_pool["overload_strike"] = {
            "id": "overload_strike",
            "name": "과부하 일격",
            "cost": {"focus": 2},
            "range": 1,
            "effect": {"damage_bonus": "1d6", "armor_pen": 2},
            "cooldown": 2,
        }

        ally = Combatant(
            id="kai",
            name="카이",
            faction="ally",
            hp=18,
            max_hp=18,
            x=2,
            y=1,
            stats={"strength": 8, "agility": 3, "perception": 5},
            defense=14,
            speed=3,
            focus=2,
            max_focus=4,
            skills=["overload_strike"],
            weapons=[
                Weapon(
                    id="overload_gauntlet",
                    name="과부하 건틀릿",
                    kind="melee",
                    reach=1,
                    damage="2d6",
                )
            ],
        )

        player = _player(x=0, y=0)
        drone1 = _drone(entry_id="d1", x=3, y=1)
        drone2 = _drone(entry_id="d2", x=1, y=0)

        state = engine.start([player, ally], [drone1, drone2], seed="kai-aggro")
        state.order = ["kai", "player", "d1", "d2"]
        state.turn_ptr = 0

        engine._npc_turn(state, ally)

        skill_logs = [e for e in state.log if e.action == "skill" and e.actor == "kai"]
        self.assertTrue(len(skill_logs) > 0)


class ControllableAllyTest(unittest.TestCase):
    def _ally(self, *, controllable: bool) -> Combatant:
        entry = {
            "id": "kai",
            "name": "카이",
            "hp": 18,
            "defense": 12,
            "speed": 3,
            "stats": {"strength": 8, "agility": 3, "perception": 5},
            "weapons": ["claw"],
            "ai": "melee",
            "skills": [],
        }
        return build_ally_combatant(
            entry=entry, weapons_pool=WEAPONS, x=1, y=1, controllable=controllable
        )

    def test_controllable_party_member_waits_for_input(self) -> None:
        engine = CombatEngine()
        ally = self._ally(controllable=True)
        state = engine.start([_player(0, 0), ally], [_drone(x=7, y=5, hp=40)], seed="ctrl")
        state.order = ["player", "kai", "drone"]
        state.turn_ptr = 0

        state = engine.take_player_turn(state, PlayerAction(type="defend"))

        actor = state.active_actor()
        self.assertIsNotNone(actor)
        assert actor is not None
        self.assertEqual(actor.id, "kai")
        actions = engine.available_actions(state)
        self.assertTrue(actions["can_act"])
        self.assertEqual(actions["active_actor_id"], "kai")
        self.assertFalse(actions["is_player"])

    def test_party_member_cannot_flee(self) -> None:
        engine = CombatEngine()
        ally = self._ally(controllable=True)
        state = engine.start([_player(0, 0), ally], [_drone(x=7, y=5, hp=40)], seed="noflee")
        state.order = ["player", "kai", "drone"]
        state.turn_ptr = 0
        state = engine.take_player_turn(state, PlayerAction(type="defend"))
        self.assertEqual(state.active_actor().id, "kai")  # type: ignore[union-attr]

        # Flee is rejected for party members: turn is not consumed, still kai's turn.
        state = engine.take_player_turn(state, PlayerAction(type="flee"))
        self.assertEqual(state.active_actor().id, "kai")  # type: ignore[union-attr]
        self.assertNotEqual(state.outcome, "player_fled")

    def test_ai_ally_auto_resolves_turn(self) -> None:
        engine = CombatEngine()
        ally = self._ally(controllable=False)
        state = engine.start([_player(0, 0), ally], [_drone(x=2, y=1, hp=40)], seed="aiAlly")
        state.order = ["player", "kai", "drone"]
        state.turn_ptr = 0

        state = engine.take_player_turn(state, PlayerAction(type="defend"))

        actor = state.active_actor()
        self.assertIsNotNone(actor)
        assert actor is not None
        self.assertEqual(actor.id, "player")  # control returns to the player
        self.assertTrue(any(e.actor == "kai" for e in state.log))  # ally acted via AI


if __name__ == "__main__":
    unittest.main()


class FleeForecastTest(unittest.TestCase):
    """Attack targets have shown hit %/damage since slice 2 while the flee button
    showed nothing, so a failed break-off — which costs the turn, and at low HP
    the run — read as "flee always loses" in live play (2026-08-01). The preview
    must mirror ``_player_flee``'s math exactly, the way ``_attack_preview``
    mirrors ``_attack``."""

    class _FixedDice(Dice):
        """Pins the d20 so every face can be walked deterministically."""

        def __init__(self, roll: int) -> None:
            super().__init__(seed=f"fixed:{roll}")
            self._roll = roll

        def roll_die(self, sides: int) -> int:
            return self._roll if sides == 20 else super().roll_die(sides)

    def _state(self, agility: int, adjacent: int):
        from mythos_combat.models import CombatState

        player = _player(x=5, y=5, agility=agility)
        spots = [(4, 5), (6, 5), (5, 4), (5, 6)]
        enemies = [
            _drone(entry_id=f"e{i}", x=spots[i][0], y=spots[i][1]) for i in range(adjacent)
        ]
        # A distant enemy keeps the fight alive without touching the flee DC.
        enemies.append(_drone(entry_id="far", x=0, y=0))
        combatants = [player, *enemies]
        return CombatState(
            active=True,
            round=1,
            arena_w=12,
            arena_h=12,
            combatants=combatants,
            order=[c.id for c in combatants],
            log=[],
            enemy_intents=[],
            elevations={},
            covers={},
            hazards={},
            telegraphs=[],
        )

    def _preview(self, engine: CombatEngine, agility: int, adjacent: int) -> dict:
        state = self._state(agility, adjacent)
        player = state.player()
        assert player is not None
        return engine._flee_preview(state, player)

    def test_advertised_chance_matches_actual_success_rate(self) -> None:
        engine = CombatEngine()

        for agility in range(0, 9):
            for adjacent in range(0, 5):
                advertised = self._preview(engine, agility, adjacent)
                wins = 0
                for face in range(1, 21):
                    trial = self._state(agility, adjacent)
                    player = trial.player()
                    assert player is not None
                    engine._player_flee(trial, player, self._FixedDice(face))
                    if trial.outcome == "player_fled":
                        wins += 1
                with self.subTest(agility=agility, adjacent=adjacent):
                    self.assertEqual(advertised["chance"], round(wins / 20 * 100))

    def test_chance_drops_with_each_adjacent_enemy(self) -> None:
        engine = CombatEngine()

        chances = [self._preview(engine, 6, n)["chance"] for n in range(0, 5)]

        # 12 + 2 per adjacent enemy: each one costs exactly 2 of the 20 d20 faces.
        self.assertEqual(chances, sorted(chances, reverse=True))
        self.assertEqual([chances[i] - chances[i + 1] for i in range(4)], [10, 10, 10, 10])

    def test_available_actions_exposes_the_forecast(self) -> None:
        engine = CombatEngine()
        state = self._state(6, 1)

        actions = engine.available_actions(state)

        self.assertEqual(actions["flee"]["chance"], 65)
        self.assertEqual(actions["flee"]["adjacent"], 1)

    def test_party_members_get_no_forecast_because_they_cannot_flee(self) -> None:
        # Only the player can break off; an ally advertising odds would be a lie.
        engine = CombatEngine()
        state = self._state(6, 1)
        ally = Combatant(
            id="han", name="한", faction="ally", hp=10, max_hp=10, x=8, y=8,
            stats={"agility": 6},
        )

        self.assertEqual(engine._flee_preview(state, ally), {})


class TwoPathsMustAgreeTest(unittest.TestCase):
    """Preview/validation paths that had drifted from the resolution they mirror."""

    def test_buffed_move_reaches_the_tiles_the_client_was_offered(self) -> None:
        engine = CombatEngine()
        state = engine.start([_player(x=0, y=0)], [_drone(x=7, y=0, hp=20)], seed="buff", arena=(10, 4))
        player = state.player()
        assert player is not None
        player.speed_buff = 2
        player.speed_buff_turns = 2
        far = (player.speed + 2, 0)
        self.assertIn(list(far), [list(t) for t in engine.available_actions(state)["reachable"]])
        state = engine.take_player_turn(state, PlayerAction(type="defend", move_to=far))
        moved = state.player()
        assert moved is not None
        self.assertEqual((moved.x, moved.y), far)

    def test_attack_cannot_target_an_ally(self) -> None:
        engine = CombatEngine()
        state = engine.start(
            [_player(x=0, y=0), _ally("han", x=1, y=0)], [_drone(x=6, y=0, hp=20)], seed="ff", arena=(8, 4)
        )
        han = state.by_id("han")
        assert han is not None
        before = han.hp
        state = engine.take_player_turn(state, PlayerAction(type="attack", target_id="han"))
        after = state.by_id("han")
        assert after is not None
        self.assertEqual(after.hp, before)
        player_strikes = [
            e for e in state.log if e.actor == "player" and e.action in ("hit", "miss", "defeat")
        ]
        self.assertEqual(player_strikes, [])

    def test_attack_preview_applies_corrode_like_the_attack_does(self) -> None:
        engine = CombatEngine()
        state = engine.start([_player(x=0, y=0)], [_drone(x=1, y=0, hp=20, armor=3)], seed="cor", arena=(6, 4))
        player = state.player()
        enemy = state.living_enemies()[0]
        assert player is not None
        plain = engine._attack_preview(state, player, enemy)
        enemy.status_effects["corrode"] = 2
        corroded = engine._attack_preview(state, player, enemy)
        self.assertEqual(corroded["damage_min"], plain["damage_min"] + 2)
        self.assertEqual(corroded["damage_max"], plain["damage_max"] + 2)

    def test_telegraph_kill_is_logged_as_a_defeat(self) -> None:
        engine = CombatEngine()
        state = engine.start([_player(x=0, y=0)], [_drone(x=3, y=0, hp=20)], seed="tele", arena=(6, 4))
        enemy = state.living_enemies()[0]
        player = state.player()
        assert player is not None
        player.hp = 1
        state.telegraphs.append(
            {"caster": enemy.id, "name": "낙하 타격", "tiles": [[0, 0]], "damage": "1d4"}
        )
        engine._resolve_telegraphs(state, enemy)
        self.assertFalse(state.player().alive)  # type: ignore[union-attr]
        kills = [e for e in state.log if e.detail.get("telegraph")]
        self.assertEqual([e.action for e in kills], ["defeat"])

    def test_intent_preview_honours_control_effects(self) -> None:
        engine = CombatEngine()
        state = engine.start([_player(x=0, y=0)], [_drone(x=2, y=0)], seed="cc", arena=(8, 6))
        enemy = state.living_enemies()[0]
        enemy.stunned_turns = 1
        engine.available_actions(state)
        self.assertEqual(state.enemy_intents[0].action, "idle")

        enemy.stunned_turns = 0
        enemy.status_effects["hacked"] = 1
        engine.available_actions(state)
        self.assertEqual(state.enemy_intents[0].action, "idle")

        # Frozen: cannot move, can still strike if already in reach.
        del enemy.status_effects["hacked"]
        enemy.status_effects["freeze"] = 1
        engine.available_actions(state)
        far = state.enemy_intents[0]
        self.assertEqual(far.action, "move")
        self.assertEqual((far.target_x, far.target_y), (enemy.x, enemy.y))

