import unittest
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any, cast

from mythos_core import (
    Choice,
    LoopPhase,
    LoopState,
    NarrativeShard,
    PlayerMemory,
    PlayerProfile,
    Scene,
    WorldEvent,
    WorldMemory,
)
from mythos_loop import create_world_event
from mythos_memory.store import MythOSStore
from mythos_runtime.narrative_rollup import (
    _archives_to_compact,
    _compact_player_archives,
    _merge_archive_rollup,
    _player_rollup,
    _prepare_narrative_memory_context,
)
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.session import (
    RuntimeSessionService,
    _has_archive_world_memory,
    _has_narrative_shard,
    _initial_loop_scores,
    _save_narrative_metric_memory,
)
from mythos_runtime.visual_orchestration import is_key_beat


def _loop(phase=LoopPhase.EXPLORE, stability=70, tension=20):
    return LoopState(
        loop_id="loop_kb",
        player_id="player_kb",
        seed="seed",
        phase=phase,
        location_id="loc",
        stability=stability,
        tension=tension,
        started_at=datetime(2026, 5, 30, tzinfo=UTC),
    )


def _scene(turn_index):
    return Scene(
        scene_id=f"scene_{turn_index}",
        loop_id="loop_kb",
        turn_index=turn_index,
        title="t",
        location="loc",
        narration="n",
        choices=[],
        visual_brief="b",
        created_at=datetime(2026, 5, 30, tzinfo=UTC),
    )


class KeyBeatTest(unittest.TestCase):
    def test_connect_turn_is_key_beat(self):
        self.assertTrue(is_key_beat(_loop(), _scene(0)))

    def test_quiet_mid_turn_is_not_key_beat(self):
        # turn 1, calm gauges, ordinary phase -> skip image
        self.assertFalse(is_key_beat(_loop(stability=70, tension=20), _scene(1)))

    def test_phase_shift_is_key_beat(self):
        self.assertTrue(is_key_beat(_loop(phase=LoopPhase.ARCHIVE), _scene(1)))

    def test_climax_tension_is_key_beat(self):
        self.assertTrue(is_key_beat(_loop(tension=85), _scene(1)))

    def test_low_stability_is_key_beat(self):
        self.assertTrue(is_key_beat(_loop(stability=20), _scene(2)))

    def test_periodic_refresh_every_third_turn(self):
        self.assertTrue(is_key_beat(_loop(), _scene(3)))
        self.assertFalse(is_key_beat(_loop(), _scene(4)))


def _archive_memory(loop_id, player_id, stability, tension, created, phase="ended"):
    return WorldMemory(
        memory_id=f"memory_{loop_id}",
        world_id="mythos-local",
        kind="loop_archive",
        content={
            "loop_id": loop_id,
            "player_id": player_id,
            "final_title": f"Title {loop_id}",
            "stability": stability,
            "tension": tension,
            "phase": phase,
        },
        weight=1.0,
        created_at=created,
        updated_at=created,
    )


class _FakeMemoryStore(MythOSStore):
    """Minimal store exposing only what memory_overview reads."""

    def __init__(self, player, loops, world_memories, shards, scenes) -> None:
        self._player = player
        self._loops = loops
        self._world_memories = world_memories
        self._shards = shards
        self._scenes = scenes

    def get_player(self, player_id):
        return self._player if self._player.player_id == player_id else None

    def list_loops(self, player_id):
        return [loop for loop in self._loops if loop.player_id == player_id]

    def list_world_memories(self, world_id):
        return list(self._world_memories)

    def list_narrative_shards(self, player_id, limit=8):
        return [shard for shard in self._shards if shard.player_id == player_id][:limit]

    def get_latest_scene(self, loop_id):
        return self._scenes.get(loop_id)

    def list_scenes(self, loop_id: str) -> list:
        val = self._scenes.get(loop_id)
        if isinstance(val, list):
            return val
        return [val] if val is not None else []

    def create_player(self, player) -> None:
        pass

    def list_players(self) -> list:
        return []

    def save_loop(self, loop) -> None:
        pass

    def get_loop(self, loop_id) -> None:
        return None

    def get_scene_by_turn(self, loop_id, turn_index) -> None:
        return None

    def save_scene(self, scene) -> None:
        pass

    def list_events(self, loop_id) -> list:
        return []

    def append_event(self, event) -> None:
        pass

    def save_player_memory(self, memory) -> None:
        pass

    def list_player_memories(self, player_id) -> list:
        return []

    def save_world_memory(self, memory) -> None:
        pass

    def save_narrative_shard(self, shard) -> None:
        pass

    def list_assets(self, loop_id) -> list:
        return []

    def save_asset(self, asset) -> None:
        pass

    def transaction(self):
        from contextlib import contextmanager

        @contextmanager
        def _txn():
            yield

        return _txn()


