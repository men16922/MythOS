from __future__ import annotations

import os
import shutil
from dataclasses import asdict, dataclass, field, replace
from pathlib import Path
from time import perf_counter
from typing import Protocol

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
from mythos_runtime.visual_queue import VisualJobQueue


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


def default_visual_provider(config: AgentConfig | None = None) -> VisualProvider:
    """Pick the image backend from config/env (`IMAGE_BACKEND`)."""
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

    def enqueue_for_scene(
        self,
        scene: Scene,
        player_id: str,
        queue: VisualJobQueue,
        storage_kind: str,
        request_overrides: dict | None = None,
    ) -> VisualGenerationResult:
        """Record a `pending` asset and enqueue an async job; returns immediately."""
        request = self._request_from_scene(scene, player_id, request_overrides or {})
        request = replace(request, asset_id=new_asset_id())
        pending = self._record(request=request, status="pending", storage_uri="", error=None)
        queue.enqueue(
            {
                "asset_id": request.asset_id,
                "storage_kind": storage_kind,
                "request": asdict(request),
            }
        )
        self.logger.info(
            "visual job enqueued",
            extra={
                "player_id": player_id,
                "loop_id": request.loop_id,
                "scene_id": request.scene_id,
                "asset_id": request.asset_id,
                "queue_depth": queue.depth(),
            },
        )
        return pending

    def generate(self, request: VisualGenerationRequest) -> VisualGenerationResult:
        if not request.enabled:
            return self._record(
                request=request,
                status="disabled",
                storage_uri="",
                error=None,
            )

        # Async jobs carry a pre-minted asset_id; flag it processing before the
        # (slow) provider call so the UI can show a "generating" state.
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
                reference_image = request.metadata.get("reference_image")
                if (
                    request.metadata.get("bypass_generation")
                    and reference_image
                    and Path(reference_image).exists()
                ):
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
