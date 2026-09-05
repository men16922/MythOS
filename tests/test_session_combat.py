from __future__ import annotations

import unittest
from contextlib import contextmanager
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any, cast
from unittest import mock

from mythos_combat import CombatEngine, PlayerAction
from mythos_combat.models import distance
from mythos_core import Choice, LoopPhase, LoopState, PlayerProfile, Scene
from mythos_memory.store import MythOSStore
from mythos_narrative import ScenePayload, WorldDelta
from mythos_runtime.combat_service import CombatService, CombatTurnResult
from mythos_runtime.encounter_map import ENCOUNTER_MAP_KEY
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.progression import load_progression
from mythos_runtime.scenario import load_scenario
from mythos_runtime.session import RuntimeSessionService, _recent_novelty_scenes


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

    def delete_player_memories(self, player_id, memory_ids) -> int:
        ids = set(memory_ids)
        before = len(self.player_memories)
        self.player_memories = [
            m for m in self.player_memories if not (m.player_id == player_id and m.memory_id in ids)
        ]
        return before - len(self.player_memories)

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

    def summarize_loop(self, events, *, use_llm=True, language="ko"):
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

    def test_novelty_window_keeps_active_story_sequence_once(self) -> None:
        now = datetime(2026, 5, 31, tzinfo=UTC)
        for index, scene_type in enumerate(("static", "combat", "static", "static")):
            self.store.save_scene(
                Scene(
                    scene_id=f"scene_novelty_{index}",
                    loop_id=self.loop_id,
                    turn_index=index,
                    title=f"Scene {index}",
                    location=f"loc-{index}",
                    narration=f"Narration {index}",
                    choices=[Choice(f"choice_{index}", "Continue", "explore")],
                    visual_brief="A route.",
                    created_at=now,
                    scene_type=scene_type,
                )
            )

        scenes = _recent_novelty_scenes(
            self.store,
            self.store.list_loops("p1"),
            active_loop_id=self.loop_id,
        )

        self.assertEqual([scene.turn_index for scene in scenes], [0, 2, 3])
        self.assertEqual(len({scene.scene_id for scene in scenes}), len(scenes))

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

    def test_route_boss_node_fires_climax_even_under_pacing_gate(self) -> None:
        # Entering the authored boss route node must launch ``ix_confrontation``
        # even when the ambient pacing gate would otherwise suppress it: risk 5
        # exceeds the max risk cap (4), and here the player also just fought
        # (cooldown active) with low tension. Ambient combat would be dropped;
        # a deliberate route-node climax must not be. Regression for the
        # "Confront IX gets stuck, never enters the boss fight" bug.
        from mythos_runtime.route_map import ROUTE_MAP_KEY, build_route_map
        from mythos_runtime.route_runtime import DEFAULT_TURNS_PER_LAYER
        from mythos_runtime.scenario import load_scenario

        player = self.store.get_player("p1")
        loop = self.store.get_loop(self.loop_id)
        assert player is not None
        assert loop is not None
        scenario = load_scenario(self.options.scenario_id)
        route_map = build_route_map(scenario.route_map, loop.seed)
        assert route_map is not None
        layers = route_map["layers"]
        boss_node_id = layers[-1][0]
        self.assertEqual(route_map["nodes"][boss_node_id].get("type"), "boss")
        final_turn = DEFAULT_TURNS_PER_LAYER * len(layers) + 2
        # Cooldown active + low tension + zero prior wins → the gate would drop
        # or downgrade an ambient encounter of this risk.
        loop = replace(
            loop,
            tension=20,
            state={
                ROUTE_MAP_KEY: route_map,
                "flags": [],
                "scenario_id": self.options.scenario_id,
                "_combat_count": 0,
                "_last_combat_turn": final_turn - 1,
            },
        )
        scene = Scene(
            scene_id="scene_confront_ix",
            loop_id=loop.loop_id,
            turn_index=final_turn,
            title="Confront IX",
            location="ARK Core",
            narration="The core opens. Administrator IX turns to face the signal.",
            choices=[Choice("c1", "Stand", "resolve")],
            visual_brief="A vast optimization altar.",
            created_at=datetime(2026, 5, 31, tzinfo=UTC),
        )
        # A coinciding LLM-requested ambient fight on the boss-entry turn must
        # NOT steal precedence: the authored boss node wins (regression for the
        # precedence-drop where route_combat is only recomputed on node entry,
        # so a parked climax node would otherwise never fire again).
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

        # Arrival is a narrative buildup beat (confrontation scene with choices);
        # the climax is parked, never an ambush-by-UI on node entry.
        self.assertNotEqual(snap.scene.scene_type, "combat")
        self.assertEqual(snap.loop.state.get("_pending_boss_combat"), "ix_confrontation")

        # The player's next choice fires the parked climax — and it still wins
        # precedence over a coinciding ambient request.
        scene2 = replace(scene, scene_id="scene_confront_ix_2", turn_index=scene.turn_index + 1)
        snap2 = self.service._commit_scene(
            player=player,
            loop=snap.loop,
            scene=scene2,
            payload=payload,
            options=self.options,
            span_name="test",
            log_message="test",
        )
        self.assertEqual(snap2.scene.scene_type, "combat")
        assert snap2.combat is not None
        self.assertEqual(snap2.combat["radar"]["encounter_id"], "ix_confrontation")
        self.assertNotIn("_pending_boss_combat", snap2.loop.state)

    def test_route_boss_node_not_preempted_by_threshold_auto_archive(self) -> None:
        # Live 2026-07-03: entering the boss node on a turn whose tension crosses
        # the >=90 auto-archive threshold left the loop ARCHIVED while the climax
        # fight began — the boss outcome could then never resolve the ending. The
        # boss climax must keep the loop live so the fight resolves the run.
        from mythos_runtime.route_map import ROUTE_MAP_KEY, build_route_map
        from mythos_runtime.route_runtime import DEFAULT_TURNS_PER_LAYER
        from mythos_runtime.scenario import load_scenario

        player = self.store.get_player("p1")
        loop = self.store.get_loop(self.loop_id)
        assert player is not None
        assert loop is not None
        scenario = load_scenario(self.options.scenario_id)
        route_map = build_route_map(scenario.route_map, loop.seed)
        assert route_map is not None
        layers = route_map["layers"]
        boss_node_id = layers[-1][0]
        self.assertEqual(route_map["nodes"][boss_node_id].get("type"), "boss")
        final_turn = DEFAULT_TURNS_PER_LAYER * len(layers) + 2
        # Tension already near the ceiling: the boss-entry turn's world_delta pushes
        # it over the >=90 threshold, so the engine would auto-archive this turn.
        loop = replace(
            loop,
            tension=88,
            state={
                ROUTE_MAP_KEY: route_map,
                "flags": [],
                "scenario_id": self.options.scenario_id,
                "_combat_count": 0,
                "_last_combat_turn": final_turn - 1,
            },
        )
        scene = Scene(
            scene_id="scene_confront_ix_hot",
            loop_id=loop.loop_id,
            turn_index=final_turn,
            title="Confront IX",
            location="ARK Core",
            narration="The core opens. Administrator IX turns to face the signal.",
            choices=[Choice("c1", "Stand", "resolve")],
            visual_brief="A vast optimization altar.",
            created_at=datetime(2026, 5, 31, tzinfo=UTC),
        )
        payload = ScenePayload(
            title=scene.title,
            location=scene.location,
            narration=scene.narration,
            choices=scene.choices,
            visual_brief=scene.visual_brief or "",
            world_delta=WorldDelta(tension=5),
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

        # Arrival stays a live narrative buildup beat (climax parked)...
        self.assertNotEqual(snap.scene.scene_type, "combat")
        self.assertEqual(snap.loop.state.get("_pending_boss_combat"), "ix_confrontation")
        # ...and the loop is NOT prematurely archived by the coincident threshold:
        # it stays live (the parked fight's outcome will end the loop), no Echo minted.
        self.assertNotIn(snap.loop.phase, {LoopPhase.ARCHIVE, LoopPhase.ENDED})
        self.assertIsNone(snap.echo)
        self.assertEqual(snap.loop.active_echoes, [])

        # The next choice fires the parked climax, still keeping the loop live.
        scene2 = replace(scene, scene_id="scene_confront_ix_hot_2", turn_index=scene.turn_index + 1)
        snap2 = self.service._commit_scene(
            player=player,
            loop=snap.loop,
            scene=scene2,
            payload=payload,
            options=self.options,
            span_name="test",
            log_message="test",
        )
        self.assertEqual(snap2.scene.scene_type, "combat")
        assert snap2.combat is not None
        self.assertEqual(snap2.combat["radar"]["encounter_id"], "ix_confrontation")
        self.assertNotIn(snap2.loop.phase, {LoopPhase.ARCHIVE, LoopPhase.ENDED})

    def test_route_boss_climax_supersedes_stale_active_combat(self) -> None:
        # Live 2026-07-03 ROOT CAUSE (loop_99ac4fe6...): a turn-5 ``patrol_ambush``
        # was left ``_combat.active=true`` (never resolved to a finish), so
        # ``CombatService.is_active`` stayed True for the rest of the run and the
        # ``not is_active`` launch guard in ``_commit_scene`` silently skipped the
        # authored IX climax when the pointer reached the boss node — the fight never
        # fired and tension climbed unguarded to the auto-archive threshold. A
        # deliberate route-node climax must supersede a stale, mismatched active combat.
        from mythos_runtime.route_map import ROUTE_MAP_KEY, build_route_map
        from mythos_runtime.route_runtime import DEFAULT_TURNS_PER_LAYER
        from mythos_runtime.scenario import load_scenario

        player = self.store.get_player("p1")
        loop = self.store.get_loop(self.loop_id)
        assert player is not None
        assert loop is not None
        scenario = load_scenario(self.options.scenario_id)
        route_map = build_route_map(scenario.route_map, loop.seed)
        assert route_map is not None
        layers = route_map["layers"]
        boss_node_id = layers[-1][0]
        self.assertEqual(route_map["nodes"][boss_node_id].get("type"), "boss")
        final_turn = DEFAULT_TURNS_PER_LAYER * len(layers) + 2

        # Seed a real, unresolved ambient combat and transplant its live ``_combat``
        # (a zombie from an abandoned fight) onto the boss-entry loop state.
        self.service.start_combat(self.loop_id, "patrol_ambush", self.options)
        seeded = self.store.get_loop(self.loop_id)
        assert seeded is not None and isinstance(seeded.state, dict)
        stale_combat = seeded.state["_combat"]
        self.assertTrue(stale_combat.get("active"))
        self.assertNotEqual(stale_combat.get("encounter_id"), "ix_confrontation")

        loop = replace(
            loop,
            tension=20,
            state={
                ROUTE_MAP_KEY: route_map,
                "flags": [],
                "scenario_id": self.options.scenario_id,
                "_combat": stale_combat,
            },
        )
        self.assertTrue(CombatService.is_active(loop))
        scene = Scene(
            scene_id="scene_confront_ix_zombie",
            loop_id=loop.loop_id,
            turn_index=final_turn,
            title="Confront IX",
            location="ARK Core",
            narration="The core opens. Administrator IX turns to face the signal.",
            choices=[Choice("c1", "Stand", "resolve")],
            visual_brief="A vast optimization altar.",
            created_at=datetime(2026, 5, 31, tzinfo=UTC),
        )
        payload = ScenePayload(
            title=scene.title,
            location=scene.location,
            narration=scene.narration,
            choices=scene.choices,
            visual_brief=scene.visual_brief or "",
            world_delta=WorldDelta(),
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

        # Arrival parks the climax (buildup beat) even with a zombie combat around.
        self.assertNotEqual(snap.scene.scene_type, "combat")
        self.assertEqual(snap.loop.state.get("_pending_boss_combat"), "ix_confrontation")

        # On the next choice, the stale patrol combat is superseded and the IX
        # climax actually begins.
        scene2 = replace(scene, scene_id="scene_confront_ix_zombie_2", turn_index=scene.turn_index + 1)
        snap2 = self.service._commit_scene(
            player=player,
            loop=snap.loop,
            scene=scene2,
            payload=payload,
            options=self.options,
            span_name="test",
            log_message="test",
        )
        self.assertEqual(snap2.scene.scene_type, "combat")
        assert snap2.combat is not None
        self.assertEqual(snap2.combat["radar"]["encounter_id"], "ix_confrontation")

    def test_narrative_commit_applies_rest_recovery(self) -> None:
        # Quiet narrative turns heal carried combat damage a little (rest beat):
        # player and living members gain REST_RECOVERY_HP toward max, downed
        # members (hp<=0) stay down (their comeback is the quarter-HP rejoin or
        # a revive consumable, not free rest).
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        party = {
            "player_hp": 5,
            "player_max_hp": 13,
            "members": [
                {"id": "se_rin", "hp": 6, "max_hp": 14},
                {"id": "kai", "hp": 0, "max_hp": 15},
            ],
        }
        self.store.save_loop(replace(loop, state={**loop.state, "_party": party}))
        scene = Scene(
            scene_id="scene_rest",
            loop_id=self.loop_id,
            turn_index=0,
            title="Quiet Alley",
            location="loc",
            narration="A breath between patrols.",
            choices=[Choice("c1", "Move on", "explore")],
            visual_brief="",
            created_at=datetime(2026, 5, 31, tzinfo=UTC),
        )
        self.store.save_scene(scene)

        # Real director wiring (fallback path needs `fallback_scene`; no LLM call).
        service = RuntimeSessionService(self.store)
        snap = service.choose(self.loop_id, choice_id="c1", options=self.options)

        healed = snap.loop.state["_party"]
        self.assertEqual(healed["player_hp"], 7)
        members = {m["id"]: m for m in healed["members"]}
        self.assertEqual(members["se_rin"]["hp"], 8)
        self.assertEqual(members["kai"]["hp"], 0)

    def test_narrative_choice_during_active_combat_does_not_orphan(self) -> None:
        # Live 2026-07-03 upstream defect: a narrative ``choose`` accepted while a
        # combat is unresolved generated a story scene on top of it, orphaning
        # ``_combat.active=true`` (the zombie that later blocked the boss). A
        # narrative choice mid-combat must re-sync to the live fight, never advance
        # the story — combat turns go through ``combat_action``.
        started = self.service.start_combat(self.loop_id, "patrol_ambush", self.options)
        self.assertTrue(CombatService.is_active(started.loop))
        scenes_before = len(self.store.scenes.get(self.loop_id, []))

        snap = self.service.choose(self.loop_id, choice_id="c1", options=self.options)

        # Redirected to the live combat, not a freshly generated narrative scene.
        assert snap.combat is not None
        self.assertEqual(snap.scene.scene_type, "combat")
        # The combat stays active (not orphaned) and no story scene was appended.
        self.assertTrue(CombatService.is_active(snap.loop))
        self.assertEqual(len(self.store.scenes.get(self.loop_id, [])), scenes_before)

    def test_boss_climax_victory_ends_loop_with_ending(self) -> None:
        # A finished IX climax must resolve the run: victory ENDS the loop with a
        # perspective-driven ending instead of returning to a narrative turn (which
        # would leave the parked boss to re-throw combat every turn).
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        loop = replace(loop, state={**loop.state, "scenario_id": "neo-seoul"})
        player = self.store.get_player("p1")
        assert player is not None
        result = CombatTurnResult(
            loop=loop,
            prose="",
            radar={"encounter_id": "ix_confrontation", "round": 4},
            available={},
            finished=True,
            outcome="player_victory",
            rewards={"encounter_reward": {"insight": 3}},
        )
        snap = self.service._commit_combat_turn(player, result, "test", self.options)
        self.assertEqual(snap.loop.phase, LoopPhase.ENDED)
        self.assertTrue(snap.loop.state.get("ending_id"))
        self.assertTrue(snap.loop.state.get("ending_image"))

    def test_boss_victory_honors_perspective_flag_ending(self) -> None:
        # "Victory resolves the perspective-driven ending": the boss anchor's
        # perspective effect stamps flags (safe_refuge/code_rewrite/…) that must
        # outrank the numeric resolver.
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        loop = replace(
            loop,
            tension=100,
            state={**loop.state, "scenario_id": "neo-seoul", "flags": ["safe_refuge"]},
        )
        player = self.store.get_player("p1")
        assert player is not None
        result = CombatTurnResult(
            loop=loop,
            prose="",
            radar={"encounter_id": "ix_confrontation", "round": 4},
            available={},
            finished=True,
            outcome="player_victory",
            rewards={},
        )
        snap = self.service._commit_combat_turn(player, result, "test", self.options)
        self.assertEqual(snap.loop.state.get("ending_id"), "ending_safe_refuge")
        self.assertEqual(snap.loop.state.get("ending_image"), "endings/safe-refuge.png")

    def test_boss_victory_never_resolves_to_erasure_without_erased_flag(self) -> None:
        # Live 2026-07-04: a WON climax read as Forced Erasure — at the boss,
        # tension>=90 with no resilience flags satisfies the numeric erasure
        # condition. A victory without the authored 'erased' perspective must
        # fall back to a survival ending instead.
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        loop = replace(
            loop,
            tension=100,
            state={**loop.state, "scenario_id": "neo-seoul", "flags": []},
        )
        player = self.store.get_player("p1")
        assert player is not None
        result = CombatTurnResult(
            loop=loop,
            prose="",
            radar={"encounter_id": "ix_confrontation", "round": 4},
            available={},
            finished=True,
            outcome="player_victory",
            rewards={},
        )
        snap = self.service._commit_combat_turn(player, result, "test", self.options)
        self.assertEqual(snap.loop.phase, LoopPhase.ENDED)
        self.assertNotEqual(snap.loop.state.get("ending_id"), "ending_erasure")
        self.assertTrue(snap.loop.state.get("ending_id"))

    def test_boss_climax_defeat_ends_loop_not_recoverable(self) -> None:
        # Live 2026-07-03: an unwinnable IX fight soft-defeated every turn re-threw
        # the boss forever. Defeat at the climax must END the loop (erasure), never
        # a recoverable soft defeat.
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        loop = replace(loop, state={**loop.state, "scenario_id": "neo-seoul"})
        player = self.store.get_player("p1")
        assert player is not None
        result = CombatTurnResult(
            loop=loop,
            prose="",
            radar={"encounter_id": "ix_confrontation", "round": 4},
            available={},
            finished=True,
            outcome="player_defeat",
            rewards={},
        )
        snap = self.service._commit_combat_turn(player, result, "test", self.options)
        self.assertEqual(snap.loop.phase, LoopPhase.ENDED)
        self.assertTrue(snap.loop.state.get("ending_id"))
        self.assertEqual(snap.loop.state.get("ending_image"), "endings/forced-erasure.png")
        self.assertFalse(snap.loop.state.get("_soft_defeat_pending"))

    def test_boss_climax_flee_archives_forced_erasure_with_outcome(self) -> None:
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        loop = replace(
            loop,
            tension=96,
            state={
                **loop.state,
                "scenario_id": "neo-seoul",
                "_story_turn": 46,
                "flags": ["incinerator_rescued", "trusted_se_rin"],
            },
        )
        player = self.store.get_player("p1")
        assert player is not None
        result = CombatTurnResult(
            loop=loop,
            prose="Tester breaks off and escapes the battlefield.",
            radar={"encounter_id": "ix_confrontation", "round": 1},
            available={},
            finished=True,
            outcome="player_fled",
            rewards={},
        )

        snap = self.service._commit_combat_turn(player, result, "test", self.options)

        self.assertEqual(snap.loop.phase, LoopPhase.ENDED)
        self.assertEqual(snap.loop.state.get("ending_id"), "ending_erasure")
        self.assertEqual(snap.loop.state.get("_last_combat_story_turn"), 46)
        self.assertIn("모든 것이 하얗게", snap.loop.state.get("ending_narration", ""))

        summaries = self.service.list_run_summaries("p1")
        self.assertEqual(len(summaries), 1)
        summary = summaries[0]
        self.assertEqual(summary.ending_id, "ending_erasure")
        self.assertEqual(
            summary.ending_narration,
            snap.loop.state["ending_narration"],
        )
        self.assertEqual(
            summary.outcome["saved"],
            ["소각로에서 구출한 비식별 시민들"],
        )
        self.assertEqual(
            summary.outcome["lost"],
            ["이번 루프의 몸과 신호"],
        )
        self.assertEqual(
            summary.outcome["carried"],
            ["세린과 맺은 유대", "다음 루프를 여는 작은 글리치"],
        )
        # The climax ends the run here, not through archive() (which returns
        # early on an ENDED loop), so this path must write the same archive
        # bundle: loop_archive feeds the next loop's starting scores, the shard
        # feeds the codex. Neither used to be written for a combat-ended loop.
        from mythos_runtime.constants import MYTHOS_WORLD_ID

        archives = [
            m for m in self.store.list_world_memories(MYTHOS_WORLD_ID)
            if m.kind == "loop_archive" and m.content.get("loop_id") == loop.loop_id
        ]
        self.assertEqual(len(archives), 1)
        self.assertEqual(archives[0].content["stability"], snap.loop.stability)

    def test_ambient_combat_suppressed_during_soft_defeat_recovery(self) -> None:
        # After a soft defeat, an ambient LLM start_combat must be suppressed for a
        # few scenes regardless of tension, so a losing player gets a recovery beat
        # instead of being re-thrown into a fight (the death-spiral). Route-node
        # combat is unaffected (handled before this guard).
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        payload = ScenePayload(
            title="t", location="l", narration="n", choices=[],
            visual_brief="", world_delta=WorldDelta(start_combat="patrol_ambush"),
        )

        def _scene(turn: int) -> Scene:
            return Scene(
                scene_id=f"s{turn}", loop_id=loop.loop_id, turn_index=turn, title="t",
                location="l", narration="n", choices=[], visual_brief="",
                created_at=datetime(2026, 5, 31, tzinfo=UTC),
            )

        # Within the recovery window (turn 11, soft defeat at 10) → suppressed even
        # at ceiling tension, which would otherwise bypass the pacing cooldown.
        recovering = replace(
            loop, tension=95,
            state={**loop.state, "scenario_id": "neo-seoul", "_soft_defeat_turn": 10},
        )
        self.assertIsNone(
            self.service._resolve_next_combat(
                recovering, _scene(11), payload,
                route_combat=None, triggered_combat=None, options=self.options,
            )
        )
        # Without the soft-defeat marker the same ambient request is not suppressed.
        normal = replace(
            loop, tension=95,
            state={**loop.state, "scenario_id": "neo-seoul"},
        )
        self.assertEqual(
            self.service._resolve_next_combat(
                normal, _scene(11), payload,
                route_combat=None, triggered_combat=None, options=self.options,
            ),
            "patrol_ambush",
        )

    def test_combat_rounds_do_not_inflate_the_route_clock(self) -> None:
        # Live 2026-07-04 (loop_dbbd07cb…): combat rounds each consume a scene
        # turn_index, so pacing the route on the raw index let a few long fights
        # fast-forward target_layer — ~6 narrative scenes reached the IX boss with
        # 0 clues. The route clock must count only narrative commits (_story_turn).
        from mythos_runtime.route_map import ROUTE_MAP_KEY, build_route_map
        from mythos_runtime.scenario import load_scenario

        player = self.store.get_player("p1")
        loop = self.store.get_loop(self.loop_id)
        assert player is not None
        assert loop is not None
        scenario = load_scenario(self.options.scenario_id)
        route_map = build_route_map(scenario.route_map, loop.seed)
        assert route_map is not None
        start = route_map["current"]
        # Story turn 2 so far; scene.turn_index inflated to 25 by combat rounds.
        loop = replace(
            loop,
            state={
                ROUTE_MAP_KEY: route_map,
                "flags": [],
                "scenario_id": self.options.scenario_id,
                "_story_turn": 2,
            },
        )
        scene = Scene(
            scene_id="scene_after_long_fight",
            loop_id=loop.loop_id,
            turn_index=25,  # raw index inflated by many combat-round scenes
            title="Aftermath",
            location="Alley",
            narration="The drones fall silent.",
            choices=[Choice("c1", "Move", "go")],
            visual_brief="rain",
            created_at=datetime(2026, 5, 31, tzinfo=UTC),
        )
        payload = ScenePayload(
            title=scene.title, location=scene.location, narration=scene.narration,
            choices=scene.choices, visual_brief="", world_delta=WorldDelta(),
        )
        snap = self.service._commit_scene(
            player=player, loop=loop, scene=scene, payload=payload,
            options=self.options, span_name="test", log_message="test",
        )
        rm = snap.loop.state[ROUTE_MAP_KEY]
        # Story turn 3 → target layer 0: the pointer must NOT race to the boss.
        self.assertEqual(snap.loop.state["_story_turn"], 3)
        node = rm["nodes"][rm["current"]]
        self.assertEqual(int(node.get("layer", 99)), 0)
        self.assertNotEqual(node.get("type"), "boss")
        self.assertEqual(rm["current"], start)

    def test_defer_threshold_archive_respects_explicit_end_condition(self) -> None:
        # Author intent wins: an explicit LLM ``end_condition`` still ends the loop
        # even on the boss node — only the numeric threshold is deferred.
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        transition = self.service.engine.apply_scene_payload(
            replace(loop, phase=LoopPhase.EXPLORE, tension=95),
            Scene(
                scene_id="s", loop_id=loop.loop_id, turn_index=9, title="t",
                location="l", narration="n", choices=[], visual_brief="",
                created_at=datetime(2026, 5, 31, tzinfo=UTC),
            ),
            ScenePayload(
                title="t", location="l", narration="n", choices=[],
                visual_brief="", world_delta=WorldDelta(), end_condition="ended",
            ),
        )
        self.assertEqual(transition.loop.phase, LoopPhase.ARCHIVE)
        deferred = self.service._defer_threshold_archive_for_climax(
            transition,
            prior_phase=LoopPhase.EXPLORE,
            payload=ScenePayload(
                title="t", location="l", narration="n", choices=[],
                visual_brief="", world_delta=WorldDelta(), end_condition="ended",
            ),
        )
        self.assertEqual(deferred.loop.phase, LoopPhase.ARCHIVE)

    def _route_loop_at_start_node(self, *, tension: int, stability: int):
        """A loop parked on the (non-boss) start node with the boss far ahead."""
        from mythos_runtime.route_map import ROUTE_MAP_KEY, build_route_map
        from mythos_runtime.scenario import load_scenario

        player = self.store.get_player("p1")
        loop = self.store.get_loop(self.loop_id)
        assert player is not None
        assert loop is not None
        scenario = load_scenario(self.options.scenario_id)
        route_map = build_route_map(scenario.route_map, loop.seed)
        assert route_map is not None
        start_node_id = route_map["current"]
        # An early, non-boss node — the boss node is many layers ahead.
        self.assertNotEqual(route_map["nodes"][start_node_id].get("type"), "boss")
        loop = replace(
            loop,
            tension=tension,
            stability=stability,
            state={
                ROUTE_MAP_KEY: route_map,
                "flags": [],
                "scenario_id": self.options.scenario_id,
            },
        )
        return player, loop

    def _early_scene(self) -> Scene:
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        # turn_index 2 → target_layer 0, so the route stays on the start node
        # (boss still ahead) rather than advancing this turn.
        return Scene(
            scene_id="scene_mid_hot",
            loop_id=loop.loop_id,
            turn_index=2,
            title="Rooftop Sprint",
            location="Rooftops",
            narration="Sirens converge; the city's tension spikes.",
            choices=[Choice("c1", "Run", "flee")],
            visual_brief="Neon rooftops under drone floodlights.",
            created_at=datetime(2026, 5, 31, tzinfo=UTC),
        )

    def test_pre_boss_tension_threshold_deferred_until_boss_reached(self) -> None:
        # Climax reachability guard: DEFAULT_TURNS_PER_LAYER spaces the boss node
        # ~20 turns out, so a mid-run tension>=90 spike would auto-archive the loop
        # long before the IX climax and strand the golden path. While the boss node
        # is still ahead, a *tension*-only threshold archive is deferred so the
        # route can carry the player to the climax.
        player, loop = self._route_loop_at_start_node(tension=88, stability=60)
        scene = self._early_scene()
        payload = ScenePayload(
            title=scene.title,
            location=scene.location,
            narration=scene.narration,
            choices=scene.choices,
            visual_brief=scene.visual_brief or "",
            world_delta=WorldDelta(tension=5),  # 88 + 5 = 93 → would auto-archive
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

        # Tension crossed the threshold, but the loop stays live (no premature
        # archive, no Echo) so the golden path can still reach the IX climax.
        self.assertGreaterEqual(snap.loop.tension, 90)
        self.assertNotIn(snap.loop.phase, {LoopPhase.ARCHIVE, LoopPhase.ENDED})
        self.assertIsNone(snap.echo)
        self.assertEqual(snap.loop.active_echoes, [])

    def test_pre_boss_stability_collapse_deferred_until_boss_reached(self) -> None:
        # Live 2026-07-04 (loop_26adffc3): the LLM grinds ~-5 stability per scene,
        # so a pre-boss stability<=10 collapse is the COMMON case, not a rare
        # deliberate erasure — the run died at rn10, one node short of the boss,
        # with stability=3/tension=100. The pacing guard now defers the stability
        # threshold too while the boss node is ahead; the boss fight (victory ->
        # perspective ending, defeat -> erasure) owns the run's end.
        player, loop = self._route_loop_at_start_node(tension=100, stability=8)
        scene = self._early_scene()
        payload = ScenePayload(
            title=scene.title,
            location=scene.location,
            narration=scene.narration,
            choices=scene.choices,
            visual_brief=scene.visual_brief or "",
            world_delta=WorldDelta(stability=-5),  # 8 - 5 = 3 <= 10 → would archive
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

        # Stability collapsed through the threshold, but the loop stays live (no
        # premature archive, no Echo) so the route can carry the player to IX.
        self.assertLessEqual(snap.loop.stability, 10)
        self.assertNotIn(snap.loop.phase, {LoopPhase.ARCHIVE, LoopPhase.ENDED})
        self.assertIsNone(snap.echo)
        self.assertEqual(snap.loop.active_echoes, [])

    def test_defer_threshold_archive_before_climax_respects_explicit_end_condition(self) -> None:
        # Author intent wins pre-boss too: an explicit LLM ``end_condition`` still
        # ends the loop even while tension is over the threshold and the boss node
        # is ahead — only the bare numeric threshold is deferred.
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        transition = self.service.engine.apply_scene_payload(
            replace(loop, phase=LoopPhase.EXPLORE, tension=95, stability=60),
            Scene(
                scene_id="s", loop_id=loop.loop_id, turn_index=2, title="t",
                location="l", narration="n", choices=[], visual_brief="",
                created_at=datetime(2026, 5, 31, tzinfo=UTC),
            ),
            ScenePayload(
                title="t", location="l", narration="n", choices=[],
                visual_brief="", world_delta=WorldDelta(), end_condition="ended",
            ),
        )
        self.assertEqual(transition.loop.phase, LoopPhase.ARCHIVE)
        deferred = self.service._defer_threshold_archive_before_climax(
            transition,
            prior_phase=LoopPhase.EXPLORE,
            payload=ScenePayload(
                title="t", location="l", narration="n", choices=[],
                visual_brief="", world_delta=WorldDelta(), end_condition="ended",
            ),
        )
        self.assertEqual(deferred.loop.phase, LoopPhase.ARCHIVE)

    def test_resolve_next_combat_route_takes_precedence_over_ambient(self) -> None:
        # Unit-level guard on the extracted decision: authored route combat wins
        # over ambient (LLM start_combat / encounter-map contact); with no route
        # combat, the ambient candidate flows through the pacing gate.
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        scene = Scene(
            scene_id="s", loop_id=loop.loop_id, turn_index=9, title="t",
            location="l", narration="n", choices=[], visual_brief="",
            created_at=datetime(2026, 5, 31, tzinfo=UTC),
        )
        payload = ScenePayload(
            title="t", location="l", narration="n", choices=[],
            visual_brief="", world_delta=WorldDelta(start_combat="patrol_ambush"),
        )
        self.assertEqual(
            self.service._resolve_next_combat(
                loop, scene, payload, route_combat="ix_confrontation",
                triggered_combat="patrol_ambush", options=self.options,
            ),
            "ix_confrontation",
        )
        self.assertEqual(
            self.service._resolve_next_combat(
                loop, scene, payload, route_combat=None,
                triggered_combat=None, options=self.options,
            ),
            "patrol_ambush",
        )

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

        updated, _ = self.service._apply_combat_rewards(loop, result)

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

        updated, progress = self.service._apply_combat_rewards(loop, result)

        # The helper returns the advanced progression instead of committing it:
        # persistence happens inside the combat-turn transaction, next to the loop
        # state that records the reward, so a failed save cannot double-credit it.
        assert progress is not None
        self.assertEqual(progress.insight_points, 2)
        self.assertEqual(updated.state["meta_progression"]["insight_points"], 2)
        untouched = load_progression(self.store, updated.player_id, "neo-seoul")
        self.assertEqual(untouched.insight_points, 0)

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

    def test_equip_item_to_companion_folds_into_ally_not_player(self) -> None:
        # Companions wear gear too: equipped_by=<ally id> buffs the ALLY's
        # combat build (via _build_allies) and stays out of the player's stats.
        from mythos_core import Scene
        from mythos_runtime.scenario import load_scenario

        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        loop = replace(
            loop,
            state={
                **loop.state,
                "scenario_id": "neo-seoul",
                "_party": {"members": [{"id": "se_rin"}]},
                "_inventory": [{"id": "signal_blade"}],
            },
        )
        self.store.save_loop(loop)
        self.store.save_scene(
            Scene(
                scene_id="sc-w", loop_id=self.loop_id, turn_index=0, title="t",
                location="loc", narration="n", choices=[], visual_brief=None,
                created_at=datetime(2026, 5, 31, tzinfo=UTC),
            )
        )

        # Unknown wearer is rejected; a party member is accepted.
        with self.assertRaises(RuntimeError):
            self.service.equip_item(self.loop_id, "signal_blade", True, wearer="tae_o")
        self.service.equip_item(self.loop_id, "signal_blade", True, wearer="se_rin")
        entry = self.store.get_loop(self.loop_id).state["_inventory"][0]
        self.assertTrue(entry["equipped"])
        self.assertEqual(entry["equipped_by"], "se_rin")

        scenario = load_scenario("neo-seoul")
        player = self.store.get_player("p1")
        assert player is not None
        fresh = self.store.get_loop(self.loop_id)
        assert fresh is not None
        stats = self.service._player_combat_stats(player, fresh, scenario)
        self.assertEqual(stats["strength"], 9)  # player does NOT get the +2

        combat = CombatService()
        allies = combat._build_allies(fresh, scenario.combat)
        se_rin = next(a for a in allies if a.id == "se_rin")
        base_str = int(scenario.combat["allies"]["se_rin"].get("stats", {}).get("strength", 5))
        self.assertEqual(se_rin.stats.get("strength"), base_str + 2)

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

        updated, _ = self.service._apply_combat_rewards(loop, result)

        contact = updated.state[ENCOUNTER_MAP_KEY]["contacts"]["c1"]
        self.assertEqual(contact["state"], "alerted")
        self.assertEqual(contact["cooldown"], 1)
        self.assertEqual(updated.stability, 70)
        self.assertEqual(updated.tension, 20)

    def test_defeat_opens_soft_recovery_instead_of_permadeath(self) -> None:
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
            self.assertIs(snap.loop.phase, LoopPhase.EXPLORE)
            self.assertIsNone(snap.echo)
            self.assertTrue(snap.combat["defeat_soft"])
            self.assertTrue(snap.loop.state["_soft_defeat_pending"])
            self.assertEqual(snap.loop.state["_run"]["soft_defeats"], 1)
            self.assertFalse(snap.loop.state["_run"]["dead"])
            self.assertGreater(snap.loop.state["_party"]["player_hp"], 0)
            self.assertEqual(snap.loop.stability, 60)
            self.assertEqual(snap.loop.tension, 35)
            self.assertEqual(len(self.store.world_memories), 0)
            director = cast(Any, self.service.director)
            self.assertEqual(director.summary_calls, [])
            events = self.store.list_events(loop_id)
            self.assertTrue(any(event.action == "combat_defeat_soft" for event in events))

    def _gate_loop(self, **state: Any) -> LoopState:
        loop: LoopState | None = self.store.get_loop(self.loop_id)
        assert loop is not None
        return replace(loop, state=state)

    def _tier_one_encounters(self) -> dict[str, Any]:
        encounters = load_scenario(self.options.scenario_id).combat.get("encounters", {})
        return {
            eid: enc for eid, enc in encounters.items() if int(enc.get("risk", 1)) <= 1
        }

    def test_gate_caps_early_combat_difficulty(self) -> None:
        # First combat (combat_count=0) must stay tutorial-tier: an enforcer
        # (risk 4) is downgraded to a risk<=1 encounter so it cannot one-shot.
        loop = self._gate_loop(_combat_count=0)
        gated = self.service._gate_next_combat(loop, 4, "enforcer_standoff", self.options)
        self.assertIn(gated, self._tier_one_encounters())

    def test_gate_drops_an_encounter_the_scenario_does_not_define(self) -> None:
        # The plain-text parser synthesizes ``combat_default`` when prose mentions
        # a fight without an encounter id. Passing it through used to make
        # ``_begin_requested_combat`` raise after the scene transaction had
        # already committed — a 500 on a persisted turn.
        loop = self._gate_loop(_combat_count=3)
        for bogus in ("combat_default", "encounter_made_up_by_the_model"):
            with self.subTest(candidate=bogus):
                self.assertIsNone(self.service._gate_next_combat(loop, 6, bogus, self.options))

    def test_gate_never_reserves_the_encounter_just_fought(self) -> None:
        # The cap is keyed to combats *won*, so a player who keeps fleeing stays at
        # tier 1 — the downgrade used to return its single highest-weight entry
        # every time, serving the same fight, enemies and intro copy three times in
        # one arm (live 2026-08-01, recurring 2026-08-08).
        tier_one = self._tier_one_encounters()
        for last in tier_one:
            for turn in range(12):
                loop = self._gate_loop(_combat_count=0, _last_combat_encounter=last)
                gated = self.service._gate_next_combat(
                    loop, turn, "enforcer_standoff", self.options
                )
                self.assertNotEqual(gated, last)
                self.assertIn(gated, tier_one)

    def test_gate_first_combat_downgrade_varies(self) -> None:
        # The 2026-08-08 arm never won a fight, so it stayed on tier 1 for the whole
        # loop. Tier 1 now authors more than one encounter, so even the never-wins
        # path sees different fights.
        seen = {
            self.service._gate_next_combat(
                self._gate_loop(_combat_count=0), turn, "enforcer_standoff", self.options
            )
            for turn in range(20)
        }
        self.assertNotIn(None, seen)
        self.assertGreater(len(seen), 1, seen)

    def test_gate_skips_the_beat_when_the_tier_has_no_alternative(self) -> None:
        # Ambient combat is pacing, so when the only affordable encounter is the one
        # just fought the gate drops the beat instead of repeating it. Authored
        # content no longer reaches that state, so pin it against a one-encounter
        # roster rather than letting the behaviour go uncovered.
        scenario = load_scenario(self.options.scenario_id)
        solo = replace(
            scenario,
            combat={
                **scenario.combat,
                "encounters": {
                    eid: enc
                    for eid, enc in scenario.combat["encounters"].items()
                    if int(enc.get("risk", 1)) > 1 or eid == "patrol_ambush"
                },
            },
        )
        loop = self._gate_loop(_combat_count=0, _last_combat_encounter="patrol_ambush")
        with mock.patch("mythos_runtime.session.load_scenario", return_value=solo):
            self.assertIsNone(
                self.service._gate_next_combat(loop, 4, "enforcer_standoff", self.options)
            )

    def test_gate_downgrade_varies_within_the_allowed_tier(self) -> None:
        # With more than one affordable encounter the downgrade draws by weight
        # instead of always taking the highest-weight entry, so repeated downgrades
        # across a loop do not collapse onto a single fight.
        seen = {
            self.service._gate_next_combat(
                self._gate_loop(_combat_count=1), turn, "enforcer_standoff", self.options
            )
            for turn in range(20)
        }
        self.assertNotIn(None, seen)
        self.assertGreater(len(seen), 1, seen)

    def test_gate_downgrade_is_deterministic_for_a_turn(self) -> None:
        loop = self._gate_loop(_combat_count=1)
        first = self.service._gate_next_combat(loop, 7, "enforcer_standoff", self.options)
        again = self.service._gate_next_combat(loop, 7, "enforcer_standoff", self.options)
        self.assertEqual(first, again)

    def test_gate_allows_hard_combat_after_enough_wins(self) -> None:
        loop = self._gate_loop(_combat_count=3)
        gated = self.service._gate_next_combat(loop, 10, "enforcer_standoff", self.options)
        self.assertEqual(gated, "enforcer_standoff")

    def test_gate_suppresses_back_to_back_combat(self) -> None:
        # Raw scene turns can jump through a long combat, but only committed
        # narrative scenes advance the ambient-combat cooldown.
        loop = self._gate_loop(
            _combat_count=1,
            _last_combat_turn=4,
            _last_combat_story_turn=10,
            _story_turn=11,
            _last_combat_result="player_victory",
        )
        self.assertIsNone(
            self.service._gate_next_combat(loop, 40, "patrol_ambush", self.options)
        )
        # The third committed narrative scene opens the gate.
        cooled = replace(loop, state={**loop.state, "_story_turn": 13})
        self.assertEqual(
            self.service._gate_next_combat(cooled, 42, "patrol_ambush", self.options),
            "patrol_ambush",
        )

    def test_gate_high_pressure_overrides_cooldown(self) -> None:
        loop = replace(
            self._gate_loop(
                _combat_count=1,
                _last_combat_turn=4,
                _last_combat_story_turn=10,
                _story_turn=11,
                _last_combat_result="player_victory",
            ),
            tension=85,
        )
        self.assertEqual(
            self.service._gate_next_combat(loop, 5, "patrol_ambush", self.options),
            "patrol_ambush",
        )

    def test_gate_flee_cooldown_cannot_be_overridden_by_high_pressure(self) -> None:
        loop = replace(
            self._gate_loop(
                _combat_count=1,
                _last_combat_turn=40,
                _last_combat_story_turn=10,
                _story_turn=11,
                _last_combat_result="player_fled",
            ),
            tension=95,
        )
        self.assertIsNone(
            self.service._gate_next_combat(loop, 41, "patrol_ambush", self.options)
        )
        second_scene = replace(loop, state={**loop.state, "_story_turn": 12})
        self.assertIsNone(
            self.service._gate_next_combat(second_scene, 42, "patrol_ambush", self.options)
        )
        third_scene = replace(loop, state={**loop.state, "_story_turn": 13})
        self.assertEqual(
            self.service._gate_next_combat(third_scene, 43, "patrol_ambush", self.options),
            "patrol_ambush",
        )

    def test_gate_legacy_save_falls_back_to_raw_combat_turn(self) -> None:
        loop = self._gate_loop(_combat_count=1, _last_combat_turn=4)
        self.assertIsNone(
            self.service._gate_next_combat(loop, 6, "patrol_ambush", self.options)
        )

    def test_route_combat_bypasses_post_flee_ambient_cooldown(self) -> None:
        loop = replace(
            self._gate_loop(
                scenario_id="neo-seoul",
                _last_combat_story_turn=10,
                _story_turn=11,
                _last_combat_result="player_fled",
            ),
            tension=95,
        )
        scene = Scene(
            scene_id="route-combat",
            loop_id=loop.loop_id,
            turn_index=41,
            title="IX",
            location="hub",
            narration="The route reaches IX.",
            choices=[],
            visual_brief="",
            created_at=datetime(2026, 5, 31, tzinfo=UTC),
        )
        payload = ScenePayload(
            title=scene.title,
            location=scene.location,
            narration=scene.narration,
            choices=[],
            visual_brief="",
            world_delta=WorldDelta(start_combat="patrol_ambush"),
        )
        self.assertEqual(
            self.service._resolve_next_combat(
                loop,
                scene,
                payload,
                route_combat="ix_confrontation",
                triggered_combat=None,
                options=self.options,
            ),
            "ix_confrontation",
        )


class CombatScenarioContentTest(unittest.TestCase):
    def setUp(self) -> None:
        from mythos_runtime.scenario import load_scenario
        self.scenario = load_scenario("neo-seoul")

    def test_new_allies_and_bestiary_loaded(self) -> None:
        combat = self.scenario.combat
        self.assertIn("tae_o", combat["allies"])
        self.assertIn("han", combat["allies"])
        self.assertIn("su_ah", combat["allies"])
        
        self.assertIn("shock_trooper", combat["bestiary"])
        self.assertIn("tracker_spider", combat["bestiary"])
        self.assertIn("suppression_mech", combat["bestiary"])
        self.assertIn("purge_drone", combat["bestiary"])

    def test_new_skills_and_weapons_loaded(self) -> None:
        combat = self.scenario.combat
        for skill_id in [
            "emp_pulse", "nanoshield_projector", "glitch_blink",
            "signal_overdrive", "memory_resonance", "system_intrusion"
        ]:
            self.assertIn(skill_id, combat["skills"])
            
        for weapon_id in ["glitch_dagger", "emp_blaster", "heavy_carbine"]:
            self.assertIn(weapon_id, combat["weapons"])

    def test_new_items_and_encounters_loaded(self) -> None:
        combat = self.scenario.combat
        for item_id in [
            "emp_grenade", "heavy_exosuit", "stealth_cloak", "overload_stim"
        ]:
            self.assertIn(item_id, combat["items"])

        for encounter_id in [
            "shock_trooper_patrol", "tracker_ambush", "mech_siege", "purge_incineration"
        ]:
            self.assertIn(encounter_id, combat["encounters"])


if __name__ == "__main__":
    unittest.main()


class NarrativeReducerTest(unittest.TestCase):
    """``_advance_narrative_state`` is the pure middle of ``_commit_scene``: it
    reduces loop state from the engine's transition to the loop that gets
    saved, and must not write to the store (the transaction is the caller's)."""

    class _ReadOnlyStore(_InMemoryStore):
        def _refuse(self, *_a: Any, **_k: Any) -> None:
            raise AssertionError("the narrative reducer must not write to the store")

        save_loop = save_scene = append_event = save_narrative_shard = _refuse  # type: ignore[assignment]
        save_progression = save_world_memory = save_player_memory = _refuse  # type: ignore[assignment]

    def test_reducer_advances_state_without_writing(self) -> None:
        seeded = _InMemoryStore()
        loop_id = _seed_loop(seeded, "p9", "비접속자 (Ghost)")
        loop = seeded.get_loop(loop_id)
        assert loop is not None
        loop = replace(loop, state={**loop.state, "scenario_id": "neo-seoul", "_story_turn": 3})
        store = self._ReadOnlyStore()
        store.players = dict(seeded.players)  # players only; every write refuses
        service = RuntimeSessionService(store, director=cast(Any, _SummaryDirector()))
        now = datetime(2026, 9, 5, tzinfo=UTC)
        scene = Scene(
            scene_id="scene_r1", loop_id=loop_id, turn_index=4, title="Vent shaft",
            location="Drainage sluice", narration="Water hums below.",
            choices=[Choice("choice_1", "Push on", "explore")], visual_brief="", created_at=now,
        )
        payload = ScenePayload(
            title=scene.title, location=scene.location, narration=scene.narration,
            choices=list(scene.choices), visual_brief="",
            world_delta=WorldDelta(stability=-2, tension=3, flags=["clue_found"]),
        )
        transition = service.engine.apply_scene_payload(loop, scene, payload, None)
        self.assertTrue(transition.ok)

        advance = service._advance_narrative_state(
            transition=transition, loop=loop, scene=scene, payload=payload,
            options=RuntimeOptions(fallback=True), player_event=None, route_target=None,
            impact_base_loop=None, choice_relationship=None, cutscene_id=None,
        )

        state = advance.transition.loop.state
        self.assertEqual(advance.story_turn, 4)
        self.assertEqual(state["_story_turn"], 4)
        self.assertIn("clue_found", state["flags"])
        self.assertIsNone(advance.route_progress)
        self.assertIsNone(advance.route_combat)
        self.assertFalse(advance.offered_junction)