class RuntimeSessionTest(unittest.TestCase):
    def test_initial_loop_scores_default_without_archive_memories(self) -> None:
        scores = _initial_loop_scores([])

        self.assertEqual(scores.stability, 70)
        self.assertEqual(scores.tension, 20)
        self.assertEqual(scores.state, {})

    def test_initial_loop_scores_reflect_high_tension_archives(self) -> None:
        now = datetime(2026, 5, 30, tzinfo=UTC)
        memories = [
            WorldMemory(
                memory_id=f"memory_{index}",
                world_id="mythos-local",
                kind="loop_archive",
                content={
                    "loop_id": f"loop_{index}",
                    "stability": 30,
                    "tension": 82,
                },
                weight=1.0,
                created_at=now,
                updated_at=now,
            )
            for index in range(3)
        ]

        scores = _initial_loop_scores(memories)

        self.assertEqual(scores.stability, 57)
        self.assertEqual(scores.tension, 35)
        adjustment = scores.state["initial_world_memory_adjustment"]
        self.assertEqual(adjustment["sample_size"], 3)
        self.assertIn("recent_archives_high_tension", adjustment["reasons"])
        self.assertIn("recent_archives_low_stability", adjustment["reasons"])
        self.assertIn("archive_pressure", adjustment["reasons"])

    def test_initial_loop_scores_reflect_calm_stable_archives(self) -> None:
        now = datetime(2026, 5, 30, tzinfo=UTC)
        memories = [
            WorldMemory(
                memory_id="memory_1",
                world_id="mythos-local",
                kind="loop_archive",
                content={"loop_id": "loop_1", "stability": 84, "tension": 18},
                weight=1.0,
                created_at=now,
                updated_at=now,
            )
        ]

        scores = _initial_loop_scores(memories)

        self.assertEqual(scores.stability, 74)
        self.assertEqual(scores.tension, 17)
        adjustment = scores.state["initial_world_memory_adjustment"]
        self.assertIn("recent_archives_high_stability", adjustment["reasons"])
        self.assertIn("recent_archives_low_tension", adjustment["reasons"])

    def test_initial_loop_scores_can_filter_by_player(self) -> None:
        now = datetime(2026, 5, 30, tzinfo=UTC)
        memories = [
            WorldMemory(
                memory_id="memory_other",
                world_id="mythos-local",
                kind="loop_archive",
                content={
                    "loop_id": "loop_other",
                    "player_id": "player_other",
                    "stability": 10,
                    "tension": 95,
                },
                weight=1.0,
                created_at=now,
                updated_at=now,
            ),
            WorldMemory(
                memory_id="memory_target",
                world_id="mythos-local",
                kind="loop_archive",
                content={
                    "loop_id": "loop_target",
                    "player_id": "player_target",
                    "stability": 84,
                    "tension": 18,
                },
                weight=1.0,
                created_at=now,
                updated_at=now,
            ),
        ]

        scores = _initial_loop_scores(memories, player_id="player_target")

        self.assertEqual(scores.stability, 74)
        self.assertEqual(scores.tension, 17)

    def test_has_archive_world_memory_matches_loop_and_player(self) -> None:
        now = datetime(2026, 5, 30, tzinfo=UTC)
        memories = [
            WorldMemory(
                memory_id="memory_1",
                world_id="mythos-local",
                kind="loop_archive",
                content={
                    "loop_id": "loop_1",
                    "player_id": "player_1",
                    "stability": 70,
                    "tension": 20,
                },
                weight=1.0,
                created_at=now,
                updated_at=now,
            )
        ]

        self.assertTrue(_has_archive_world_memory(memories, loop_id="loop_1", player_id="player_1"))
        self.assertFalse(
            _has_archive_world_memory(memories, loop_id="loop_1", player_id="player_2")
        )

    def test_has_narrative_shard_matches_loop(self) -> None:
        now = datetime(2026, 5, 30, tzinfo=UTC)
        shards = [
            NarrativeShard(
                shard_id="shard_1",
                loop_id="loop_1",
                player_id="player_1",
                symbol="signal",
                emotional_tone="resolved",
                text="Signal archived.",
                weight=1.0,
                created_at=now,
            )
        ]

        self.assertTrue(_has_narrative_shard(shards, loop_id="loop_1"))
        self.assertFalse(_has_narrative_shard(shards, loop_id="loop_2"))


