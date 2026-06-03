import tempfile
import unittest
import unittest.mock
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

            # Verify latency segment metrics
            self.assertIn("latency_ms", result.asset.metadata)
            self.assertIn("provider_ms", result.asset.metadata)
            self.assertIn("postprocess_ms", result.asset.metadata)
            self.assertIn("storage_ms", result.asset.metadata)
            self.assertGreaterEqual(result.asset.metadata["latency_ms"], 0.0)
            self.assertGreaterEqual(result.asset.metadata["provider_ms"], 0.0)

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
        self.assertIn("provider_ms", result.asset.metadata)

    def test_character_detection_enables_ip_adapter(self) -> None:
        # Create a scene with character name "se-rin" in the prompt
        scene = Scene(
            scene_id="scene_char_test",
            loop_id="loop_char_test",
            turn_index=0,
            title="Meeting Se-rin",
            location="data-layer-01",
            narration="You meet se-rin in the alley.",
            choices=[],
            visual_brief="A dark portrait of se-rin.",
            created_at=datetime(2026, 5, 30, tzinfo=UTC),
        )

        service = VisualService(provider=FakeProvider(), store=FakeStore())
        request = service._request_from_scene(scene, player_id="player_test", overrides={})

        self.assertTrue(request.metadata.get("use_ip_adapter"))
        self.assertEqual(request.metadata.get("detected_tag"), "se-rin")
        ref_image = request.metadata.get("reference_image")
        assert isinstance(ref_image, str)
        self.assertIn("se-rin.png", ref_image)
        self.assertEqual(request.metadata.get("ip_adapter_scale"), 0.6)

    def test_concept_detection_does_not_enable_ip_adapter(self) -> None:
        # Create a scene with concept name "night market" in the prompt
        scene = Scene(
            scene_id="scene_concept_test",
            loop_id="loop_concept_test",
            turn_index=0,
            title="Night Market",
            location="data-layer-01",
            narration="You walk around the night market.",
            choices=[],
            visual_brief="Floating night market with cyan neon.",
            created_at=datetime(2026, 5, 30, tzinfo=UTC),
        )

        service = VisualService(provider=FakeProvider(), store=FakeStore())
        request = service._request_from_scene(scene, player_id="player_test", overrides={})

        # Concept maps to reference_image but should not trigger IP-Adapter (use_ip_adapter = False/None)
        self.assertFalse(request.metadata.get("use_ip_adapter", False))
        self.assertEqual(request.metadata.get("detected_tag"), "night market")
        ref_image = request.metadata.get("reference_image")
        assert isinstance(ref_image, str)
        self.assertIn("01-night-market.png", ref_image)

    @unittest.mock.patch("mythos_runtime.visual_service.generate_image")
    @unittest.mock.patch("mythos_runtime.visual_service.generate_image_img2img")
    def test_local_flux_provider_routing(self, mock_img2img, mock_generate) -> None:
        from mythos_image_agent.config import AgentConfig
        from mythos_runtime.visual_service import LocalFluxProvider, VisualGenerationRequest

        provider = LocalFluxProvider(config=AgentConfig())
        output_path = Path("/tmp/test_out.png")

        # 1. Test standard text-to-image (no reference)
        req_text = VisualGenerationRequest(
            player_id="p1", loop_id="l1", scene_id="s1", prompt="text-only", metadata={}
        )
        provider.generate(req_text, output_path)
        mock_generate.assert_called_once_with(
            prompt="text-only",
            output_path=output_path,
            config=provider.config,
            model_id_override="black-forest-labs/FLUX.1-schnell",
            seed=42,
            steps=4,
            width=1024,
            height=1024,
        )
        mock_generate.reset_mock()

        # 2. Test standard img2img (reference present, use_ip_adapter=False)
        with tempfile.NamedTemporaryFile() as tmp:
            req_img2img = VisualGenerationRequest(
                player_id="p1",
                loop_id="l1",
                scene_id="s1",
                prompt="concept scene",
                metadata={
                    "reference_image": tmp.name,
                    "use_ip_adapter": False,
                    "img2img_strength": 0.5,
                },
            )
            provider.generate(req_img2img, output_path)
            mock_img2img.assert_called_once_with(
                reference_path=Path(tmp.name),
                prompt="concept scene",
                output_path=output_path,
                config=provider.config,
                strength=0.5,
                model_id_override="black-forest-labs/FLUX.1-schnell",
                seed=42,
                steps=4,
                width=1024,
                height=1024,
            )

        # 3. Test IP-Adapter (reference present, use_ip_adapter=True)
        with tempfile.NamedTemporaryFile() as tmp:
            req_ip_adapter = VisualGenerationRequest(
                player_id="p1",
                loop_id="l1",
                scene_id="s1",
                prompt="character scene",
                metadata={
                    "reference_image": tmp.name,
                    "use_ip_adapter": True,
                    "ip_adapter_scale": 0.75,
                },
            )
            provider.generate(req_ip_adapter, output_path)
            mock_generate.assert_called_once_with(
                prompt="character scene",
                output_path=output_path,
                config=provider.config,
                model_id_override="black-forest-labs/FLUX.1-schnell",
                seed=42,
                steps=4,
                width=1024,
                height=1024,
                ip_adapter_image_path=Path(tmp.name),
                ip_adapter_scale=0.75,
            )

    @unittest.mock.patch("mythos_image_agent.pipeline_cache.get_flux_pipeline")
    @unittest.mock.patch("transformers.CLIPVisionModelWithProjection.from_pretrained")
    @unittest.mock.patch("diffusers.FluxPipeline")
    def test_pipeline_cache_loading(
        self, mock_flux_class, mock_clip_class, mock_get_flux_base
    ) -> None:
        from mythos_image_agent.config import AgentConfig
        from mythos_image_agent.pipeline_cache import (
            clear_pipeline_cache,
            get_flux_ip_adapter_pipeline,
        )

        clear_pipeline_cache()

        # Mock base pipeline components and itself
        mock_base = unittest.mock.MagicMock()
        mock_base.components = {"vae": "fake_vae", "transformer": "fake_transformer"}
        mock_get_flux_base.return_value = mock_base

        # Mock CLIPVisionModel
        mock_clip_instance = unittest.mock.MagicMock()
        mock_clip_class.return_value = mock_clip_instance
        mock_clip_instance.to.return_value = mock_clip_instance

        # Mock FluxPipeline
        mock_flux_instance = unittest.mock.MagicMock()
        mock_flux_class.return_value = mock_flux_instance

        config = AgentConfig(hf_token="test_token")
        pipe = get_flux_ip_adapter_pipeline("fake_model", config)

        # Assertions
        mock_get_flux_base.assert_called_once_with("fake_model", config)
        mock_clip_class.assert_called_once_with(
            "openai/clip-vit-large-patch14", torch_dtype=unittest.mock.ANY, token="test_token"
        )
        mock_clip_instance.to.assert_called_once_with("cpu")

        mock_flux_class.assert_called_once_with(
            vae="fake_vae", transformer="fake_transformer", image_encoder=mock_clip_instance
        )
        mock_flux_instance.load_ip_adapter.assert_called_once_with(
            "XLabs-AI/flux-ip-adapter",
            weight_name="ip_adapter.safetensors",
            image_encoder_folder=None,
        )
        self.assertEqual(pipe, mock_flux_instance)


