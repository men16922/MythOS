from __future__ import annotations

import os
import shutil
import time
from collections.abc import Callable
from dataclasses import dataclass, field, replace
from datetime import timedelta
from pathlib import Path
from time import perf_counter
from typing import Any, Protocol

from mythos_core import AssetRecord, Scene
from mythos_core.clock import utc_now
from mythos_core.ids import new_asset_id
from mythos_image_agent.config import PROJECT_ROOT, AgentConfig
from mythos_image_agent.generator import generate_image
from mythos_image_agent.img2img import generate_image_img2img
from mythos_image_agent.postprocess import apply_diegetic_overlay, apply_y2k_crt_effect
from mythos_memory import MythOSStore
from mythos_runtime.observability import get_logger, set_span_attribute, timed
from mythos_runtime.scenario import load_scenario


@dataclass(frozen=True)
class VisualGenerationRequest:
    player_id: str
    loop_id: str
    scene_id: str
    prompt: str
    seed: int = 42
    width: int = 1024
    height: int = 1024
    steps: int = 4
    provider: str = "flux_local_mps"
    model_id: str = "black-forest-labs/FLUX.1-schnell"
    enabled: bool = True
    metadata: dict = field(default_factory=dict)
    scenario_id: str = "neo-seoul"
    # Set for async jobs so pending/processing/succeeded records share one asset row.
    asset_id: str | None = None


@dataclass(frozen=True)
class VisualGenerationResult:
    asset: AssetRecord
    status: str
    storage_uri: str
    error: str | None = None

    @property
    def ok(self) -> bool:
        return self.status == "succeeded"


class VisualProvider(Protocol):
    def generate(self, request: VisualGenerationRequest, output_path: Path) -> Path:
        raise NotImplementedError


class StorageAdapter(Protocol):
    def store(self, source_path: Path, request: VisualGenerationRequest) -> str:
        raise NotImplementedError


@dataclass(frozen=True)
class LocalFluxProvider:
    config: AgentConfig = field(default_factory=AgentConfig)

    def generate(self, request: VisualGenerationRequest, output_path: Path) -> Path:
        reference_image = request.metadata.get("reference_image")
        use_ip_adapter = request.metadata.get("use_ip_adapter", False)

        if reference_image and Path(reference_image).exists():
            if use_ip_adapter:
                return generate_image(
                    prompt=request.prompt,
                    output_path=output_path,
                    config=self.config,
                    model_id_override=request.model_id,
                    seed=request.seed,
                    steps=request.steps,
                    width=request.width,
                    height=request.height,
                    ip_adapter_image_path=Path(reference_image),
                    ip_adapter_scale=request.metadata.get("ip_adapter_scale", 0.6),
                )
            else:
                return generate_image_img2img(
                    reference_path=Path(reference_image),
                    prompt=request.prompt,
                    output_path=output_path,
                    config=self.config,
                    strength=request.metadata.get("img2img_strength", 0.6),
                    model_id_override=request.model_id,
                    seed=request.seed,
                    steps=request.steps,
                    width=request.width,
                    height=request.height,
                )

        return generate_image(
            prompt=request.prompt,
            output_path=output_path,
            config=self.config,
            model_id_override=request.model_id,
            seed=request.seed,
            steps=request.steps,
            width=request.width,
            height=request.height,
        )


@dataclass(frozen=True)
class MfluxProvider:
    """Apple MLX (mflux) backend — faster + quantized; supports img2img via reference."""

    config: AgentConfig = field(default_factory=AgentConfig)

    def generate(self, request: VisualGenerationRequest, output_path: Path) -> Path:
        from mythos_image_agent.mflux_generator import generate_image_mflux

        reference_image = request.metadata.get("reference_image")
        ref = reference_image if reference_image and Path(reference_image).exists() else None
        if ref and request.metadata.get("use_redux"):
            from mythos_image_agent.mflux_generator import generate_image_mflux_redux

            return generate_image_mflux_redux(
                prompt=request.prompt,
                output_path=output_path,
                reference_path=ref,
                redux_strength=float(request.metadata.get("redux_strength", 0.9)),
                seed=request.seed,
                steps=request.steps,
                width=request.width,
                height=request.height,
                quantize=self.config.mflux_quantize,
                guidance=self.config.guidance_scale,
            )
        return generate_image_mflux(
            prompt=request.prompt,
            output_path=output_path,
            seed=request.seed,
            steps=request.steps,
            width=request.width,
            height=request.height,
            quantize=self.config.mflux_quantize,
            guidance=self.config.guidance_scale,
            reference_path=ref,
            image_strength=request.metadata.get("img2img_strength", 0.6) if ref else None,
        )


