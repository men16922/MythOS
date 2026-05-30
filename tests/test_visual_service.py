import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from PIL import Image

from mythos_core import AssetRecord, Scene
from mythos_memory.store import MythOSStore
from mythos_runtime import (
    FilesystemStorageAdapter,
    VisualGenerationRequest,
    VisualService,
)


class FakeProvider:
    def generate(self, request: VisualGenerationRequest, output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (8, 8), color=(12, 34, 56)).save(output_path)
        return output_path


class FailingProvider:
    def generate(self, request: VisualGenerationRequest, output_path: Path) -> Path:
        raise RuntimeError("image backend unavailable")


class FakeStore(MythOSStore):
    def __init__(self) -> None:
        self.assets: list[AssetRecord] = []

    def save_asset(self, asset: AssetRecord) -> None:
        self.assets.append(asset)

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

    def list_world_memories(self, world_id) -> list:
        return []

    def save_narrative_shard(self, shard) -> None:
        pass

    def list_narrative_shards(self, player_id, limit=8) -> list:
        return []

    def list_assets(self, loop_id) -> list:
        return []

    def transaction(self):
        from contextlib import contextmanager

        @contextmanager
        def _txn():
            yield

        return _txn()


class VisualServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.scene = Scene(
            scene_id="scene_visual_test",
            loop_id="loop_visual_test",
            turn_index=0,
            title="Threshold",
            location="data-layer-01",
            narration="The gate opens.",
            choices=[],
            visual_brief="A luminous gate.",
            created_at=datetime(2026, 5, 30, tzinfo=UTC),
        )

    def test_generates_image_and_records_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            store = FakeStore()
            service = VisualService(
                provider=FakeProvider(),
                storage=FilesystemStorageAdapter(root),
                store=store,
                work_dir=root / "work",
            )

            result = service.generate_for_scene(
                self.scene,
                player_id="player_visual_test",
                request_overrides={"width": 8, "height": 8, "steps": 1},
            )

            self.assertTrue(result.ok)
            self.assertTrue(Path(result.storage_uri).exists())
            self.assertEqual(result.asset.metadata["status"], "succeeded")
            self.assertEqual(store.assets, [result.asset])

    def test_disabled_mode_records_disabled_asset(self) -> None:
        store = FakeStore()
        result = VisualService(provider=FakeProvider(), store=store).generate_for_scene(
            self.scene,
            player_id="player_visual_test",
            request_overrides={"enabled": False},
        )

        self.assertEqual(result.status, "disabled")
        self.assertFalse(result.ok)
        self.assertEqual(result.asset.metadata["status"], "disabled")
        self.assertEqual(store.assets, [result.asset])

    def test_generation_failure_records_failed_asset(self) -> None:
        store = FakeStore()
        result = VisualService(provider=FailingProvider(), store=store).generate_for_scene(
            self.scene,
            player_id="player_visual_test",
        )

        self.assertEqual(result.status, "failed")
        self.assertFalse(result.ok)
        if result.error:
            self.assertIn("image backend unavailable", result.error)
        self.assertEqual(result.asset.metadata["status"], "failed")
        self.assertEqual(store.assets, [result.asset])
