from __future__ import annotations

from mythos_core import LoopPhase, LoopState, Scene
from mythos_core.clock import utc_now
from mythos_memory import MythOSStore
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.route_map import ROUTE_MAP_KEY
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
    # On an anchor with a pre-authored curated image, the frontend already shows
    # that image (StoryPanel prefers route node `image` over the generated asset),
    # so running FLUX here only burns a slow turn on an image nobody sees. Skip it.
    if _curated_anchor_image(loop):
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


def _curated_anchor_image(loop: LoopState) -> str | None:
    """Return the current route node's curated image when it's an anchor that has
    one. Matches the frontend's display rule (StoryPanel: `currentNode.anchor &&
    currentNode.image`) so the backend skips FLUX exactly when the curated image
    is what the player actually sees."""
    state = loop.state if isinstance(loop.state, dict) else {}
    route_map = state.get(ROUTE_MAP_KEY)
    if not isinstance(route_map, dict):
        return None
    current = route_map.get("current")
    nodes = route_map.get("nodes")
    if not current or not isinstance(nodes, dict):
        return None
    node = nodes.get(current)
    if isinstance(node, dict) and node.get("anchor") and node.get("image"):
        return str(node["image"])
    return None


# A pending/processing asset older than this is treated as stale (the worker died
# mid-flight, so the job is lost). Without this, one orphaned `pending` row would
# block every future enqueue for the rest of the loop — no more scene images at all.
# Generous enough to never collide with a legitimately slow FLUX generation.
_INFLIGHT_TTL_SECONDS = 300


def _has_inflight_asset(store: MythOSStore, loop_id: str) -> bool:
    """True if a recent pending/processing asset is genuinely still in flight.

    Stale rows (older than `_INFLIGHT_TTL_SECONDS`) are ignored so a worker that
    died mid-job doesn't permanently wedge image generation for the loop."""
    now = utc_now()
    for asset in store.list_assets(loop_id):
        if asset.status not in {"pending", "processing"}:
            continue
        created = asset.created_at
        if created is None:
            return True  # unknown age — stay conservative and treat as in flight
        if (now - created).total_seconds() < _INFLIGHT_TTL_SECONDS:
            return True
    return False


def is_key_beat(loop: LoopState, scene: Scene) -> bool:
    """Whether this scene warrants a costly representative image."""
    if scene.turn_index == 0:
        return True
    if scene.scene_type == "combat":
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
    if _has_inflight_asset(store, scene.loop_id):
        return None

    service = VisualService(store=store)
    return service.enqueue_for_scene(
        scene,
        player_id=player_id,
        queue=queue,
        storage_kind=options.image_storage,
        request_overrides=overrides,
    )
