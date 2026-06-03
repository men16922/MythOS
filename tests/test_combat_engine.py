from __future__ import annotations

import unittest

from mythos_combat import (
    CombatEngine,
    PlayerAction,
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
from mythos_combat.models import distance
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
    def test_initiative_and_start(self) -> None:
        engine = CombatEngine()
        state = engine.start([_player()], [_drone()], seed="s1", arena=(8, 6))
        self.assertTrue(state.active)
        self.assertEqual(len(state.order), 2)
        self.assertTrue(any(e.action == "start" for e in state.log))

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


class ScenarioPoolEncounterTest(unittest.TestCase):
    def test_neo_seoul_encounter_runs_from_pool(self) -> None:
        combat_pool = load_scenario("neo-seoul").combat
        self.assertIn("patrol_ambush", combat_pool["encounters"])
        weapon_ids = loadout_for_archetype(combat_pool, "비접속자 (Ghost)")
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


if __name__ == "__main__":
    unittest.main()