def _env(*names: str, default: str | None = None) -> str | None:
    """First non-empty value among env-var aliases (later names are fallbacks)."""
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip() != "":
            return value
    return default


# Imagen has no free width/height — it takes a discrete aspect ratio. Map the
# request's pixel dims to the nearest supported ratio.
_IMAGEN_ASPECT_RATIOS = {"1:1": 1.0, "3:4": 0.75, "4:3": 4 / 3, "9:16": 0.5625, "16:9": 16 / 9}


def _nearest_aspect_ratio(width: int, height: int) -> str:
    ratio = (width / height) if height else 1.0
    return min(_IMAGEN_ASPECT_RATIOS, key=lambda k: abs(_IMAGEN_ASPECT_RATIOS[k] - ratio))


# Transient Imagen failures worth a re-roll (prod Neon evidence 2026-07-11, 7
# failed assets): ``429 RESOURCE_EXHAUSTED`` = the per-minute
# online_prediction_requests_per_base_model quota tripping on bursty multi-turn
# image runs, and an EMPTY ``generated_images`` list = the safety filter
# rejecting one stochastic sample — both usually succeed on retry. The scene
# image is already deferred behind the choices (session #5 image-decouple), so
# a bounded wait costs no interactivity.
_QUOTA_RETRY_DELAYS_S = (8.0, 15.0)
_EMPTY_RETRY_DELAY_S = 1.5


def _is_imagen_quota_error(exc: Exception) -> bool:
    text = str(exc)
    return "429" in text or "RESOURCE_EXHAUSTED" in text


def _is_retryable_imagen_error(exc: Exception) -> bool:
    return _is_imagen_quota_error(exc) or "returned no images" in str(exc)


def _first_image_bytes(response: object) -> bytes:
    """Extract PNG bytes from a google-genai GenerateImagesResponse (tolerant of shape)."""
    images = getattr(response, "generated_images", None) or []
    if not images:
        raise RuntimeError("Vertex Imagen returned no images")
    image = getattr(images[0], "image", images[0])
    data = getattr(image, "image_bytes", None)
    if not isinstance(data, (bytes, bytearray)):
        raise RuntimeError("Vertex Imagen image had no image_bytes")
    return bytes(data)


