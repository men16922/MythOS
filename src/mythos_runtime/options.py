from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from mythos_core import (
    AssetRecord,
    Echo,
    LoopState,
    NarrativeShard,
    PlayerProfile,
    Scene,
    WorldMemory,
)
from mythos_narrative.codex import LoreEntry
from mythos_runtime.visual_service import VisualGenerationResult


@dataclass(frozen=True)
class RuntimeOptions:
    # Player-facing flows should prioritize fast perceived response. Developer flows
    # can turn this off for full repair/fallback QA and blocking image fallbacks.
    fast_mode: bool = True
    fallback: bool = False
    with_image: bool = False
    image_storage: str = "minio"
    image_width: int = 1024
    image_height: int = 1024
    image_steps: int = 4
    scenario_id: str = "neo-seoul"
    # When True, enqueue image generation to Redis (non-blocking) if a live worker
    # is present; otherwise fall back to synchronous generation.
    visual_async: bool = False
    # When False (default), only generate images on key beats; True forces every turn.
    image_every_turn: bool = False
    # When False, async image mode never falls back to blocking local generation.
    image_sync_fallback: bool = False


@dataclass(frozen=True)
class RuntimeSnapshot:
    player: PlayerProfile
    loop: LoopState
    scene: Scene
    assets: list[AssetRecord]
    image_result: VisualGenerationResult | None = None
    echo: Echo | None = None
    bgm_path: str | None = None
    # Populated only on combat turns: {radar, available, finished, outcome, rewards}.
    combat: dict[str, Any] | None = None


@dataclass(frozen=True)
class RuntimeStreamEvent:
    kind: Literal["text", "final"]
    text: str = ""
    snapshot: RuntimeSnapshot | None = None


@dataclass(frozen=True)
class MemoryOverview:
    """Read-only view of a player's cross-loop memory, for UI/QA surfaces."""

    world_archives: list[WorldMemory]
    narrative_shards: list[NarrativeShard]
    novelty_notes: list[str]
    latest_adjustment: dict | None = None
    rollup: dict | None = None
    unlocked_lore: list[LoreEntry] = field(default_factory=list)
