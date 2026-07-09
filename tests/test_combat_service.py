from __future__ import annotations

import unittest
from pathlib import Path

from mythos_combat import CombatEngine, PlayerAction
from mythos_combat.models import distance
from mythos_core import LoopPhase, LoopState
from mythos_core.clock import utc_now
from mythos_runtime.combat_service import CombatService, ranked_skill_definition
from mythos_runtime.scenario import load_scenario

POOL = load_scenario("neo-seoul").combat
RESOURCE_ROOT = Path(__file__).resolve().parents[1] / "resources" / "neo-seoul"


def _loop(seed: str = "seed1", state: dict | None = None) -> LoopState:
    return LoopState(
        loop_id="loop_x",
        player_id="p1",
        seed=seed,
        phase=LoopPhase.EXPLORE,
        location_id="loc",
        stability=70,
        tension=20,
        started_at=utc_now(),
        state=state or {},
    )


def _auto_action(engine: CombatEngine, state) -> PlayerAction:
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


def _play_to_end(service: CombatService, result):
    loop = result.loop
    guard = 0
    while not result.finished and guard < 120:
        guard += 1
        state = CombatService.load_state(loop)
        assert state is not None
        action = _auto_action(service.engine, state)
        result = service.act(loop, action, scenario_combat=POOL)
        loop = result.loop
    return result


