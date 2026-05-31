from __future__ import annotations

from mythos_core import LoopPhase, LoopState, Scene
from mythos_memory import MythOSStore
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.visual_queue import VisualJobQueue
from mythos_runtime.visual_service import (
    FilesystemStorageAdapter,
    MinIOStorageAdapter,
    VisualGenerationResult,
    VisualService,
)


def maybe_generate_scene_image(
    *,
    store: MythOSStore,
    options: RuntimeOptions,
    loop: LoopState,
    scene: Scene,
    player_id: str,
) -> VisualGenerationResult | None:
    if not options.with_image:
        return None
    if not options.image_every_turn and not is_key_beat(loop, scene):
        return None

    overrides = {
        "enabled": True,
        "width": options.image_width,
        "height": options.image_height,
        "steps": options.image_steps,
        "scenario_id": options.scenario_id,
    }

    if options.visual_async:
        queued = _try_enqueue_image_job(
            store=store,
            options=options,
            scene=scene,
            player_id=player_id,
            overrides=overrides,
        )
        if queued is not None:
            return queued
        if not options.image_sync_fallback or options.fast_mode:
            return None

    storage = (
        MinIOStorageAdapter() if options.image_storage == "minio" else FilesystemStorageAdapter()
    )
    service = VisualService(storage=storage, store=store)
    return service.generate_for_scene(
        scene,
        player_id=player_id,
        request_overrides=overrides,
    )


def is_key_beat(loop: LoopState, scene: Scene) -> bool:
    """Whether this scene warrants a costly representative image."""
    if scene.turn_index == 0:
        return True
    if loop.phase in {LoopPhase.REWRITE, LoopPhase.ARCHIVE, LoopPhase.ENDED}:
        return True
    if loop.tension >= 70 or loop.stability <= 30:
        return True
    return scene.turn_index % 3 == 0


def _try_enqueue_image_job(
    *,
    store: MythOSStore,
    options: RuntimeOptions,
    scene: Scene,
    player_id: str,
    overrides: dict,
) -> VisualGenerationResult | None:
    queue = VisualJobQueue()
    if not queue.worker_alive():
        return None
    if any(asset.status in {"pending", "processing"} for asset in store.list_assets(scene.loop_id)):
        return None

    service = VisualService(store=store)
    return service.enqueue_for_scene(
        scene,
        player_id=player_id,
        queue=queue,
        storage_kind=options.image_storage,
        request_overrides=overrides,
    )