class MemoryOverviewTest(unittest.TestCase):
    def test_memory_overview_collects_player_scoped_memory(self) -> None:
        now = datetime(2026, 5, 30, tzinfo=UTC)
        player = PlayerProfile(
            player_id="player_1",
            display_name="Connector",
            created_at=now,
            updated_at=now,
        )
        loop = LoopState(
            loop_id="loop_1",
            player_id="player_1",
            seed="seed_1",
            phase=LoopPhase.EXPLORE,
            location_id="data-layer-01",
            stability=70,
            tension=20,
            started_at=now,
            state={
                "initial_world_memory_adjustment": {
                    "stability_delta": -5,
                    "tension_delta": 8,
                    "sample_size": 2,
                    "reasons": ["recent_archives_high_tension"],
                }
            },
        )
        world_memories = [
            WorldMemory(
                memory_id="memory_mine",
                world_id="mythos-local",
                kind="loop_archive",
                content={
                    "loop_id": "loop_0",
                    "player_id": "player_1",
                    "final_title": "C-17 정전 구역",
                    "stability": 60,
                    "tension": 40,
                    "phase": "ended",
                },
                weight=1.0,
                created_at=now,
                updated_at=now,
            ),
            WorldMemory(
                memory_id="memory_other",
                world_id="mythos-local",
                kind="loop_archive",
                content={
                    "loop_id": "loop_x",
                    "player_id": "player_other",
                    "final_title": "Other",
                    "stability": 10,
                    "tension": 90,
                    "phase": "ended",
                },
                weight=1.0,
                created_at=now,
                updated_at=now,
            ),
        ]
        shards = [
            NarrativeShard(
                shard_id="shard_1",
                loop_id="loop_0",
                player_id="player_1",
                symbol="signal",
                emotional_tone="resolved",
                text="Signal archived.",
                weight=1.0,
                created_at=now,
            )
        ]
        scene = Scene(
            scene_id="scene_1",
            loop_id="loop_1",
            turn_index=0,
            title="C-17 정전 구역",
            location="data-layer-01",
            narration="The gate opens.",
            choices=[],
            visual_brief="",
            created_at=now,
        )
        store = _FakeMemoryStore(
            player=player,
            loops=[loop],
            world_memories=world_memories,
            shards=shards,
            scenes={"loop_1": scene},
        )

        overview = RuntimeSessionService(store, director=None).memory_overview("player_1")

        self.assertEqual(len(overview.world_archives), 1)
        self.assertEqual(overview.world_archives[0].content["player_id"], "player_1")
        self.assertEqual(len(overview.narrative_shards), 1)
        self.assertTrue(
            any("Avoid reusing recent scene titles" in note for note in overview.novelty_notes)
        )
        assert overview.latest_adjustment is not None
        self.assertEqual(overview.latest_adjustment["tension_delta"], 8)


class _SummaryDirector:
    def summarize_loop(self, events):
        return f"요약된 접속 기록 {len(events)}건."

    def summarize_narrative_shards(self, shards, *, existing_summary=None, use_llm=True):
        prefix = f"{existing_summary} " if existing_summary else ""
        return f"{prefix}장기 shard {len(shards)}개 요약."


class _ArchiveStore(MythOSStore):
    def __init__(self) -> None:
        self.players: dict[str, PlayerProfile] = {}
        self.loops: dict[str, LoopState] = {}
        self.scenes: dict[str, list[Scene]] = {}
        self.events: list[WorldEvent] = []
        self.player_memories: list[PlayerMemory] = []
        self.world_memories: list[WorldMemory] = []
        self.shards: list[NarrativeShard] = []

    def create_player(self, player) -> None:
        self.players[player.player_id] = player

    def get_player(self, player_id):
        return self.players.get(player_id)

    def list_players(self) -> list:
        return list(self.players.values())

    def save_loop(self, loop) -> None:
        self.loops[loop.loop_id] = loop

    def get_loop(self, loop_id):
        return self.loops.get(loop_id)

    def list_loops(self, player_id) -> list:
        return [loop for loop in self.loops.values() if loop.player_id == player_id]

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

    def append_event(self, event) -> None:
        self.events.append(event)

    def list_events(self, loop_id) -> list:
        return [event for event in self.events if event.loop_id == loop_id]

    def save_player_memory(self, memory) -> None:
        self.player_memories.append(memory)

    def list_player_memories(self, player_id) -> list:
        return [memory for memory in self.player_memories if memory.player_id == player_id]

    def save_world_memory(self, memory) -> None:
        self.world_memories.append(memory)

    def list_world_memories(self, world_id) -> list:
        return [memory for memory in self.world_memories if memory.world_id == world_id]

    def save_narrative_shard(self, shard) -> None:
        self.shards.append(shard)

    def list_narrative_shards(self, player_id, limit=8) -> list:
        return [shard for shard in self.shards if shard.player_id == player_id][:limit]

    def list_assets(self, loop_id) -> list:
        return []

    def save_asset(self, asset) -> None:
        pass

    def transaction(self):
        from contextlib import contextmanager

        @contextmanager
        def _txn():
            yield

        return _txn()