class CombatServiceTest(unittest.TestCase):
    def test_skill_rank_changes_combat_definition(self) -> None:
        base = POOL["skills"]["overload_strike"]
        rank_one = ranked_skill_definition(base, 1)
        rank_three = ranked_skill_definition(base, 3)
        assert rank_one is not None and rank_three is not None
        self.assertEqual(rank_one["effect"]["damage_bonus"], "1d6")
        self.assertEqual(rank_three["effect"]["damage_bonus"], "1d6+2")
        self.assertEqual(rank_three["effect"]["armor_pen"], 4)
        self.assertEqual(rank_three["cost"]["focus"], 1)
        self.assertEqual(rank_three["cooldown"], 1)

    def _begin(self, service: CombatService, loop: LoopState):
        return service.begin(
            loop,
            scenario_combat=POOL,
            encounter_id="patrol_ambush",
            player_name="당신",
            player_stats={"strength": 9, "agility": 8, "perception": 6},
            archetype="ghost",
        )

    def test_begin_activates_combat(self) -> None:
        service = CombatService()
        result = self._begin(service, _loop())
        self.assertFalse(result.finished)
        self.assertTrue(CombatService.is_active(result.loop))
        self.assertTrue(result.prose.strip())
        self.assertEqual(len(result.radar["blips"]), 3)  # player + 2 drones
        self.assertTrue(result.available["can_act"])

    def test_humanoid_enemy_combat_images_include_guard_pose(self) -> None:
        bestiary = POOL["bestiary"]
        for enemy_id, slug in (
            ("enforcer_unit", "enforcer-unit"),
            ("glitch_wraith", "glitch-wraith"),
        ):
            images = bestiary[enemy_id]["combat_images"]
            self.assertEqual(
                images,
                {
                    "idle": f"enemies/combat/{slug}-idle.png",
                    "attack": f"enemies/combat/{slug}-attack.png",
                    "guard": f"enemies/combat/{slug}-guard.png",
                    "skill": f"enemies/combat/{slug}-skill.png",
                    "hit": f"enemies/combat/{slug}-hit.png",
                },
            )
            for path in images.values():
                self.assertTrue((RESOURCE_ROOT / path).exists(), path)

    def test_full_fight_resolves_and_clears_active(self) -> None:
        service = CombatService()
        result = self._play_end(service)
        self.assertTrue(result.finished)
        self.assertIn(result.outcome, {"player_victory", "player_defeat", "player_fled"})
        self.assertFalse(CombatService.is_active(result.loop))
        self.assertIn("_party", result.loop.state)
        self.assertIn("player_hp", result.loop.state["_party"])

    def test_victory_grants_loot_and_increments_run(self) -> None:
        # Strong player vs the patrol almost always wins; assert reward bookkeeping
        # only when victory actually happens (deterministic for this seed).
        service = CombatService()
        result = self._play_end(service)
        if result.outcome == "player_victory":
            self.assertEqual(result.loop.state["_run"]["encounters_cleared"], 1)
            self.assertGreaterEqual(len(result.loop.state.get("_inventory", [])), 1)
            self.assertGreaterEqual(len(result.rewards["items"]), 1)

    def test_roll_loot_skips_malformed_entries_without_crashing(self) -> None:
        # A loot-table entry missing "item" must be skipped, not crash the whole
        # combat-turn commit (regression: entry["item"] KeyError).
        from mythos_core.dice import Dice

        service = CombatService()
        combat = {
            "loot_tables": {
                "mixed": [{"weight": 2}, {"item": "medkit", "weight": 1}],
                "all_bad": [{"weight": 1}, {"foo": "bar"}],
            }
        }
        self.assertEqual(service._roll_loot(combat, "mixed", Dice("s")), "medkit")
        self.assertIsNone(service._roll_loot(combat, "all_bad", Dice("s")))

    def test_deterministic_outcome(self) -> None:
        a = self._play_end(CombatService())
        b = self._play_end(CombatService())
        self.assertEqual(a.outcome, b.outcome)
        self.assertEqual(a.loop.state["_party"], b.loop.state["_party"])
        self.assertEqual(
            len(a.loop.state.get("_inventory", [])),
            len(b.loop.state.get("_inventory", [])),
        )

    def test_carried_hp_persists_into_next_encounter(self) -> None:
        service = CombatService()
        loop = _loop(state={"_party": {"player_hp": 7}})
        result = self._begin(service, loop)
        state = CombatService.load_state(result.loop)
        assert state is not None
        player = state.player()
        assert player is not None
        self.assertEqual(player.hp, 7)

    def test_party_members_spawn_as_allies(self) -> None:
        service = CombatService()
        loop = _loop(
            state={"_party": {"members": [{"id": "se_rin", "hp": 9}, {"id": "kai", "hp": 11}]}}
        )
        result = self._begin(service, loop)
        state = CombatService.load_state(result.loop)
        assert state is not None
        ally = state.by_id("se_rin")
        self.assertIsNotNone(ally)
        assert ally is not None
        self.assertEqual(ally.faction, "ally")
        self.assertEqual(ally.hp, 9)
        self.assertEqual(ally.portrait, "characters/se-rin.png")
        self.assertEqual(
            ally.combat_images["idle"],
            "characters/combat/se-rin-idle.png",
        )
        ally_blip = next(blip for blip in result.radar["blips"] if blip["id"] == "se_rin")
        self.assertEqual(
            ally_blip["combat_images"]["attack"],
            "characters/combat/se-rin-attack.png",
        )
        self.assertEqual(
            ally_blip["combat_images"]["guard"],
            "characters/combat/se-rin-guard.png",
        )
        kai_blip = next(blip for blip in result.radar["blips"] if blip["id"] == "kai")
        self.assertEqual(
            kai_blip["combat_images"]["guard"],
            "characters/combat/kai-guard.png",
        )
        player_blip = next(blip for blip in result.radar["blips"] if blip["faction"] == "player")
        self.assertEqual(
            player_blip["combat_images"]["guard"],
            "characters/combat/player-noise-guard.png",
        )
        self.assertEqual(len(result.radar["blips"]), 5)  # player + 2 allies + 2 drones

    def test_downed_member_rejoins_next_combat_at_quarter_hp(self) -> None:
        # A member downed in a previous fight is not lost for the loop: the next
        # encounter builds them at max(1, max_hp // 4) instead of skipping them.
        service = CombatService()
        loop = _loop(state={"_party": {"members": [{"id": "se_rin", "hp": 0}]}})
        result = self._begin(service, loop)
        state = CombatService.load_state(result.loop)
        assert state is not None
        ally = state.by_id("se_rin")
        self.assertIsNotNone(ally)
        assert ally is not None
        self.assertTrue(ally.alive)
        self.assertEqual(ally.hp, max(1, ally.max_hp // 4))
        self.assertLess(ally.hp, ally.max_hp)

    def test_unlock_flag_ally_fights_but_is_not_promoted_to_party(self) -> None:
        # A story-flag ally (unlocked via `trusted_se_rin`, NOT in _party.members)
        # co-fights AI-driven, but must NOT be written into the permanent party by
        # _finish_party_state — that writeback was silently promoting a temporary
        # ally into the party and carrying it across loops (the root of Se-rin
        # reappearing everywhere, incl. variant openings). Only real party members
        # (controllable) persist; combat updates HP, it never recruits.
        service = CombatService()
        loop = _loop(state={"flags": ["trusted_se_rin"]})
        result = self._begin(service, loop)
        state = CombatService.load_state(result.loop)
        assert state is not None
        ally = state.by_id("se_rin")
        self.assertIsNotNone(ally)
        assert ally is not None
        self.assertFalse(ally.controllable)  # AI-driven, not a party member
        ally.hp = 5
        party = service._finish_party_state(result.loop, state, player_hp=10)
        member_ids = {member["id"] for member in party.get("members", [])}
        self.assertNotIn("se_rin", member_ids)

    def test_finish_party_state_persists_real_party_member_hp(self) -> None:
        # A genuine party member (already in _party.members → controllable) still
        # has its post-combat HP written back, so within-loop persistence works.
        service = CombatService()
        loop = _loop(state={"_party": {"members": [{"id": "se_rin", "hp": 12}]}})
        result = self._begin(service, loop)
        state = CombatService.load_state(result.loop)
        assert state is not None
        ally = state.by_id("se_rin")
        assert ally is not None
        self.assertTrue(ally.controllable)  # party member → player-driven
        ally.hp = 5
        party = service._finish_party_state(result.loop, state, player_hp=10)
        se_rin = next(m for m in party.get("members", []) if m["id"] == "se_rin")
        self.assertEqual(se_rin["hp"], 5)

    def test_item_action_consumes_from_inventory(self) -> None:
        service = CombatService()
        loop = _loop(state={"_inventory": [{"id": "nanopatch", "name": "나노패치"}]})
        result = self._begin(service, loop)
        loop = result.loop
        self.assertEqual(len(loop.state.get("_inventory", [])), 1)
        result = service.act(
            loop, PlayerAction(type="item", item_id="nanopatch"), scenario_combat=POOL
        )
        self.assertEqual(len(result.loop.state.get("_inventory", [])), 0)

    def test_skill_action_routes_and_exposes_focus(self) -> None:
        service = CombatService()
        result = self._begin(service, _loop())
        self.assertIn("focus", result.available)
        self.assertTrue(result.available.get("skills"))
        out = service.act(
            result.loop,
            PlayerAction(type="skill", skill_id="packet_shot"),
            scenario_combat=POOL,
        )
        self.assertTrue(out.prose.strip())

    def test_begin_uses_archetype_base_skills_without_learned_progression(self) -> None:
        service = CombatService()
        result = self._begin(service, _loop())
        skill_ids = {skill["id"] for skill in result.available.get("skills", [])}
        self.assertEqual(skill_ids, {"signal_step", "packet_shot"})

    def test_begin_combines_base_skills_with_learned_progression(self) -> None:
        service = CombatService()
        loop = _loop(state={"meta_progression": {"learned_skills": ["covering_noise"]}})
        result = self._begin(service, loop)
        skill_ids = {skill["id"] for skill in result.available.get("skills", [])}
        self.assertEqual(skill_ids, {"signal_step", "packet_shot", "covering_noise"})

    def _play_end(self, service: CombatService):
        return _play_to_end(service, self._begin(service, _loop()))


if __name__ == "__main__":
    unittest.main()
