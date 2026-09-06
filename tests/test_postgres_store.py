import os
import unittest
from datetime import UTC, datetime
from uuid import uuid4

from mythos_core import (
    AssetRecord,
    Choice,
    Echo,
    LoopPhase,
    LoopState,
    NarrativeShard,
    PlayerMemory,
    PlayerProfile,
    Scene,
    WorldEvent,
    WorldMemory,
)
from mythos_core.models import Actor
from mythos_memory import PostgresMythOSStore, StoreError


@unittest.skipUnless(os.getenv("MYTHOS_RUN_DB_TESTS") == "1", "DB tests are opt-in")
class PostgresStoreTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = PostgresMythOSStore()
        self.now = datetime(2026, 5, 30, tzinfo=UTC)
        self.suffix = uuid4().hex
        self.player = PlayerProfile(
            player_id=f"player_store_test_{self.suffix}",
            display_name="Store Test",
            created_at=self.now,
            updated_at=self.now,
            traits={"resolve": 4},
        )
        self.loop = LoopState(
            loop_id=f"loop_store_test_{self.suffix}",
            player_id=self.player.player_id,
            seed="seed_store_test",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=70,
            tension=20,
            started_at=self.now,
            state={"flags": ["store_test"]},
            active_echoes=[
                Echo(
                    echo_id=f"echo_store_test_{self.suffix}",
                    source_loop_id="loop_previous",
                    source_event_id="event_previous",
                    symbol="mirror",
                    text="The mirror remembers.",
                )
            ],
        )

    def tearDown(self) -> None:
        self.store.close()

    @classmethod
    def tearDownClass(cls) -> None:
        PostgresMythOSStore.close_pool()

    def test_player_loop_event_scene_asset_crud(self) -> None:
        self.store.create_player(self.player)
        self.assertEqual(self.store.get_player(self.player.player_id), self.player)
        self.assertIn(self.player, self.store.list_players())

        self.store.save_loop(self.loop)
        self.assertEqual(self.store.get_loop(self.loop.loop_id), self.loop)
        self.assertIn(self.loop, self.store.list_loops(self.player.player_id))

        event = WorldEvent(
            event_id=f"event_store_test_{self.suffix}",
            loop_id=self.loop.loop_id,
            turn_index=0,
            actor=Actor.PLAYER,
            action="Enter",
            result="The gate opens.",
            state_delta={"tension": 3},
            created_at=self.now,
        )
        self.store.append_event(event)
        self.assertEqual(self.store.list_events(self.loop.loop_id), [event])

        scene = Scene(
            scene_id=f"scene_store_test_{self.suffix}",
            loop_id=self.loop.loop_id,
            turn_index=0,
            title="First Contact",
            location="data-layer-01",
            narration="The gate opens.",
            choices=[
                Choice(
                    choice_id=f"choice_store_test_{self.suffix}",
                    label="Enter",
                    intent="explore",
                )
            ],
            visual_brief="A luminous terminal.",
            created_at=self.now,
            objective="Enter the data core.",
            action_result="Success",
        )
        self.store.save_scene(scene)
        self.assertEqual(self.store.get_scene_by_turn(self.loop.loop_id, 0), scene)
        self.assertEqual(self.store.get_latest_scene(self.loop.loop_id), scene)

        memory = PlayerMemory(
            memory_id=f"memory_store_test_{self.suffix}",
            player_id=self.player.player_id,
            kind="echo",
            content={"symbol": "mirror"},
            weight=1.0,
            created_at=self.now,
            updated_at=self.now,
        )
        self.store.save_player_memory(memory)
        self.assertIn(memory, self.store.list_player_memories(self.player.player_id))

        world_memory = WorldMemory(
            memory_id=f"world_memory_store_test_{self.suffix}",
            world_id=f"world_store_test_{self.suffix}",
            kind="counter",
            content={"loops_started": 1},
            weight=1.0,
            created_at=self.now,
            updated_at=self.now,
        )
        self.store.save_world_memory(world_memory)
        self.assertEqual(self.store.list_world_memories(world_memory.world_id), [world_memory])

        shard = NarrativeShard(
            shard_id=f"shard_store_test_{self.suffix}",
            loop_id=self.loop.loop_id,
            player_id=self.player.player_id,
            symbol="mirror",
            emotional_tone="uneasy",
            text="The mirror kept the connector's shape.",
            weight=1.0,
            created_at=self.now,
        )
        self.store.save_narrative_shard(shard)
        self.assertEqual(self.store.list_narrative_shards(self.player.player_id), [shard])

        asset = AssetRecord(
            asset_id=f"asset_store_test_{self.suffix}",
            scene_id=scene.scene_id,
            loop_id=self.loop.loop_id,
            provider="flux_local_mps",
            model_id="black-forest-labs/FLUX.1-schnell",
            prompt="A luminous terminal.",
            seed=42,
            width=512,
            height=512,
            steps=1,
            storage_uri="s3://mythos-assets/images/store-test.png",
            metadata={"test": True},
            created_at=self.now,
        )
        self.store.save_asset(asset)
        self.assertEqual(self.store.list_assets(self.loop.loop_id), [asset])

    def test_transaction_rolls_back(self) -> None:
        with self.assertRaises(StoreError), self.store.transaction():
            self.store.create_player(self.player)
            self.store.save_loop(
                LoopState(
                    loop_id=f"loop_invalid_store_test_{self.suffix}",
                    player_id="missing_player",
                    seed="seed",
                    phase=LoopPhase.CONNECT,
                    location_id="data-layer-01",
                    stability=50,
                    tension=50,
                    started_at=self.now,
                )
            )

        self.assertIsNone(self.store.get_player(self.player.player_id))


