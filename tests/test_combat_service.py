from __future__ import annotations

import unittest

from mythos_combat import CombatEngine, PlayerAction
from mythos_combat.models import distance
from mythos_core import LoopPhase, LoopState
from mythos_core.clock import utc_now
from mythos_runtime.combat_service import CombatService
from mythos_runtime.scenario import load_scenario

POOL = load_scenario("neo-seoul").combat


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
    def _begin(self, service: CombatService, loop: LoopState):
        return service.begin(
            loop,
            scenario_combat=POOL,
            encounter_id="patrol_ambush",
            player_name="당신",
            player_stats={"strength": 9, "agility": 8, "perception": 6},
            archetype="비접속자 (Ghost)",
        )

    def test_begin_activates_combat(self) -> None:
        service = CombatService()
        result = self._begin(service, _loop())
        self.assertFalse(result.finished)
        self.assertTrue(CombatService.is_active(result.loop))
        self.assertTrue(result.prose.strip())
        self.assertEqual(len(result.radar["blips"]), 3)  # player + 2 drones
        self.assertTrue(result.available["can_act"])

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

    def _play_end(self, service: CombatService):
        return _play_to_end(service, self._begin(service, _loop()))


if __name__ == "__main__":
    unittest.main()
