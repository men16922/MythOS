import json
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from test_visual_service import FakeProvider, FakeStore

from mythos_core import Scene
from mythos_runtime import (
    FilesystemStorageAdapter,
    VisualGenerationRequest,
    VisualService,
)
from mythos_runtime.visual_queue import VisualJobQueue


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}

    def set(self, key: str, value: str, nx: bool = False, ex: int | None = None) -> bool:
        if nx and key in self.values:
            return False
        self.values[key] = value
        return True

    def get(self, key: str) -> str | None:
        return self.values.get(key)

    def delete(self, key: str) -> int:
        existed = key in self.values
        self.values.pop(key, None)
        return 1 if existed else 0

    def exists(self, key: str) -> int:
        return 1 if key in self.values else 0


class LockQueue(VisualJobQueue):
    def __init__(self, redis_client: FakeRedis) -> None:
        super().__init__()
        self.redis_client = redis_client

    def _redis(self) -> FakeRedis:
        return self.redis_client


class UpsertStore(FakeStore):
    """FakeStore whose assets are queryable and upserted by id (like Postgres)."""

    def save_asset(self, asset) -> None:
        self.assets = [a for a in self.assets if a.asset_id != asset.asset_id]
        self.assets.append(asset)

    def list_assets(self, loop_id) -> list:
        return [a for a in self.assets if a.loop_id == loop_id]


class FakeQueue(VisualJobQueue):
    """In-memory queue (no Redis); overrides only the methods enqueue_for_scene uses."""

    def __init__(self) -> None:
        super().__init__()
        self.jobs: list[dict] = []

    def enqueue(self, job: dict) -> None:
        self.jobs.append(job)

    def depth(self) -> int:
        return len(self.jobs)


class VisualQueueTest(unittest.TestCase):
    def setUp(self) -> None:
        self.scene = Scene(
            scene_id="scene_q",
            loop_id="loop_q",
            turn_index=0,
            title="Threshold",
            location="data-layer-01",
            narration="The gate opens.",
            choices=[],
            visual_brief="A luminous gate.",
            created_at=datetime(2026, 5, 30, tzinfo=UTC),
        )

    def test_enqueue_records_pending_and_serializable_job(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = UpsertStore()
            queue = FakeQueue()
            service = VisualService(
                provider=FakeProvider(),
                storage=FilesystemStorageAdapter(Path(tmp)),
                store=store,
            )

            pending = service.enqueue_for_scene(
                self.scene,
                player_id="player_q",
                queue=queue,
                storage_kind="filesystem",
                request_overrides={"width": 8, "height": 8, "steps": 1},
            )

            self.assertEqual(pending.status, "pending")
            self.assertEqual(pending.asset.status, "pending")
            self.assertEqual(pending.storage_uri, "")
            self.assertEqual(len(queue.jobs), 1)

            job = queue.jobs[0]
            self.assertEqual(job["asset_id"], pending.asset.asset_id)
            self.assertEqual(job["storage_kind"], "filesystem")
            self.assertEqual(job["request"]["asset_id"], pending.asset.asset_id)
            # The job payload must survive JSON round-trip through Redis.
            self.assertEqual(json.loads(json.dumps(job)), job)

            stored = store.list_assets(self.scene.loop_id)
            self.assertEqual(len(stored), 1)
            self.assertEqual(stored[0].status, "pending")

    def test_worker_run_upserts_same_asset_to_succeeded(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            store = UpsertStore()
            queue = FakeQueue()
            service = VisualService(
                provider=FakeProvider(),
                storage=FilesystemStorageAdapter(Path(tmp)),
                store=store,
            )
            pending = service.enqueue_for_scene(
                self.scene,
                player_id="player_q",
                queue=queue,
                storage_kind="filesystem",
                request_overrides={"width": 8, "height": 8, "steps": 1},
            )

            # Simulate the worker: rebuild the request from the queued payload and run it.
            job = queue.jobs[0]
            request = VisualGenerationRequest(**job["request"])
            worker_service = VisualService(
                provider=FakeProvider(),
                storage=FilesystemStorageAdapter(Path(tmp)),
                store=store,
            )
            result = worker_service.generate(request)

            self.assertTrue(result.ok)
            self.assertEqual(result.asset.asset_id, pending.asset.asset_id)

            # Pending row was upserted in place (no duplicate), now succeeded.
            stored = store.list_assets(self.scene.loop_id)
            self.assertEqual(len(stored), 1)
            self.assertEqual(stored[0].status, "succeeded")
            self.assertTrue(Path(stored[0].storage_uri).exists())

    def test_worker_lock_token_survives_heartbeat_and_releases_on_shutdown(self) -> None:
        redis_client = FakeRedis()
        queue = LockQueue(redis_client)

        self.assertTrue(queue.acquire_worker_slot())
        first_token = redis_client.get("mythos:visual:worker:heartbeat")
        self.assertIsNotNone(first_token)

        queue.beat()
        self.assertEqual(redis_client.get("mythos:visual:worker:heartbeat"), first_token)

        contender = LockQueue(redis_client)
        self.assertFalse(contender.acquire_worker_slot())

        self.assertTrue(queue.release_worker_slot())
        self.assertEqual(redis_client.exists("mythos:visual:worker:heartbeat"), 0)
        self.assertFalse(queue.release_worker_slot())

    def test_worker_lock_release_does_not_delete_another_worker_token(self) -> None:
        redis_client = FakeRedis()
        queue = LockQueue(redis_client)
        self.assertTrue(queue.acquire_worker_slot())
        redis_client.set("mythos:visual:worker:heartbeat", "other-host:999")

        self.assertFalse(queue.release_worker_slot())
        self.assertEqual(redis_client.get("mythos:visual:worker:heartbeat"), "other-host:999")


if __name__ == "__main__":
    unittest.main()
