from __future__ import annotations

import unittest
from contextlib import contextmanager
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any, cast

from mythos_combat import CombatEngine, PlayerAction
from mythos_combat.models import distance
from mythos_core import Choice, LoopPhase, LoopState, PlayerProfile, Scene
from mythos_memory.store import MythOSStore
from mythos_narrative import ScenePayload, WorldDelta
from mythos_runtime.combat_service import CombatService, CombatTurnResult
from mythos_runtime.encounter_map import ENCOUNTER_MAP_KEY
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.progression import load_progression
from mythos_runtime.session import RuntimeSessionService


class _InMemoryStore(MythOSStore):
    """Self-contained store covering the surface combat turns touch."""

    def __init__(self) -> None:
        self.players: dict[str, PlayerProfile] = {}
        self.loops: dict[str, LoopState] = {}
        self.scenes: dict[str, list] = {}
        self.events: list = []
        self.player_memories: list = []
        self.world_memories: list = []

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

    def list_scenes(self, loop_id: str) -> list:
        return self.scenes.get(loop_id, [])

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
        self.world_memories.append(memory)

    def list_world_memories(self, world_id) -> list:
        return [memory for memory in self.world_memories if memory.world_id == world_id]

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


class _SummaryDirector:
    def __init__(self):
        self.summary_calls = []

    def summarize_loop(self, events, *, use_llm=True):
        self.summary_calls.append(use_llm)
        return "전투 종료 기록."


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
        self.service = RuntimeSessionService(self.store, director=cast(Any, _SummaryDirector()))
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
        # Encounter learning-goal metadata is surfaced for the board banner.
        encounter_meta = snap.combat["encounter"]
        self.assertEqual(encounter_meta["id"], "patrol_ambush")
        self.assertTrue(encounter_meta["learning_goal"])
        stored = self.store.get_loop(self.loop_id)
        assert stored is not None
        self.assertTrue(CombatService.is_active(stored))

    def test_start_combat_can_override_party_members_for_simulation(self) -> None:
        snap = self.service.start_combat(
            self.loop_id,
            "patrol_ambush",
            self.options,
            party_members=[{"id": "se_rin"}],
        )

        assert snap.combat is not None
        blips = snap.combat["radar"]["blips"]
        se_rin = next(blip for blip in blips if blip["id"] == "se_rin")
        self.assertEqual(se_rin["faction"], "ally")
        stored = self.store.get_loop(self.loop_id)
        assert stored is not None
        members = stored.state.get("_party", {}).get("members", [])
        self.assertEqual(members[0]["id"], "se_rin")

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

    def test_scene_world_delta_null_string_does_not_trigger_combat(self) -> None:
        player = self.store.get_player("p1")
        loop = self.store.get_loop(self.loop_id)
        assert player is not None
        assert loop is not None
        scene = Scene(
            scene_id="scene_no_trigger",
            loop_id=loop.loop_id,
            turn_index=0,
            title="Quiet Corridor",
            location="loc",
            narration="No patrol answers.",
            choices=[Choice("c1", "Continue", "explore")],
            visual_brief="A quiet alley.",
            created_at=datetime(2026, 5, 31, tzinfo=UTC),
        )
        payload = ScenePayload(
            title=scene.title,
            location=scene.location,
            narration=scene.narration,
            choices=scene.choices,
            visual_brief=scene.visual_brief or "",
            world_delta=WorldDelta(start_combat="null", flags=["start_combat:none"]),
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

        self.assertIsNone(snap.combat)
        self.assertEqual(snap.scene.scene_id, "scene_no_trigger")

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

    def test_victory_rewards_mark_encounter_defeated(self) -> None:
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        loop = replace(
            loop,
            state={
                ENCOUNTER_MAP_KEY: {
                    "contacts": {
                        "c1": {
                            "id": "c1",
                            "encounter_id": "patrol_ambush",
                            "state": "engaged",
                        }
                    }
                }
            },
        )
        result = CombatTurnResult(
            loop=loop,
            prose="",
            radar={"encounter_id": "patrol_ambush"},
            available={},
            finished=True,
            outcome="player_victory",
            rewards={"encounter_reward": {"stability": 2, "tension": -1}},
        )

        updated = self.service._apply_combat_rewards(loop, result)

        contact = updated.state[ENCOUNTER_MAP_KEY]["contacts"]["c1"]
        self.assertEqual(contact["state"], "defeated")
        self.assertEqual(updated.stability, 72)
        self.assertEqual(updated.tension, 19)

    def test_victory_reward_insight_updates_meta_progression(self) -> None:
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        loop = replace(loop, state={**loop.state, "scenario_id": "neo-seoul"})
        result = CombatTurnResult(
            loop=loop,
            prose="",
            radar={"encounter_id": "wraith_glitch"},
            available={},
            finished=True,
            outcome="player_victory",
            rewards={"encounter_reward": {"insight": 2}},
        )

        updated = self.service._apply_combat_rewards(loop, result)

        # Progression now persists to the dedicated table (store.get_progression).
        progress = load_progression(self.store, updated.player_id, "neo-seoul")
        self.assertEqual(progress.insight_points, 2)
        self.assertEqual(updated.state["meta_progression"]["insight_points"], 2)

    def test_equip_item_toggles_and_applies_stat_bonus(self) -> None:
        from mythos_core import Scene
        from mythos_runtime.scenario import load_scenario

        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        loop = replace(
            loop,
            state={
                **loop.state,
                "scenario_id": "neo-seoul",
                "_inventory": [{"id": "signal_blade"}],
            },
        )
        self.store.save_loop(loop)
        self.store.save_scene(
            Scene(
                scene_id="sc",
                loop_id=self.loop_id,
                turn_index=0,
                title="t",
                location="loc",
                narration="n",
                choices=[],
                visual_brief=None,
                created_at=datetime(2026, 5, 31, tzinfo=UTC),
            )
        )

        self.service.equip_item(self.loop_id, "signal_blade", True)
        equipped = self.store.get_loop(self.loop_id).state["_inventory"][0]
        self.assertTrue(equipped["equipped"])

        scenario = load_scenario("neo-seoul")
        player = self.store.get_player("p1")
        stats = self.service._player_combat_stats(player, self.store.get_loop(self.loop_id), scenario)
        # signal_blade grants strength +2 over the base of 9.
        self.assertEqual(stats["strength"], 11)

    def test_flee_keeps_encounter_contact_alerted_without_rewards(self) -> None:
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        loop = replace(
            loop,
            state={
                ENCOUNTER_MAP_KEY: {
                    "contacts": {
                        "c1": {
                            "id": "c1",
                            "encounter_id": "patrol_ambush",
                            "state": "engaged",
                        }
                    }
                }
            },
        )
        result = CombatTurnResult(
            loop=loop,
            prose="",
            radar={"encounter_id": "patrol_ambush"},
            available={},
            finished=True,
            outcome="player_fled",
            rewards={"encounter_reward": {"stability": 2, "tension": -1}},
        )

        updated = self.service._apply_combat_rewards(loop, result)

        contact = updated.state[ENCOUNTER_MAP_KEY]["contacts"]["c1"]
        self.assertEqual(contact["state"], "alerted")
        self.assertEqual(contact["cooldown"], 1)
        self.assertEqual(updated.stability, 70)
        self.assertEqual(updated.tension, 20)

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
                traits={
                    "archetype": "잔향 수집가 (Collector)",
                    "stats": {"strength": 1, "agility": 1},
                },
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
            summaries = [
                memory for memory in self.store.world_memories if memory.kind == "run_summary"
            ]
            self.assertEqual(len(summaries), 1)
            self.assertEqual(summaries[0].content["loop_id"], loop_id)
            self.assertEqual(summaries[0].content["combats_lost"], 1)
            # In fallback/fast mode the loop-end summary must not call the LLM,
            # so combat defeat resolves instantly instead of blocking on Ollama.
            director = cast(Any, self.service.director)
            self.assertTrue(director.summary_calls)
            self.assertNotIn(True, director.summary_calls)

    def _gate_loop(self, **state: Any) -> LoopState:
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        return replace(loop, state=state)

    def test_gate_caps_early_combat_difficulty(self) -> None:
        # First combat (combat_count=0) must stay tutorial-tier: an enforcer
        # (risk 4) is downgraded to a risk<=1 encounter so it cannot one-shot.
        loop = self._gate_loop(_combat_count=0)
        gated = self.service._gate_next_combat(loop, 4, "enforcer_standoff", self.options)
        self.assertEqual(gated, "patrol_ambush")

    def test_gate_allows_hard_combat_after_enough_wins(self) -> None:
        loop = self._gate_loop(_combat_count=3)
        gated = self.service._gate_next_combat(loop, 10, "enforcer_standoff", self.options)
        self.assertEqual(gated, "enforcer_standoff")

    def test_gate_suppresses_back_to_back_combat(self) -> None:
        # A combat resolved on turn 4; a new one on turn 6 is within cooldown.
        loop = self._gate_loop(_combat_count=1, _last_combat_turn=4)
        self.assertIsNone(
            self.service._gate_next_combat(loop, 6, "patrol_ambush", self.options)
        )
        # Past the cooldown window it is allowed again.
        self.assertEqual(
            self.service._gate_next_combat(loop, 8, "patrol_ambush", self.options),
            "patrol_ambush",
        )

    def test_gate_high_pressure_overrides_cooldown(self) -> None:
        loop = replace(self._gate_loop(_combat_count=1, _last_combat_turn=4), tension=85)
        self.assertEqual(
            self.service._gate_next_combat(loop, 5, "patrol_ambush", self.options),
            "patrol_ambush",
        )


if __name__ == "__main__":
    unittest.main()
