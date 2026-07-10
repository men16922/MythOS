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
    # When False (default), only generate images on key beats; True forces every turn.
    image_every_turn: bool = False
    # Streaming-only: when True, ``_commit_scene`` skips the synchronous scene-image
    # generation so the choices-carrying snapshot is emitted immediately; the stream
    # then generates the image AFTER the snapshot and delivers it as a trailing
    # ``visual`` event (→ visual_status frame). Measured on prod (2026-07-10): image
    # gen adds a p50 ~6s / max ~15s dead wait between narration and choices, and its
    # multi-minute hangs stranded whole turns (4% failed, two 7-8min). REST callers
    # keep the inline image (image_result on the returned snapshot) — default False.
    defer_image: bool = False


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
    # In-run build boons: {"offer": [card,...] | None, "active": [card,...]}.
    boons: dict[str, Any] | None = None
    # Market exchange (only while on a market route node): {"offers": [...], "held": {...}}.
    market: dict[str, Any] | None = None


@dataclass(frozen=True)
class RuntimeStreamEvent:
    # ``meta`` is emitted once at the start of ``stream_start_loop`` — after the
    # loop (and its opening variant) is prepared but BEFORE the slow narrative
    # generation — so the client can reveal the correct opening intro sequence
    # immediately instead of racing a timeout and flashing the default cut.
    # ``visual`` trails a ``final`` snapshot on the streaming path: the scene image
    # is generated AFTER choices are delivered (see RuntimeOptions.defer_image) and
    # handed back here so the socket relays it as a visual_status frame.
    kind: Literal["text", "final", "meta", "visual"]
    text: str = ""
    snapshot: RuntimeSnapshot | None = None
    opening_variant: str | None = None
    runs_completed: int | None = None
    visual: VisualGenerationResult | None = None


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