class RunHistoryTest(unittest.TestCase):
    def test_archive_saves_and_lists_run_summary(self) -> None:
        now = datetime(2026, 6, 3, tzinfo=UTC)
        store = _ArchiveStore()
        store.create_player(
            PlayerProfile(
                player_id="player_1",
                display_name="Connector",
                created_at=now,
                updated_at=now,
            )
        )
        store.save_loop(
            LoopState(
                loop_id="loop_1",
                player_id="player_1",
                seed="seed_1",
                phase=LoopPhase.EXPLORE,
                location_id="catalog-hall",
                stability=63,
                tension=42,
                started_at=now,
                state={
                    "scenario_id": "glass-library",
                    "_party": {"members": [{"id": "io"}]},
                },
            )
        )
        store.save_scene(
            Scene(
                scene_id="scene_1",
                loop_id="loop_1",
                turn_index=4,
                title="깨진 목록실",
                location="catalog-hall",
                narration="기록의 먼지가 빛난다.",
                choices=[],
                visual_brief="",
                created_at=now,
            )
        )
        store.append_event(
            create_world_event(
                "loop_1",
                3,
                "combat_finished",
                "player_victory",
                {"combat_outcome": "player_victory"},
            )
        )
        store.save_narrative_shard(
            NarrativeShard(
                shard_id="shard_1",
                loop_id="loop_1",
                player_id="player_1",
                symbol="loan_card_0000",
                emotional_tone="mystery",
                text="첫 접속자의 대출 카드.",
                weight=1.0,
                created_at=now,
                kind="clue",
            )
        )

        service = RuntimeSessionService(store, director=cast(Any, _SummaryDirector()))
        service.archive("loop_1")

        summaries = service.list_run_summaries("player_1")

        self.assertEqual(len(summaries), 1)
        summary = summaries[0]
        self.assertEqual(summary.loop_id, "loop_1")
        self.assertEqual(summary.scenario_id, "glass-library")
        self.assertEqual(summary.final_title, "깨진 목록실")
        self.assertEqual(summary.turns, 5)
        self.assertEqual(summary.combats_won, 1)
        self.assertEqual(summary.clues_collected, ["loan_card_0000"])
        self.assertEqual(summary.allies_met, ["io"])
        self.assertIn("요약된 접속 기록", summary.summary_text)
        self.assertIn("unlocked_traits:loop_veteran", summary.unlocks_granted)

        overview = service.memory_overview("player_1")
        self.assertEqual([item.loop_id for item in overview.run_summaries], ["loop_1"])
        self.assertIsNotNone(overview.meta_progression)
        assert overview.meta_progression is not None
        self.assertEqual(overview.meta_progression["runs_completed"], 1)
        self.assertIn("loop_veteran", store.players["player_1"].traits["unlocked_traits"])

        next_loop = (
            RuntimeSessionService(store, director=None)
            .start_loop(
                "player_1",
                RuntimeOptions(fallback=True, scenario_id="glass-library"),
            )
            .loop
        )
        self.assertEqual(next_loop.state["meta_progression"]["runs_completed"], 1)
        inventory_ids = [item["id"] for item in next_loop.state["_inventory"]]
        self.assertIn("memory_slip", inventory_ids)

    def test_save_slots_include_only_active_loops_and_resume_latest_slot(self) -> None:
        now = datetime(2026, 6, 3, tzinfo=UTC)
        store = _ArchiveStore()
        store.create_player(
            PlayerProfile(
                player_id="player_1",
                display_name="Connector",
                created_at=now,
                updated_at=now,
            )
        )
        active_old = LoopState(
            loop_id="loop_old",
            player_id="player_1",
            seed="seed_old",
            phase=LoopPhase.EXPLORE,
            location_id="loc",
            stability=70,
            tension=20,
            started_at=now,
            state={"scenario_id": "neo-seoul"},
        )
        active_new = LoopState(
            loop_id="loop_new",
            player_id="player_1",
            seed="seed_new",
            phase=LoopPhase.INTERACT,
            location_id="loc",
            stability=65,
            tension=35,
            started_at=_at(now, 1),
            state={"scenario_id": "neo-seoul"},
        )
        ended = LoopState(
            loop_id="loop_ended",
            player_id="player_1",
            seed="seed_ended",
            phase=LoopPhase.ENDED,
            location_id="loc",
            stability=40,
            tension=80,
            started_at=_at(now, 2),
            ended_at=_at(now, 3),
            state={"scenario_id": "neo-seoul"},
        )
        for loop in (active_old, active_new, ended):
            store.save_loop(loop)
            store.save_scene(
                Scene(
                    scene_id=f"scene_{loop.loop_id}",
                    loop_id=loop.loop_id,
                    turn_index=2,
                    title=f"Scene {loop.loop_id}",
                    location="loc",
                    narration="n",
                    choices=[],
                    visual_brief="",
                    created_at=loop.started_at,
                )
            )
        service = RuntimeSessionService(store, director=None)
        service.save_slot("loop_old", label="Old")
        service.save_slot("loop_new", label="New")

        slots = service.list_save_slots("player_1")

        self.assertEqual([slot.loop_id for slot in slots], ["loop_new", "loop_old"])
        self.assertEqual(slots[0].label, "New")
        resumed = service.resume(player_id="player_1", options=RuntimeOptions(fallback=True))
        self.assertEqual(resumed.loop.loop_id, "loop_new")
        with self.assertRaises(RuntimeError):
            service.resume(loop_id="loop_ended")

    def test_resume_by_player_skips_loop_that_ended_after_save(self) -> None:
        # A save slot is created while the loop is active; the loop later ENDs.
        # Player-resume must skip the stale slot rather than 409 on an ended loop.
        now = datetime(2026, 6, 3, tzinfo=UTC)
        store = _ArchiveStore()
        store.create_player(
            PlayerProfile(
                player_id="player_1",
                display_name="Connector",
                created_at=now,
                updated_at=now,
            )
        )
        loop = LoopState(
            loop_id="loop_x",
            player_id="player_1",
            seed="seed_x",
            phase=LoopPhase.INTERACT,
            location_id="loc",
            stability=50,
            tension=40,
            started_at=now,
            state={"scenario_id": "neo-seoul"},
        )
        store.save_loop(loop)
        store.save_scene(
            Scene(
                scene_id="scene_x",
                loop_id="loop_x",
                turn_index=2,
                title="Scene",
                location="loc",
                narration="n",
                choices=[],
                visual_brief="",
                created_at=now,
            )
        )
        service = RuntimeSessionService(store, director=None)
        service.save_slot("loop_x", label="Mid-run")

        # The loop subsequently ends (archived to run history).
        store.save_loop(replace(loop, phase=LoopPhase.ENDED, ended_at=_at(now, 1)))

        with self.assertRaises(RuntimeError) as ctx:
            service.resume(player_id="player_1", options=RuntimeOptions(fallback=True))
        self.assertIn("no active loop", str(ctx.exception))


