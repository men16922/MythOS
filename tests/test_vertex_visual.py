"""Tests for the GCP cloud visual adapters (closed-beta wedge):

  * ``VertexImageProvider`` — Imagen via google-genai (fake client), aspect-ratio
    mapping, PNG bytes written to the output path, model override, missing-SDK error;
  * ``GCSStorageAdapter`` — upload returns a ``gs://`` URI, v4 signed read URL,
    non-``gs://`` passthrough, missing-SDK error;
  * the ``default_visual_provider`` / ``default_storage_adapter`` env factories.

No Google SDK is required — clients are injected.
"""

from __future__ import annotations

import os
import tempfile
import types
import unittest
from pathlib import Path
from typing import Any
from unittest import mock

from mythos_runtime import (
    FilesystemStorageAdapter,
    GCSStorageAdapter,
    MinIOStorageAdapter,
    VertexImageProvider,
    VisualGenerationRequest,
    default_storage_adapter,
    default_visual_provider,
    storage_adapter_for,
)
from mythos_runtime.visual_service import _nearest_aspect_ratio

_PNG = b"\x89PNG\r\n\x1a\n_fake_png_bytes"


def _request(width: int = 1024, height: int = 1024) -> VisualGenerationRequest:
    return VisualGenerationRequest(
        player_id="player_1",
        loop_id="loop_1",
        scene_id="scene_1",
        prompt="a rain-soaked neon alley",
        width=width,
        height=height,
    )


class _FakeImagenModels:
    def __init__(self, image_bytes: bytes | None) -> None:
        self._image_bytes = image_bytes
        self.calls: list[dict[str, Any]] = []

    def generate_images(self, *, model: str, prompt: str, config: Any):
        self.calls.append({"model": model, "prompt": prompt, "config": config})
        if self._image_bytes is None:
            return types.SimpleNamespace(generated_images=[])
        image = types.SimpleNamespace(image_bytes=self._image_bytes)
        return types.SimpleNamespace(generated_images=[types.SimpleNamespace(image=image)])


class _FakeGenaiClient:
    def __init__(self, image_bytes: bytes | None = _PNG) -> None:
        self.models = _FakeImagenModels(image_bytes)


def _gemini_resp(image_bytes: bytes) -> Any:
    """A Gemini image `generate_content` response: candidates[].content.parts[].inline_data.data."""
    part = types.SimpleNamespace(inline_data=types.SimpleNamespace(data=image_bytes))
    content = types.SimpleNamespace(parts=[part])
    return types.SimpleNamespace(candidates=[types.SimpleNamespace(content=content)])


class _FakeGeminiModels:
    def __init__(self, image_bytes: bytes | None) -> None:
        self._image_bytes = image_bytes
        self.calls: list[dict[str, Any]] = []

    def generate_content(self, *, model: str, contents: Any, config: Any):
        self.calls.append({"model": model, "contents": contents, "config": config})
        if self._image_bytes is None:
            return types.SimpleNamespace(candidates=[])
        return _gemini_resp(self._image_bytes)


class _FakeGeminiClient:
    def __init__(self, image_bytes: bytes | None = _PNG) -> None:
        self.models = _FakeGeminiModels(image_bytes)


class _FlakyGeminiModels:
    def __init__(self, outcomes: list[str]) -> None:
        self.outcomes = list(outcomes)
        self.calls = 0

    def generate_content(self, *, model: str, contents: Any, config: Any):
        self.calls += 1
        outcome = self.outcomes.pop(0)
        if outcome == "429":
            raise RuntimeError(
                "429 RESOURCE_EXHAUSTED. Quota exceeded for "
                "aiplatform.googleapis.com/online_prediction_requests_per_base_model"
            )
        if outcome == "empty":
            return types.SimpleNamespace(candidates=[])
        return _gemini_resp(_PNG)


class _FlakyGeminiClient:
    def __init__(self, outcomes: list[str]) -> None:
        self.models = _FlakyGeminiModels(outcomes)