class MinIOPresignTest(unittest.TestCase):
    def test_non_s3_uri_returns_unchanged(self) -> None:
        from mythos_runtime.visual_service import MinIOStorageAdapter

        adapter = MinIOStorageAdapter()
        self.assertEqual(adapter.presigned_url("/tmp/a.png"), "/tmp/a.png")

    def test_malformed_s3_uri_raises(self) -> None:
        from mythos_runtime.visual_service import MinIOStorageAdapter

        adapter = MinIOStorageAdapter()
        with self.assertRaises(ValueError):
            adapter.presigned_url("s3://bucket-only")

    @unittest.mock.patch("boto3.client")
    def test_s3_uri_is_presigned(self, mock_client_factory) -> None:
        from mythos_runtime.visual_service import MinIOStorageAdapter

        mock_client = unittest.mock.MagicMock()
        mock_client.generate_presigned_url.return_value = "https://signed/url"
        mock_client_factory.return_value = mock_client

        adapter = MinIOStorageAdapter(bucket="mythos-assets")
        url = adapter.presigned_url("s3://mythos-assets/images/p/l/s.png", expires_in=120)

        self.assertEqual(url, "https://signed/url")
        mock_client.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={"Bucket": "mythos-assets", "Key": "images/p/l/s.png"},
            ExpiresIn=120,
        )