class _FakeCompactionStore(MythOSStore):
    """In-memory store covering the surface _compact_player_archives touches."""

    def __init__(self, world_memories, shards) -> None:
        self.world_memories = {memory.memory_id: memory for memory in world_memories}
        self.shards = list(shards)

    def list_world_memories(self, world_id):
        return list(self.world_memories.values())

    def list_narrative_shards(self, player_id, limit=8):
        return self.shards[:limit]

    def save_world_memory(self, memory):
        self.world_memories[memory.memory_id] = memory

    def create_player(self, player) -> None:
        pass

    def get_player(self, player_id) -> None:
        return None

    def list_players(self) -> list:
        return []

    def list_loops(self, player_id) -> list:
        return []

    def get_loop(self, loop_id) -> None:
        return None

    def save_loop(self, loop) -> None:
        pass

    def get_scene_by_turn(self, loop_id, turn_index) -> None:
        return None

    def get_latest_scene(self, loop_id) -> None:
        return None

    def list_scenes(self, loop_id: str) -> list:
        return []

    def save_scene(self, scene) -> None:
        pass

    def list_events(self, loop_id) -> list:
        return []

    def append_event(self, event) -> None:
        pass

    def save_player_memory(self, memory) -> None:
        pass

    def list_player_memories(self, player_id) -> list:
        return []

    def save_narrative_shard(self, shard) -> None:
        pass

    def list_assets(self, loop_id) -> list:
        return []

    def save_asset(self, asset) -> None:
        pass

    def transaction(self):
        from contextlib import contextmanager

        @contextmanager
        def _txn():
            yield

        return _txn()


