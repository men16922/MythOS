from __future__ import annotations

import os
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
    # Default honors MYTHOS_STORAGE_BACKEND (gcs|minio|filesystem) so one env var drives
    # all storage in the deployed container; unset → "minio" (local behavior unchanged).
    # Explicit callers (e.g. connect_cli --filesystem-image) still override.
    image_storage: str = field(
        default_factory=lambda: os.getenv("MYTHOS_STORAGE_BACKEND") or "minio"
    )
    image_width: int = 1024
    image_height: int = 1024
    image_steps: int = 4
    scenario_id: str = "neo-seoul"
    # Target narrative output language ("ko" | "en"). Threaded to the Narrative
    # Director via NarrativeContext.language. Default "ko" until S1 lands EN content;
    # the public/global default flips to "en" then (localization plan §3 S0/S1).
    language: str = "ko"
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
    clues_collected: int = 0
    epiphanies_unlocked: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class RuntimeStreamEvent:
    kind: Literal["text", "final"]
    text: str = ""
    snapshot: RuntimeSnapshot | None = None


@dataclass(frozen=True)
class RunSummary:
    """Player-facing record of a completed or archived loop."""

    run_id: str
    player_id: str
    loop_id: str
    scenario_id: str
    started_at: str
    ended_at: str
    ending_id: str | None
    ending_label: str
    final_title: str
    final_location: str
    phase: str
    stability: int
    tension: int
    turns: int
    combats_won: int
    combats_lost: int
    clues_collected: list[str]
    allies_met: list[str]
    unlocks_granted: list[str]
    summary_text: str
    relationships: dict[str, int] = field(default_factory=dict)
    unlocked_cutscenes: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SaveSlot:
    slot_id: str
    player_id: str
    loop_id: str
    scenario_id: str
    label: str
    scene_title: str
    phase: str
    saved_at: str
    stability: int
    tension: int
    turn_index: int
    in_combat: bool = False
    asset_id: str | None = None
    display_name: str = ""
    archetype: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class MemoryOverview:
    """Read-only view of a player's cross-loop memory, for UI/QA surfaces."""

    world_archives: list[WorldMemory]
    narrative_shards: list[NarrativeShard]
    novelty_notes: list[str]
    run_summaries: list[RunSummary] = field(default_factory=list)
    latest_adjustment: dict | None = None
    rollup: dict | None = None
    narrative_metrics: dict | None = None
    meta_progression: dict | None = None
    unlocked_lore: list[LoreEntry] = field(default_factory=list)