class AspectRatioTest(unittest.TestCase):
    def test_maps_to_nearest_supported_ratio(self) -> None:
        self.assertEqual(_nearest_aspect_ratio(1024, 1024), "1:1")
        self.assertEqual(_nearest_aspect_ratio(1920, 1080), "16:9")
        self.assertEqual(_nearest_aspect_ratio(1080, 1920), "9:16")
        self.assertEqual(_nearest_aspect_ratio(1024, 768), "4:3")
        self.assertEqual(_nearest_aspect_ratio(0, 0), "1:1")  # guard div-by-zero


class VertexImageProviderTest(unittest.TestCase):
    def test_generate_writes_png_and_passes_aspect_ratio(self) -> None:
        client = _FakeGenaiClient(_PNG)
        provider = VertexImageProvider(model="imagen-3.0-generate-002", client=client)
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "nested" / "scene_1.png"
            result = provider.generate(_request(1920, 1080), out)
            self.assertEqual(result, out)
            self.assertEqual(out.read_bytes(), _PNG)
        call = client.models.calls[0]
        self.assertEqual(call["model"], "imagen-3.0-generate-002")
        self.assertEqual(call["config"]["aspect_ratio"], "16:9")
        self.assertEqual(call["config"]["number_of_images"], 1)

    def test_per_request_model_override(self) -> None:
        client = _FakeGenaiClient(_PNG)
        provider = VertexImageProvider(model="imagen-3.0-generate-002", client=client)
        req = VisualGenerationRequest(
            player_id="p",
            loop_id="l",
            scene_id="s",
            prompt="x",
            metadata={"vertex_image_model": "imagen-3.0-fast-generate-001"},
        )
        with tempfile.TemporaryDirectory() as tmp:
            provider.generate(req, Path(tmp) / "s.png")
        self.assertEqual(client.models.calls[0]["model"], "imagen-3.0-fast-generate-001")

    def test_gemini_default_uses_generate_content_and_writes_png(self) -> None:
        # Default model is now a gemini image model → the generate_content path.
        client = _FakeGeminiClient(_PNG)
        with mock.patch.dict(
            os.environ,
            {"IMAGEN_MODEL": "", "IMAGE_MODEL_ID_VERTEX": ""},
            clear=False,
        ):
            provider = VertexImageProvider(client=client)
            with tempfile.TemporaryDirectory() as tmp:
                out = Path(tmp) / "s.png"
                provider.generate(_request(1080, 1920), out)
                self.assertEqual(out.read_bytes(), _PNG)
        call = client.models.calls[0]
        self.assertEqual(call["model"], "gemini-2.5-flash-image")
        # No reference portrait in metadata → text-only (single content part).
        self.assertEqual(len(call["contents"]), 1)

    def test_gemini_passes_curated_portrait_as_reference(self) -> None:
        # When metadata carries a reference_image that exists, it is sent as a
        # second content part (the identity anchor) alongside the prompt.
        client = _FakeGeminiClient(_PNG)
        provider = VertexImageProvider(client=client)
        with tempfile.TemporaryDirectory() as tmp:
            portrait = Path(tmp) / "se-rin.png"
            portrait.write_bytes(_PNG)
            req = VisualGenerationRequest(
                player_id="p", loop_id="l", scene_id="s", prompt="a scene",
                metadata={"reference_image": str(portrait)},
            )
            provider.generate(req, Path(tmp) / "out.png")
        self.assertEqual(len(client.models.calls[0]["contents"]), 2)

    def test_no_images_raises_after_retries(self) -> None:
        client = _FlakyGeminiClient(["empty", "empty", "empty"])
        provider = VertexImageProvider(client=client, sleep=lambda _s: None)
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(RuntimeError):
                provider.generate(_request(), Path(tmp) / "s.png")
        self.assertEqual(client.models.calls, 3)

    def test_quota_429_retries_with_backoff_then_succeeds(self) -> None:
        # Prod evidence 2026-07-11: bursty turns tripped the per-minute quota and
        # the empty safety-filter response; both must survive a re-roll.
        client = _FlakyGeminiClient(["429", "ok"])
        delays: list[float] = []
        provider = VertexImageProvider(client=client, sleep=delays.append)
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "s.png"
            provider.generate(_request(), out)
            self.assertEqual(out.read_bytes(), _PNG)
        self.assertEqual(client.models.calls, 2)
        self.assertEqual(delays, [8.0])

    def test_empty_response_retries_quickly_then_succeeds(self) -> None:
        client = _FlakyGeminiClient(["empty", "ok"])
        delays: list[float] = []
        provider = VertexImageProvider(client=client, sleep=delays.append)
        with tempfile.TemporaryDirectory() as tmp:
            provider.generate(_request(), Path(tmp) / "s.png")
        self.assertEqual(client.models.calls, 2)
        self.assertEqual(delays, [1.5])

    def test_non_retryable_error_raises_immediately(self) -> None:
        class _Boom:
            calls = 0

            def generate_content(self, **_kw):
                _Boom.calls += 1
                raise RuntimeError("PERMISSION_DENIED: caller lacks permission")

        client = types.SimpleNamespace(models=_Boom())
        provider = VertexImageProvider(client=client, sleep=lambda _s: None)
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(RuntimeError):
                provider.generate(_request(), Path(tmp) / "s.png")
        self.assertEqual(_Boom.calls, 1)

    def test_missing_sdk_raises_actionable_error(self) -> None:
        provider = VertexImageProvider()  # no injected client
        with mock.patch.dict("sys.modules", {"google.genai": None, "google": None}):
            with self.assertRaises(RuntimeError) as ctx:
                provider._client()
        self.assertIn(".[gemini]", str(ctx.exception))

    def test_env_names_match_user_convention(self) -> None:
        env = {
            "IMAGEN_MODEL": "imagen-custom",
            "PROJECT_ID": "proj-abc",
            "GOOGLE_CLOUD_LOCATION": "asia-northeast3",
        }
        with mock.patch.dict(os.environ, env, clear=False):
            os.environ.pop("GOOGLE_CLOUD_PROJECT", None)
            provider = VertexImageProvider()
        self.assertEqual(provider.model, "imagen-custom")
        self.assertEqual(provider.project, "proj-abc")
        self.assertEqual(provider.location, "asia-northeast3")