class VertexImageProvider:
    """``VisualProvider`` backed by Vertex AI **Imagen** (cloud product image path).

    Mirrors the narrative ``VertexGeminiJSONProvider``: the `google-genai` SDK is an
    optional dep imported lazily inside ``_client()`` and the client is injectable for
    tests. Replaces the local FLUX/MPS pipeline with an API call — the cloud cost driver
    (`GCP_PLAN.md` §1), so anchor curation still skips most generations upstream. Reuses
    the same env names as the narrative provider (``GOOGLE_CLOUD_PROJECT``/``PROJECT_ID``,
    ``GOOGLE_GENAI_USE_VERTEXAI``); the model is ``IMAGEN_MODEL`` (default imagen-3).
    """

    def __init__(
        self,
        *,
        model: str | None = None,
        project: str | None = None,
        location: str | None = None,
        use_vertex: bool | None = None,
        api_key: str | None = None,
        number_of_images: int = 1,
        client: object = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._sleep = sleep
        self.model = model or _env("IMAGEN_MODEL", "IMAGE_MODEL_ID_VERTEX") or "imagen-3.0-generate-002"
        # Truth labels for asset records/logs: requests are stamped with local-FLUX
        # defaults, which must not survive onto a billed cloud generation.
        self.provider_label = "vertex_imagen"
        self.model_label = self.model
        self.project = project or _env("GOOGLE_CLOUD_PROJECT", "PROJECT_ID")
        self.location = location or _env("GOOGLE_CLOUD_LOCATION") or "us-central1"
        if use_vertex is None:
            use_vertex = (
                _env("GOOGLE_GENAI_USE_VERTEXAI", "GEMINI_USE_VERTEX", default="true") or "true"
            ).strip().lower() in {"1", "true", "yes", "on"}
        self.use_vertex = use_vertex
        self.api_key = api_key or _env("GOOGLE_API_KEY", "GEMINI_API_KEY")
        self.number_of_images = number_of_images
        self._injected_client = client

    def _client(self) -> Any:
        if self._injected_client is not None:
            return self._injected_client
        try:
            from google import genai  # type: ignore[import-not-found]
        except ImportError as exc:  # pragma: no cover - exercised only without the SDK
            raise RuntimeError(
                "google-genai is not installed. Install the cloud image provider with "
                "`pip install -e .[gemini]` to use MYTHOS_VISUAL_PROVIDER=vertex."
            ) from exc
        if self.use_vertex:
            self._injected_client = genai.Client(  # type: ignore[attr-defined]
                vertexai=True, project=self.project, location=self.location
            )
        else:
            self._injected_client = genai.Client(api_key=self.api_key)  # type: ignore[attr-defined]
        return self._injected_client

    def generate(self, request: VisualGenerationRequest, output_path: Path) -> Path:
        client = self._client()
        config = {
            "number_of_images": self.number_of_images,
            "aspect_ratio": _nearest_aspect_ratio(request.width, request.height),
        }
        model = request.metadata.get("vertex_image_model") or self.model
        attempts = len(_QUOTA_RETRY_DELAYS_S) + 1
        for attempt in range(attempts):
            try:
                response = client.models.generate_images(
                    model=model,
                    prompt=request.prompt,
                    config=config,
                )
                data = _first_image_bytes(response)
            except Exception as exc:
                if attempt >= attempts - 1 or not _is_retryable_imagen_error(exc):
                    raise
                self._sleep(
                    _QUOTA_RETRY_DELAYS_S[attempt]
                    if _is_imagen_quota_error(exc)
                    else _EMPTY_RETRY_DELAY_S
                )
                continue
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(data)
            return output_path
        raise RuntimeError("unreachable: imagen retry loop exhausted")  # pragma: no cover


def default_visual_provider(config: AgentConfig | None = None) -> VisualProvider:
    """Pick the image backend from env (`MYTHOS_VISUAL_PROVIDER`) / config (`IMAGE_BACKEND`).

    ``MYTHOS_VISUAL_PROVIDER=vertex|imagen`` → cloud Imagen; otherwise the local
    backend (`mflux` default, else diffusers FLUX) per `IMAGE_BACKEND`.
    """
    backend = (os.getenv("MYTHOS_VISUAL_PROVIDER") or "").strip().lower()
    if backend in {"vertex", "imagen"}:
        return VertexImageProvider()
    cfg = config or AgentConfig()
    if cfg.image_backend.lower() == "mflux":
        return MfluxProvider(cfg)
    return LocalFluxProvider(cfg)


@dataclass(frozen=True)
class FilesystemStorageAdapter:
    root_dir: Path = PROJECT_ROOT / "outputs" / "images"

    def store(self, source_path: Path, request: VisualGenerationRequest) -> str:
        target = self.root_dir / request.player_id / request.loop_id / f"{request.scene_id}.png"
        target.parent.mkdir(parents=True, exist_ok=True)
        if source_path.resolve() != target.resolve():
            shutil.copy2(source_path, target)
        return str(target)


@dataclass(frozen=True)
class MinIOStorageAdapter:
    endpoint_url: str = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
    access_key: str = os.getenv("S3_ACCESS_KEY", "mythos")
    secret_key: str = os.getenv("S3_SECRET_KEY", "mythos-local-secret")
    bucket: str = os.getenv("S3_BUCKET_ASSETS", "mythos-assets")

    def _client(self):  # type: ignore[no-untyped-def]
        try:
            import boto3
        except ImportError as exc:
            raise RuntimeError("boto3 is required for MinIO/S3 access") from exc
        return boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        )

    def store(self, source_path: Path, request: VisualGenerationRequest) -> str:
        key = f"images/{request.player_id}/{request.loop_id}/{request.scene_id}.png"
        self._client().upload_file(
            str(source_path),
            self.bucket,
            key,
            ExtraArgs={"ContentType": "image/png"},
        )
        return f"s3://{self.bucket}/{key}"

    def presigned_url(self, storage_uri: str, expires_in: int = 600) -> str:
        """Sign a time-limited HTTPS GET URL for an ``s3://bucket/key`` address.

        Direct bucket access is not exposed to clients; the read API virtualizes
        the logical ``storage_uri`` into a short-lived presigned URL (design §5.2).
        Non-``s3://`` URIs (e.g. local filesystem paths) are returned unchanged.
        """
        if not storage_uri.startswith("s3://"):
            return storage_uri
        without_scheme = storage_uri[len("s3://") :]
        bucket, _, key = without_scheme.partition("/")
        if not key:
            raise ValueError(f"malformed s3 uri: {storage_uri}")
        url = self._client().generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expires_in,
        )
        return str(url)


