from __future__ import annotations

import unittest
from contextlib import contextmanager
from datetime import UTC, datetime

from mythos_combat import CombatEngine, PlayerAction
from mythos_combat.models import distance
from mythos_core import Choice, LoopPhase, LoopState, PlayerProfile, Scene
from mythos_memory.store import MythOSStore
from mythos_narrative import ScenePayload, WorldDelta
from mythos_runtime.combat_service import CombatService
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.session import RuntimeSessionService


class _InMemoryStore(MythOSStore):
    """Self-contained store covering the surface combat turns touch."""

    def __init__(self) -> None:
        self.players: dict[str, PlayerProfile] = {}
        self.loops: dict[str, LoopState] = {}
        self.scenes: dict[str, list] = {}
        self.events: list = []
        self.player_memories: list = []

    # players
    def create_player(self, player) -> None:
        self.players[player.player_id] = player

    def get_player(self, player_id):
        return self.players.get(player_id)

    def list_players(self) -> list:
        return list(self.players.values())

    # loops
    def save_loop(self, loop) -> None:
        self.loops[loop.loop_id] = loop

    def get_loop(self, loop_id):
        return self.loops.get(loop_id)

    def list_loops(self, player_id) -> list:
        return [loop for loop in self.loops.values() if loop.player_id == player_id]

    # scenes
    def save_scene(self, scene) -> None:
        self.scenes.setdefault(scene.loop_id, []).append(scene)

    def get_latest_scene(self, loop_id):
        scenes = self.scenes.get(loop_id, [])
        return scenes[-1] if scenes else None

    def get_scene_by_turn(self, loop_id, turn_index):
        for scene in self.scenes.get(loop_id, []):
            if scene.turn_index == turn_index:
                return scene
        return None

    # events / memories
    def append_event(self, event) -> None:
        self.events.append(event)

    def list_events(self, loop_id) -> list:
        return [e for e in self.events if e.loop_id == loop_id]

    def save_player_memory(self, memory) -> None:
        self.player_memories.append(memory)

    def list_player_memories(self, player_id) -> list:
        return [m for m in self.player_memories if m.player_id == player_id]

    # unused-by-combat surface
    def save_world_memory(self, memory) -> None:
        pass

    def list_world_memories(self, world_id) -> list:
        return []

    def save_narrative_shard(self, shard) -> None:
        pass

    def list_narrative_shards(self, player_id, limit=8) -> list:
        return []

    def list_assets(self, loop_id) -> list:
        return []

    def save_asset(self, asset) -> None:
        pass

    def transaction(self):
        @contextmanager
        def _txn():
            yield

        return _txn()


def _seed_loop(store: _InMemoryStore, player_id: str, archetype: str) -> str:
    now = datetime(2026, 5, 31, tzinfo=UTC)
    store.create_player(
        PlayerProfile(
            player_id=player_id,
            display_name="당신",
            created_at=now,
            updated_at=now,
            traits={
                "archetype": archetype,
                "stats": {"strength": 9, "agility": 8, "perception": 6},
            },
        )
    )
    loop = LoopState(
        loop_id=f"loop_{player_id}",
        player_id=player_id,
        seed=f"seed_{player_id}",
        phase=LoopPhase.EXPLORE,
        location_id="loc",
        stability=70,
        tension=20,
        started_at=now,
        state={},
    )
    store.save_loop(loop)
    return loop.loop_id


class SessionCombatTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.service = RuntimeSessionService(self.store, director=None)
        self.options = RuntimeOptions(fallback=True)
        self.loop_id = _seed_loop(self.store, "p1", "비접속자 (Ghost)")

    def _auto(self, loop) -> PlayerAction:
        state = CombatService.load_state(loop)
        assert state is not None
        player = state.player()
        assert player is not None
        target = min(state.living_enemies(), key=lambda e: distance(player.x, player.y, e.x, e.y))
        engine = CombatEngine()
        actions = engine.available_actions(state)
        best, best_d = None, distance(player.x, player.y, target.x, target.y)
        for tx, ty in actions["reachable"]:
            d = distance(tx, ty, target.x, target.y)
            if d < best_d:
                best_d, best = d, (tx, ty)
        return PlayerAction(type="attack", target_id=target.id, move_to=best)

    def test_start_combat_creates_combat_scene(self) -> None:
        snap = self.service.start_combat(self.loop_id, "patrol_ambush", self.options)
        self.assertEqual(snap.scene.scene_type, "combat")
        assert snap.combat is not None
        self.assertFalse(snap.combat["finished"])
        self.assertEqual(len(snap.combat["radar"]["blips"]), 3)
        stored = self.store.get_loop(self.loop_id)
        assert stored is not None
        self.assertTrue(CombatService.is_active(stored))

    def test_resume_restores_active_combat_payload(self) -> None:
        started = self.service.start_combat(self.loop_id, "patrol_ambush", self.options)
        resumed = self.service.resume(loop_id=started.loop.loop_id, options=self.options)

        assert resumed.combat is not None
        self.assertFalse(resumed.combat["finished"])
        self.assertEqual(resumed.combat["radar"]["encounter_id"], "patrol_ambush")

    def test_scene_world_delta_can_trigger_combat(self) -> None:
        player = self.store.get_player("p1")
        loop = self.store.get_loop(self.loop_id)
        assert player is not None
        assert loop is not None
        scene = Scene(
            scene_id="scene_trigger",
            loop_id=loop.loop_id,
            turn_index=0,
            title="Drone Warning",
            location="loc",
            narration="A patrol locks onto the signal.",
            choices=[Choice("c1", "Brace", "fight")],
            visual_brief="A patrol drone in a narrow alley.",
            created_at=datetime(2026, 5, 31, tzinfo=UTC),
        )
        payload = ScenePayload(
            title=scene.title,
            location=scene.location,
            narration=scene.narration,
            choices=scene.choices,
            visual_brief=scene.visual_brief or "",
            world_delta=WorldDelta(start_combat="patrol_ambush"),
        )

        snap = self.service._commit_scene(
            player=player,
            loop=loop,
            scene=scene,
            payload=payload,
            options=self.options,
            span_name="test",
            log_message="test",
        )

        self.assertEqual(snap.scene.scene_type, "combat")
        assert snap.combat is not None
        self.assertEqual(snap.combat["radar"]["encounter_id"], "patrol_ambush")

    def test_combat_action_requires_active_combat(self) -> None:
        with self.assertRaises(RuntimeError):
            self.service.combat_action(self.loop_id, PlayerAction(type="defend"), self.options)

    def test_full_combat_resolves_and_persists(self) -> None:
        snap = self.service.start_combat(self.loop_id, "patrol_ambush", self.options)
        guard = 0
        while snap.combat and not snap.combat["finished"] and guard < 120:
            guard += 1
            snap = self.service.combat_action(self.loop_id, self._auto(snap.loop), self.options)
        assert snap.combat is not None
        self.assertTrue(snap.combat["finished"])
        self.assertIn(snap.combat["outcome"], {"player_victory", "player_defeat", "player_fled"})
        self.assertFalse(CombatService.is_active(snap.loop))

    def test_defeat_triggers_permadeath(self) -> None:
        loop_id = _seed_loop(self.store, "p2", "잔향 수집가 (Collector)")
        # Override to a fragile combatant so defeat is plausible against the enforcer.
        weak = self.store.get_player("p2")
        assert weak is not None
        self.store.create_player(
            type(weak)(
                player_id=weak.player_id,
                display_name=weak.display_name,
                created_at=weak.created_at,
                updated_at=weak.updated_at,
                traits={"archetype": "잔향 수집가 (Collector)", "stats": {"strength": 1, "agility": 1}},
            )
        )
        snap = self.service.start_combat(loop_id, "enforcer_standoff", self.options)
        guard = 0
        while snap.combat and not snap.combat["finished"] and guard < 200:
            guard += 1
            snap = self.service.combat_action(loop_id, PlayerAction(type="defend"), self.options)
        assert snap.combat is not None
        self.assertTrue(snap.combat["finished"])
        if snap.combat["outcome"] == "player_defeat":
            self.assertIs(snap.loop.phase, LoopPhase.ENDED)
            self.assertIsNotNone(snap.echo)


if __name__ == "__main__":
    unittest.main()