@unittest.skipUnless(os.getenv("MYTHOS_RUN_DB_TESTS") == "1", "DB tests are opt-in")
class PostgresConnectionReapTest(unittest.TestCase):
    """Neon idle-reap resilience (live incident 2026-07-14: a choose turn was
    swallowed). Neon kills ALL idle backends at once (AdminShutdown), so both
    the held connection AND every pooled spare die together — the pool checkout
    check + the transaction() pre-ping must recover without surfacing an error.
    Simulated with pg_terminate_backend."""

    def setUp(self) -> None:
        self.store = PostgresMythOSStore()

    def tearDown(self) -> None:
        self.store.close()

    def _kill_all_backends(self) -> None:
        import psycopg

        url = self.store.database_url
        with psycopg.connect(str(url), autocommit=True) as admin:
            admin.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                "WHERE datname = current_database() AND pid <> pg_backend_pid()"
            )

    def test_single_statement_survives_full_reap(self) -> None:
        self.store._fetchone("SELECT 1", ())
        self._kill_all_backends()
        row = self.store._fetchone("SELECT 1 AS ok", ())
        assert row is not None
        self.assertEqual(row["ok"], 1)

    def test_transaction_unit_survives_full_reap(self) -> None:
        # The live incident shape: store holds a reaped connection, next player
        # action opens the per-transition transaction unit.
        self.store._fetchone("SELECT 1", ())
        self._kill_all_backends()
        with self.store.transaction():
            row = self.store._fetchone("SELECT 1 AS ok", ())
        assert row is not None
        self.assertEqual(row["ok"], 1)

    def test_fresh_store_survives_dead_pooled_connections(self) -> None:
        # Conn dies while idle IN the pool; a new request-scoped store checks
        # it out (the 06:16:17 prod log shape).
        self.store._fetchone("SELECT 1", ())
        self.store.close()
        self._kill_all_backends()
        fresh = PostgresMythOSStore()
        try:
            with fresh.transaction():
                row = fresh._fetchone("SELECT 1 AS ok", ())
            assert row is not None
            self.assertEqual(row["ok"], 1)
        finally:
            fresh.close()