class _FakeBlob:
    def __init__(self) -> None:
        self.uploaded: tuple[str, str] | None = None

    def upload_from_filename(self, filename: str, content_type: str = "") -> None:
        self.uploaded = (filename, content_type)

    def generate_signed_url(self, *, version: str, expiration: Any, method: str) -> str:
        return f"https://signed.example/{version}/{method}?exp={int(expiration.total_seconds())}"


class _TokenOnlyBlob(_FakeBlob):
    """Mimics google-cloud-storage under Cloud Run metadata credentials:
    local signing raises AttributeError; IAM signBlob kwargs succeed."""

    def generate_signed_url(
        self,
        *,
        version: str,
        expiration: Any,
        method: str,
        service_account_email: str | None = None,
        access_token: str | None = None,
    ) -> str:
        if not (service_account_email and access_token):
            raise AttributeError("you need a private key to sign credentials.")
        return (
            f"https://signed.example/iam/{version}/{method}"
            f"?sa={service_account_email}&exp={int(expiration.total_seconds())}"
        )


class _FakeMetadataCredentials:
    """Token-only credentials: no private key, refresh() mints a token."""

    def __init__(self) -> None:
        self.service_account_email = "runtime-sa@proj.iam.gserviceaccount.com"
        self.token: str | None = None
        self.valid = False

    def refresh(self, _request: Any) -> None:
        self.token = "fresh-access-token"
        self.valid = True


class _FakeBucket:
    def __init__(self) -> None:
        self.blobs: dict[str, _FakeBlob] = {}

    def blob(self, key: str) -> _FakeBlob:
        return self.blobs.setdefault(key, _FakeBlob())


class _FakeGCSClient:
    def __init__(self) -> None:
        self.buckets: dict[str, _FakeBucket] = {}

    def bucket(self, name: str) -> _FakeBucket:
        return self.buckets.setdefault(name, _FakeBucket())