class ArchiveRollupTest(unittest.TestCase):
    def setUp(self) -> None:
        self.now = datetime(2026, 5, 30, tzinfo=UTC)

    def test_archives_to_compact_keeps_retention_window(self) -> None:
        archives = [
            _archive_memory(f"loop_{i}", "player_1", 60, 40, _at(self.now, i)) for i in range(5)
        ]

        absorbed = _archives_to_compact(archives, retention=3)

        self.assertEqual([m.content["loop_id"] for m in absorbed], ["loop_0", "loop_1"])

    def test_merge_rollup_from_empty_uses_averages_and_histograms(self) -> None:
        absorbed = [
            _archive_memory("loop_0", "player_1", 60, 40, _at(self.now, 0)),
            _archive_memory("loop_1", "player_1", 80, 20, _at(self.now, 1)),
        ]
        shards = {
            "loop_0": NarrativeShard(
                shard_id="shard_0",
                loop_id="loop_0",
                player_id="player_1",
                symbol="signal",
                emotional_tone="fragile",
                text="t",
                weight=1.0,
                created_at=self.now,
            )
        }

        content = _merge_archive_rollup(None, absorbed, shards, "player_1")

        self.assertEqual(content["loop_count"], 2)
        self.assertEqual(content["avg_stability"], 70.0)
        self.assertEqual(content["avg_tension"], 30.0)
        self.assertEqual(content["phase_histogram"], {"ended": 2})
        self.assertEqual(content["tone_histogram"], {"fragile": 1})
        self.assertEqual(content["symbol_histogram"], {"signal": 1})

    def test_merge_rollup_weights_existing_by_loop_count(self) -> None:
        existing = {
            "player_id": "player_1",
            "loop_count": 2,
            "avg_stability": 90.0,
            "avg_tension": 10.0,
            "phase_histogram": {"ended": 2},
            "tone_histogram": {},
            "symbol_histogram": {},
            "window": {},
        }
        absorbed = [_archive_memory("loop_2", "player_1", 60, 40, _at(self.now, 2))]

        content = _merge_archive_rollup(existing, absorbed, {}, "player_1")

        self.assertEqual(content["loop_count"], 3)
        # (90*2 + 60) / 3 = 80
        self.assertEqual(content["avg_stability"], 80.0)
        self.assertEqual(content["avg_tension"], 20.0)

    def test_compaction_marks_overflow_and_writes_rollup(self) -> None:
        archives = [
            _archive_memory(f"loop_{i}", "player_1", 60, 40, _at(self.now, i)) for i in range(4)
        ]
        store = _FakeCompactionStore(archives, shards=[])

        _compact_player_archives(store, "player_1", retention=2)

        memories = store.list_world_memories("mythos-local")
        kinds = sorted(m.kind for m in memories)
        self.assertEqual(kinds.count("archive_compacted"), 2)
        self.assertEqual(kinds.count("loop_archive"), 2)
        self.assertEqual(kinds.count("archive_rollup"), 1)
        rollup = _player_rollup(memories, "player_1")
        assert rollup is not None
        self.assertEqual(rollup["loop_count"], 2)

    def test_compaction_noop_within_retention(self) -> None:
        archives = [
            _archive_memory(f"loop_{i}", "player_1", 60, 40, _at(self.now, i)) for i in range(2)
        ]
        store = _FakeCompactionStore(archives, shards=[])

        _compact_player_archives(store, "player_1", retention=5)

        memories = store.list_world_memories("mythos-local")
        self.assertTrue(all(m.kind == "loop_archive" for m in memories))
        self.assertIsNone(_player_rollup(memories, "player_1"))

    def test_initial_scores_blend_rollup_trend(self) -> None:
        rollup = WorldMemory(
            memory_id="rollup_1",
            world_id="mythos-local",
            kind="archive_rollup",
            content={
                "player_id": "player_1",
                "loop_count": 6,
                "avg_stability": 20.0,
                "avg_tension": 85.0,
            },
            weight=1.0,
            created_at=self.now,
            updated_at=self.now,
        )

        scores = _initial_loop_scores([rollup], player_id="player_1")

        self.assertLess(scores.stability, 70)
        self.assertGreater(scores.tension, 20)
        adjustment = scores.state["initial_world_memory_adjustment"]
        self.assertIn("rollup_trend", adjustment["reasons"])
        self.assertEqual(adjustment["rollup_loops"], 6)

    def test_narrative_shard_rollup_persists_summary_and_retains_recent_raw_shards(self) -> None:
        store = _ArchiveStore()
        shards = [
            NarrativeShard(
                shard_id=f"shard_{i}",
                loop_id=f"loop_{i // 2}",
                player_id="player_1",
                symbol=f"symbol_{i}",
                emotional_tone="uneasy" if i % 2 else "resolved",
                text=f"오래된 장면 파편 {i}",
                weight=1.0,
                created_at=_at(self.now, i),
                kind="clue" if i % 3 == 0 else "general",
            )
            for i in range(5)
        ]

        memories, retained = _prepare_narrative_memory_context(
            store,
            _SummaryDirector(),
            "player_1",
            [],
            shards,
            turn_index=51,
            use_llm=False,
            retention=2,
            trigger_turn=50,
            trigger_count=40,
            trigger_chars=12_000,
        )

        self.assertEqual([shard.shard_id for shard in retained], ["shard_3", "shard_4"])
        summaries = [
            memory for memory in store.player_memories if memory.kind == "causality_summary"
        ]
        self.assertEqual(len(summaries), 1)
        summary = summaries[0]
        self.assertEqual(summary.content["shard_count"], 3)
        self.assertEqual(summary.content["covered_shard_ids"], ["shard_0", "shard_1", "shard_2"])
        self.assertIn("symbol_0", summary.content["clue_symbols"])
        self.assertIn("장기 shard 3개 요약", summary.content["summary_text"])
        self.assertEqual([memory.kind for memory in memories], ["causality_summary"])

    def test_narrative_shard_rollup_handles_zero_retention(self) -> None:
        store = _ArchiveStore()
        shards = [
            NarrativeShard(
                shard_id=f"shard_{i}",
                loop_id="loop_1",
                player_id="player_1",
                symbol=f"symbol_{i}",
                emotional_tone="uneasy",
                text=f"오래된 장면 파편 {i}",
                weight=1.0,
                created_at=_at(self.now, i),
            )
            for i in range(3)
        ]

        _, retained = _prepare_narrative_memory_context(
            store,
            _SummaryDirector(),
            "player_1",
            [],
            shards,
            turn_index=51,
            use_llm=False,
            retention=0,
        )

        self.assertEqual(retained, [])
        summary = next(
            memory for memory in store.player_memories if memory.kind == "causality_summary"
        )
        self.assertEqual(summary.content["covered_shard_ids"], ["shard_0", "shard_1", "shard_2"])

    def test_narrative_metric_memory_accumulates_outcomes(self) -> None:
        store = _ArchiveStore()

        _save_narrative_metric_memory(
            store,
            player_id="player_1",
            loop_id="loop_1",
            outcome="success",
        )
        updated = _save_narrative_metric_memory(
            store,
            player_id="player_1",
            loop_id="loop_1",
            outcome="fallback",
        )

        self.assertEqual(updated.kind, "narrative_metrics")
        self.assertEqual(
            updated.content["counts"],
            {"success": 1, "provider_repair": 0, "local_repair": 0, "fallback": 1},
        )
        self.assertEqual(updated.content["total"], 2)
        self.assertEqual(updated.content["degraded"], 1)
        self.assertEqual(updated.content["success_ratio"], 0.5)
        self.assertEqual(
            updated.content["ratios"],
            {"success": 0.5, "provider_repair": 0.0, "local_repair": 0.0, "fallback": 0.5},
        )
        self.assertEqual(updated.content["last_outcome"], "fallback")

    def test_archive_resolves_ending(self) -> None:
        now = datetime(2026, 6, 3, tzinfo=UTC)
        store = _ArchiveStore()
        store.create_player(
            PlayerProfile(
                player_id="player_1",
                display_name="Connector",
                created_at=now,
                updated_at=now,
            )
        )
        store.save_loop(
            LoopState(
                loop_id="loop_1",
                player_id="player_1",
                seed="seed_1",
                phase=LoopPhase.EXPLORE,
                location_id="catalog-hall",
                stability=63,
                tension=42,
                started_at=now,
                state={
                    "scenario_id": "glass-library",
                    "flags": ["humanity_15", "miro_return_card_found"],
                },
            )
        )
        store.save_scene(
            Scene(
                scene_id="scene_1",
                loop_id="loop_1",
                turn_index=4,
                title="깨진 목록실",
                location="catalog-hall",
                narration="기록의 먼지가 빛난다.",
                choices=[],
                visual_brief="",
                created_at=now,
            )
        )

        service = RuntimeSessionService(store, director=cast(Any, _SummaryDirector()))
        service.archive("loop_1")

        summaries = service.list_run_summaries("player_1")
        self.assertEqual(len(summaries), 1)
        summary = summaries[0]
        self.assertEqual(summary.ending_id, "ending_name_restored")
        self.assertEqual(summary.ending_label, "이름의 복원")

        archived_loop = store.get_loop("loop_1")
        self.assertIsNotNone(archived_loop)
        self.assertEqual(archived_loop.state.get("ending_id"), "ending_name_restored")
        self.assertEqual(archived_loop.state.get("ending_label"), "이름의 복원")

    def test_choose_validates_cost_and_requires(self) -> None:
        now = datetime(2026, 6, 3, tzinfo=UTC)
        store = _ArchiveStore()
        store.create_player(
            PlayerProfile(
                player_id="player_1",
                display_name="Connector",
                created_at=now,
                updated_at=now,
            )
        )
        store.save_loop(
            LoopState(
                loop_id="loop_1",
                player_id="player_1",
                seed="seed_1",
                phase=LoopPhase.EXPLORE,
                location_id="catalog-hall",
                stability=20,
                tension=50,
                started_at=now,
                state={"scenario_id": "glass-library"},
            )
        )
        store.save_scene(
            Scene(
                scene_id="scene_1",
                loop_id="loop_1",
                turn_index=0,
                title="갈림길",
                location="catalog-hall",
                narration="갈림길이 나타났다.",
                choices=[
                    Choice(
                        choice_id="choice_ok",
                        label="안전하게 전진",
                        intent="explore",
                        cost={"stability": -5, "tension": 10},
                        requires={"stability_min": 10},
                    ),
                    Choice(
                        choice_id="choice_fail_req",
                        label="위험한 돌파",
                        intent="explore",
                        requires={"stability_min": 30},
                    ),
                ],
                visual_brief="",
                created_at=now,
            )
        )

        class _FakeDirector:
            def generate_next_scene(self, context):
                from mythos_narrative import ScenePayload

                payload = ScenePayload(
                    title="다음 씬",
                    location="catalog-hall",
                    narration="무사히 진행했다.",
                    choices=[Choice(choice_id="dummy", label="계속", intent="explore")],
                    visual_brief="",
                )
                scene = Scene(
                    scene_id="scene_2",
                    loop_id="loop_1",
                    turn_index=1,
                    title="다음 씬",
                    location="catalog-hall",
                    narration="무사히 진행했다.",
                    choices=[Choice(choice_id="dummy", label="계속", intent="explore")],
                    visual_brief="",
                    created_at=now,
                )
                return scene, payload

        service = RuntimeSessionService(store, director=cast(Any, _FakeDirector()))

        # 1. 요구 조건 미충족 시 선택 실패 검증
        with self.assertRaises(RuntimeError) as ctx:
            service.choose("loop_1", choice_id="choice_fail_req")
        self.assertIn("안정성", str(ctx.exception))
        self.assertIn("30 이상", str(ctx.exception))

        # 2. 요구 조건 충족 및 비용 차감 검증
        service.choose("loop_1", choice_id="choice_ok")

        updated_loop = store.get_loop("loop_1")
        self.assertIsNotNone(updated_loop)
        self.assertEqual(updated_loop.stability, 15)
        self.assertEqual(updated_loop.tension, 60)

    def test_stream_choose_validates_cost_and_requires(self) -> None:
        now = datetime(2026, 6, 3, tzinfo=UTC)
        store = _ArchiveStore()
        store.create_player(
            PlayerProfile(
                player_id="player_1",
                display_name="Connector",
                created_at=now,
                updated_at=now,
            )
        )
        store.save_loop(
            LoopState(
                loop_id="loop_1",
                player_id="player_1",
                seed="seed_1",
                phase=LoopPhase.EXPLORE,
                location_id="catalog-hall",
                stability=20,
                tension=50,
                started_at=now,
                state={"scenario_id": "glass-library"},
            )
        )
        store.save_scene(
            Scene(
                scene_id="scene_1",
                loop_id="loop_1",
                turn_index=0,
                title="갈림길",
                location="catalog-hall",
                narration="갈림길이 나타났다.",
                choices=[
                    Choice(
                        choice_id="choice_ok",
                        label="안전하게 전진",
                        intent="explore",
                        cost={"stability": -5, "tension": 10},
                        requires={"stability_min": 10},
                    ),
                    Choice(
                        choice_id="choice_fail_req",
                        label="위험한 돌파",
                        intent="explore",
                        requires={"stability_min": 30},
                    ),
                ],
                visual_brief="",
                created_at=now,
            )
        )

        class _FakeStreamDirector:
            def stream_next_scene(self, context):
                from mythos_narrative import NarrativeStreamEvent, ScenePayload

                payload = ScenePayload(
                    title="다음 씬",
                    location="catalog-hall",
                    narration="무사히 진행했다.",
                    choices=[Choice(choice_id="dummy", label="계속", intent="explore")],
                    visual_brief="",
                )
                scene = Scene(
                    scene_id="scene_2",
                    loop_id="loop_1",
                    turn_index=1,
                    title="다음 씬",
                    location="catalog-hall",
                    narration="무사히 진행했다.",
                    choices=[Choice(choice_id="dummy", label="계속", intent="explore")],
                    visual_brief="",
                    created_at=now,
                )
                yield NarrativeStreamEvent(kind="text", text=scene.narration)
                yield NarrativeStreamEvent(kind="final", scene=scene, payload=payload)

        service = RuntimeSessionService(store, director=cast(Any, _FakeStreamDirector()))
        options = RuntimeOptions()

        with self.assertRaises(RuntimeError) as ctx:
            list(service.stream_choose("loop_1", choice_id="choice_fail_req", options=options))
        self.assertIn("안정성", str(ctx.exception))
        self.assertIn("30 이상", str(ctx.exception))

        events = list(service.stream_choose("loop_1", choice_id="choice_ok", options=options))
        self.assertEqual(events[-1].kind, "final")

        updated_loop = store.get_loop("loop_1")
        self.assertIsNotNone(updated_loop)
        self.assertEqual(updated_loop.stability, 15)
        self.assertEqual(updated_loop.tension, 60)


def _at(base, offset_seconds):
    from datetime import timedelta

    return base + timedelta(seconds=offset_seconds)