class GCSStorageAdapter:
    """``StorageAdapter`` backed by Google Cloud Storage (cloud asset path).

    The GCP analogue of ``MinIOStorageAdapter``: same logical key layout, returns a
    ``gs://bucket/key`` URI, and signs a v4 read URL (the read API never exposes the
    bucket directly — design §5.2). `google-cloud-storage` is an optional dep imported
    lazily; the client is injectable for tests. Bucket/project env names mirror the GCP
    convention (``GCS_BUCKET_ASSETS`` falling back to the existing ``S3_BUCKET_ASSETS``).
    """

    def __init__(
        self,
        *,
        bucket: str | None = None,
        project: str | None = None,
        client: object = None,
    ) -> None:
        self.bucket = bucket or _env("GCS_BUCKET_ASSETS", "S3_BUCKET_ASSETS") or "mythos-assets"
        self.project = project or _env("GOOGLE_CLOUD_PROJECT", "PROJECT_ID")
        self._injected_client = client
        # Lazily-built cloud-platform-scoped credentials for the IAM signBlob
        # fallback (the storage client's own token is storage-scoped only).
        self._signing_credentials: Any = None

    def _client(self) -> Any:
        if self._injected_client is not None:
            return self._injected_client
        try:
            from google.cloud import storage  # type: ignore[import-not-found]
        except ImportError as exc:  # pragma: no cover - exercised only without the SDK
            raise RuntimeError(
                "google-cloud-storage is required for GCS access. Install with "
                "`pip install -e .[gcs]`."
            ) from exc
        self._injected_client = storage.Client(project=self.project)
        return self._injected_client

    def store(self, source_path: Path, request: VisualGenerationRequest) -> str:
        key = f"images/{request.player_id}/{request.loop_id}/{request.scene_id}.png"
        blob = self._client().bucket(self.bucket).blob(key)
        blob.upload_from_filename(str(source_path), content_type="image/png")
        return f"gs://{self.bucket}/{key}"

    def presigned_url(self, storage_uri: str, expires_in: int = 600) -> str:
        """Sign a time-limited v4 HTTPS GET URL for a ``gs://bucket/key`` address.

        Non-``gs://`` URIs (filesystem paths) are returned unchanged, matching
        ``MinIOStorageAdapter.presigned_url``.
        """
        if not storage_uri.startswith("gs://"):
            return storage_uri
        without_scheme = storage_uri[len("gs://") :]
        bucket, _, key = without_scheme.partition("/")
        if not key:
            raise ValueError(f"malformed gs uri: {storage_uri}")
        client = self._client()
        blob = client.bucket(bucket).blob(key)
        sign_kwargs: dict[str, Any] = {
            "version": "v4",
            "expiration": timedelta(seconds=expires_in),
            "method": "GET",
        }
        try:
            return str(blob.generate_signed_url(**sign_kwargs))
        except AttributeError:
            # Cloud Run / GCE metadata credentials carry an access token but no
            # private key, so local v4 signing raises AttributeError. Route the
            # signature through the IAM signBlob API instead (requires
            # roles/iam.serviceAccountTokenCreator on the runtime SA). The
            # storage client's own token is storage-scoped and gets 403
            # ACCESS_TOKEN_SCOPE_INSUFFICIENT from signBlob, so signing uses
            # dedicated cloud-platform-scoped credentials.
            import google.auth
            from google.auth.transport import requests as google_auth_requests

            credentials = self._signing_credentials
            if credentials is None:
                credentials, _ = google.auth.default(
                    scopes=["https://www.googleapis.com/auth/cloud-platform"]
                )
                self._signing_credentials = credentials
            if not getattr(credentials, "valid", False):
                credentials.refresh(google_auth_requests.Request())
            return str(
                blob.generate_signed_url(
                    **sign_kwargs,
                    service_account_email=credentials.service_account_email,
                    access_token=credentials.token,
                )
            )