class GCSStorageAdapterTest(unittest.TestCase):
    def test_store_uploads_and_returns_gs_uri(self) -> None:
        client = _FakeGCSClient()
        adapter = GCSStorageAdapter(bucket="mythos-assets", client=client)
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "img.png"
            src.write_bytes(_PNG)
            uri = adapter.store(src, _request())
        self.assertEqual(uri, "gs://mythos-assets/images/player_1/loop_1/scene_1.png")
        blob = client.buckets["mythos-assets"].blobs["images/player_1/loop_1/scene_1.png"]
        self.assertEqual(blob.uploaded, (str(src), "image/png"))

    def test_presigned_url_signs_gs_uri(self) -> None:
        adapter = GCSStorageAdapter(bucket="b", client=_FakeGCSClient())
        url = adapter.presigned_url("gs://b/images/p/l/s.png", expires_in=900)
        self.assertTrue(url.startswith("https://signed.example/"))
        self.assertIn("exp=900", url)

    def test_presigned_url_iam_fallback_on_token_only_credentials(self) -> None:
        # Cloud Run regression (2026-07-05): metadata credentials have no
        # private key, so presign must fall back to IAM signBlob kwargs using
        # the dedicated cloud-platform-scoped signing credentials.
        client = _FakeGCSClient()
        adapter = GCSStorageAdapter(bucket="b", client=client)
        adapter._signing_credentials = _FakeMetadataCredentials()
        client.bucket("b").blobs["images/p/l/s.png"] = _TokenOnlyBlob()
        url = adapter.presigned_url("gs://b/images/p/l/s.png", expires_in=900)
        self.assertIn("/iam/v4/GET", url)
        self.assertIn("sa=runtime-sa@proj.iam.gserviceaccount.com", url)
        self.assertIn("exp=900", url)
        self.assertEqual(adapter._signing_credentials.token, "fresh-access-token")

    def test_presigned_url_passthrough_non_gs(self) -> None:
        adapter = GCSStorageAdapter(client=_FakeGCSClient())
        self.assertEqual(adapter.presigned_url("/local/path.png"), "/local/path.png")

    def test_malformed_gs_uri_raises(self) -> None:
        adapter = GCSStorageAdapter(client=_FakeGCSClient())
        with self.assertRaises(ValueError):
            adapter.presigned_url("gs://bucket-only")

    def test_missing_sdk_raises_actionable_error(self) -> None:
        adapter = GCSStorageAdapter()
        with mock.patch.dict("sys.modules", {"google.cloud.storage": None, "google.cloud": None}):
            with self.assertRaises(RuntimeError) as ctx:
                adapter._client()
        self.assertIn(".[gcs]", str(ctx.exception))


class FactoryTest(unittest.TestCase):
    def test_visual_provider_vertex_selection(self) -> None:
        for name in ("vertex", "imagen", "VERTEX"):
            with mock.patch.dict(os.environ, {"MYTHOS_VISUAL_PROVIDER": name}):
                self.assertIsInstance(default_visual_provider(), VertexImageProvider, name)

    def test_storage_backend_selection(self) -> None:
        with mock.patch.dict(os.environ, {"MYTHOS_STORAGE_BACKEND": "gcs"}):
            self.assertIsInstance(default_storage_adapter(), GCSStorageAdapter)
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("MYTHOS_STORAGE_BACKEND", None)
            self.assertIsInstance(default_storage_adapter(), MinIOStorageAdapter)

    def test_storage_adapter_for_maps_kind(self) -> None:
        # Write-path selector: preserves "minio"/"filesystem", adds "gcs".
        self.assertIsInstance(storage_adapter_for("gcs"), GCSStorageAdapter)
        self.assertIsInstance(storage_adapter_for("filesystem"), FilesystemStorageAdapter)
        self.assertIsInstance(storage_adapter_for("minio"), MinIOStorageAdapter)
        self.assertIsInstance(storage_adapter_for(""), MinIOStorageAdapter)

    def test_runtime_options_image_storage_env_default(self) -> None:
        from mythos_runtime.options import RuntimeOptions

        with mock.patch.dict(os.environ, {"MYTHOS_STORAGE_BACKEND": "gcs"}):
            self.assertEqual(RuntimeOptions().image_storage, "gcs")
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("MYTHOS_STORAGE_BACKEND", None)
            self.assertEqual(RuntimeOptions().image_storage, "minio")


if __name__ == "__main__":
    unittest.main()