def storage_adapter_for(kind: str) -> StorageAdapter:
    """Map a storage-kind string to an adapter (the write-path selector).

    ``gcs`` → GCS; ``filesystem`` → local dir; anything else (incl. ``minio``/empty)
    → MinIO/S3. Preserves the prior ``"minio" vs filesystem`` behavior and adds gcs.
    """
    k = (kind or "").strip().lower()
    if k == "gcs":
        return GCSStorageAdapter()
    if k == "filesystem":
        return FilesystemStorageAdapter()
    return MinIOStorageAdapter()


def default_storage_adapter() -> StorageAdapter:
    """Pick the storage backend from env (`MYTHOS_STORAGE_BACKEND`, default ``minio``)."""
    return storage_adapter_for(os.getenv("MYTHOS_STORAGE_BACKEND") or "minio")


class VisualService:
    def __init__(
        self,
        provider: VisualProvider | None = None,
        storage: StorageAdapter | None = None,
        store: MythOSStore | None = None,
        work_dir: Path | None = None,
    ) -> None:
        self.provider = provider or default_visual_provider()
        self.storage = storage or FilesystemStorageAdapter()
        self.store = store
        self.work_dir = work_dir or PROJECT_ROOT / "outputs" / "visual-work"
        self.logger = get_logger("mythos.visual")

    def generate_for_scene(
        self,
        scene: Scene,
        player_id: str,
        request_overrides: dict | None = None,
    ) -> VisualGenerationResult:
        request = self._request_from_scene(scene, player_id, request_overrides or {})
        return self.generate(request)

    def generate(self, request: VisualGenerationRequest) -> VisualGenerationResult:
        if not request.enabled:
            return self._record(
                request=request,
                status="disabled",
                storage_uri="",
                error=None,
            )

        # Requests are stamped with local-FLUX defaults; the engine actually
        # generating is env-selected here. Reconcile the labels before any
        # record/log so a billed cloud generation is never recorded as local
        # (bit us during live provider verification: Imagen ran, logs said FLUX).
        reference_image = request.metadata.get("reference_image")
        will_bypass = bool(
            request.metadata.get("bypass_generation")
            and reference_image
            and Path(reference_image).exists()
        )
        if not will_bypass:
            request = replace(
                request,
                provider=getattr(self.provider, "provider_label", None) or request.provider,
                model_id=getattr(self.provider, "model_label", None) or request.model_id,
            )

        # A pre-minted asset_id means the caller already recorded the attempt;
        # flag it processing before the (slow) provider call so the UI can show
        # a "generating" state.
        if request.asset_id is not None:
            self._record(request=request, status="processing", storage_uri="", error=None)

        output_path = self._work_output_path(request)
        provider_ms = 0.0
        postprocess_ms = 0.0
        storage_ms = 0.0
        overall_start = perf_counter()
        try:
            with timed(
                "mythos.visual.generate",
                self.logger,
                "visual generation finished",
                player_id=request.player_id,
                loop_id=request.loop_id,
                scene_id=request.scene_id,
                provider=request.provider,
                model_id=request.model_id,
            ):
                provider_start = perf_counter()
                if will_bypass and reference_image:
                    shutil.copy2(reference_image, output_path)
                    generated_path = output_path
                else:
                    generated_path = self.provider.generate(request, output_path)
                provider_ms = round((perf_counter() - provider_start) * 1000, 3)
                set_span_attribute("mythos.visual.provider_ms", provider_ms)

                # Apply Y2K Post-processing with intensity based on autonomy level
                postprocess_start = perf_counter()
                autonomy_level = request.metadata.get("autonomy_level", 1)
                # Scale intensity from 0.5 (LV 1) to 2.5 (LV 5)
                glitch_intensity = 0.5 + (autonomy_level - 1) * 0.5

                if request.metadata.get("y2k_effect", True):
                    apply_y2k_crt_effect(generated_path, intensity=glitch_intensity)

                # Apply Diegetic Overlay
                if request.metadata.get("diegetic_overlay", True):
                    apply_diegetic_overlay(
                        generated_path,
                        text=request.metadata.get("overlay_title", "NEO-SEOUL"),
                        status_lines=request.metadata.get("overlay_status", []),
                    )
                postprocess_ms = round((perf_counter() - postprocess_start) * 1000, 3)
                set_span_attribute("mythos.visual.postprocess_ms", postprocess_ms)

                storage_start = perf_counter()
                storage_uri = self.storage.store(generated_path, request)
                storage_ms = round((perf_counter() - storage_start) * 1000, 3)
                set_span_attribute("mythos.visual.storage_ms", storage_ms)

                # Remove the local working copy now that the canonical artifact is
                # stored elsewhere (MinIO upload, or a filesystem copy at a
                # different path). Skip when the stored artifact IS this file
                # (filesystem adapter pointed at the work dir). Prevents the
                # outputs/visual-work/ dir from growing unbounded.
                stored_is_work_file = (
                    not storage_uri.startswith("s3://")
                    and Path(storage_uri).resolve() == generated_path.resolve()
                )
                if not stored_is_work_file:
                    try:
                        generated_path.unlink(missing_ok=True)
                        generated_path.parent.rmdir()  # best-effort: remove empty loop dir
                    except OSError:
                        pass

            overall_ms = round((perf_counter() - overall_start) * 1000, 3)
            # Record detailed segments in request metadata
            detailed_request = replace(
                request,
                metadata={
                    **request.metadata,
                    "latency_ms": overall_ms,
                    "provider_ms": provider_ms,
                    "postprocess_ms": postprocess_ms,
                    "storage_ms": storage_ms,
                },
            )

            self.logger.info(
                "visual segments latency detailed",
                extra={
                    "player_id": request.player_id,
                    "loop_id": request.loop_id,
                    "scene_id": request.scene_id,
                    "latency_ms": overall_ms,
                    "provider_ms": provider_ms,
                    "postprocess_ms": postprocess_ms,
                    "storage_ms": storage_ms,
                },
            )

            return self._record(
                request=detailed_request,
                status="succeeded",
                storage_uri=storage_uri,
                error=None,
            )
        except Exception as exc:
            overall_ms = round((perf_counter() - overall_start) * 1000, 3)
            # Fallback metadata in case of partial success
            error_request = replace(
                request,
                metadata={
                    **request.metadata,
                    "latency_ms": overall_ms,
                    "provider_ms": provider_ms,
                    "postprocess_ms": postprocess_ms,
                    "storage_ms": storage_ms,
                },
            )
            return self._record(
                request=error_request,
                status="failed",
                storage_uri="",
                error=str(exc),
            )

    def _request_from_scene(
        self, scene: Scene, player_id: str, overrides: dict
    ) -> VisualGenerationRequest:
        prompt = scene.visual_brief or scene.narration
        scenario_id = overrides.get("scenario_id", "neo-seoul")
        scenario = load_scenario(scenario_id)

        # Get autonomy level for visual scaling
        player = self.store.get_player(player_id) if self.store else None
        autonomy_level = 1
        if player and isinstance(player.traits, dict):
            autonomy_level = int(player.traits.get("autonomy_level", 1))

        # Character / Concept detection for identity-steered generation.
        # Detection scans the Korean narration (+title +brief) because the LLM's
        # English visual_brief rarely contains the character id, so matching only
        # the prompt missed almost every character scene → faces drifted.
        reference_image = None
        detected_tag = None
        is_character = False
        lower_prompt = prompt.lower()
        detect_text = f"{scene.narration} {scene.title} {prompt}".lower()

        # 0. Opening cinematic turns keep the curated cut (visual continuity).
        if (
            scene.turn_index <= 2
            and scene.objective
            and (
                "정세린" in scene.narration
                or "세린" in scene.narration
                or "C-17" in scene.narration
                or "드론" in scene.narration
            )
        ):
            opening_shots = [
                "opening/opening-01-serin-arrival.png",
                "opening/opening-02-first-contact.png",
                "opening/opening-03-drone-chase.png",
            ]
            if scene.turn_index < len(opening_shots):
                rel_path = opening_shots[scene.turn_index]
                reference_image = str(PROJECT_ROOT / "resources" / scenario_id / rel_path)
                detected_tag = f"opening_shot_{scene.turn_index}"

        # 1. Known character present (by keyword) → steer identity to their portrait.
        if not reference_image:
            for entry in scenario.characters:
                image = str(entry.get("image", "")).strip()
                keywords = entry.get("keywords", [])
                if not image or not isinstance(keywords, list):
                    continue
                if any(str(kw).lower() in detect_text for kw in keywords if str(kw).strip()):
                    reference_image = str(PROJECT_ROOT / "resources" / scenario_id / image)
                    detected_tag = Path(image).stem  # stable, language-neutral tag
                    is_character = True
                    # Text-side identity anchor: cloud Imagen is text-to-image only
                    # (no Redux/reference support), so a canonical appearance line is
                    # the only consistency lever there. Inject ONLY when the character
                    # actually appears in the image PROMPT itself — detection scans the
                    # narration too, and appending an appearance for someone the brief
                    # doesn't depict forces a phantom figure into the composition
                    # (live 2026-07-04: a giant floating Se-rin over a manhole scene).
                    appearance = str(entry.get("appearance") or "").strip()
                    in_prompt = any(
                        str(kw).lower() in lower_prompt for kw in keywords if str(kw).strip()
                    )
                    if appearance and in_prompt:
                        prompt = f"{prompt}. Character appearance (keep consistent): {appearance}"
                    break

        # 1b. Fallback to legacy character_map (id appears in the English brief).
        if not reference_image:
            for key, rel_path in scenario.character_map.items():
                if key in lower_prompt:
                    reference_image = str(PROJECT_ROOT / "resources" / scenario_id / rel_path)
                    detected_tag = key
                    is_character = True
                    break

        # 2. Concept images if no character detected.
        if not reference_image:
            for key, rel_path in scenario.concept_map.items():
                if key in lower_prompt:
                    reference_image = str(PROJECT_ROOT / "resources" / scenario_id / rel_path)
                    detected_tag = key
                    break

        metadata = {
            **overrides.get("metadata", {}),
            "overlay_title": scene.location,
            "overlay_status": [f"SIGNAL: {player_id[:8]}", f"LOC: {scene.location}"],
            "img2img_strength": 0.45,
            "autonomy_level": autonomy_level,
        }
        if reference_image:
            metadata["reference_image"] = reference_image
            metadata["detected_tag"] = detected_tag
            if detected_tag and str(detected_tag).startswith("opening_shot"):
                # Fresh scene guided by the opening cut (not a verbatim copy).
                metadata["img2img_strength"] = 0.4
            elif is_character:
                # Redux identity steering keeps the character's face consistent
                # with their portrait without inheriting the reference composition.
                metadata["use_redux"] = True
                metadata["redux_strength"] = overrides.get("metadata", {}).get(
                    "redux_strength", 0.9
                )
                # Kept for the diffusers (LocalFluxProvider) backend fallback.
                metadata["use_ip_adapter"] = True
                metadata["ip_adapter_scale"] = overrides.get("metadata", {}).get(
                    "ip_adapter_scale", 0.6
                )

        return VisualGenerationRequest(
            player_id=player_id,
            loop_id=scene.loop_id,
            scene_id=scene.scene_id,
            prompt=prompt,
            seed=overrides.get("seed", 42),
            width=overrides.get("width", 1024),
            height=overrides.get("height", 1024),
            steps=overrides.get("steps", 4),
            provider=overrides.get("provider", "flux_local_mps"),
            model_id=overrides.get("model_id", "black-forest-labs/FLUX.1-schnell"),
            enabled=overrides.get("enabled", True),
            metadata=metadata,
            scenario_id=scenario_id,
        )

    def _work_output_path(self, request: VisualGenerationRequest) -> Path:
        return self.work_dir / request.loop_id / f"{request.scene_id}.png"

    def _record(
        self,
        request: VisualGenerationRequest,
        status: str,
        storage_uri: str,
        error: str | None,
    ) -> VisualGenerationResult:
        metadata = {
            **request.metadata,
            "status": status,
        }
        if error:
            metadata["error"] = error
        asset = AssetRecord(
            asset_id=request.asset_id or new_asset_id(),
            scene_id=request.scene_id,
            loop_id=request.loop_id,
            provider=request.provider,
            model_id=request.model_id,
            prompt=request.prompt,
            seed=request.seed,
            width=request.width,
            height=request.height,
            steps=request.steps,
            storage_uri=storage_uri,
            metadata=metadata,
            created_at=utc_now(),
            status=status,
        )
        if self.store is not None:
            self.store.save_asset(asset)
        extra = {
            "player_id": request.player_id,
            "loop_id": request.loop_id,
            "scene_id": request.scene_id,
            "asset_id": asset.asset_id,
            "provider": request.provider,
            "model_id": request.model_id,
            "status": status,
        }
        for k in ("latency_ms", "provider_ms", "postprocess_ms", "storage_ms"):
            if k in request.metadata:
                extra[k] = request.metadata[k]

        self.logger.info("visual asset recorded", extra=extra)
        return VisualGenerationResult(
            asset=asset,
            status=status,
            storage_uri=storage_uri,
            error=error,
        )
