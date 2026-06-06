"""Loop-derivation helpers.

Pure functions that derive a new loop's starting scores from prior-run world
memories, classify a loop's emotional tone, and build archive-derived narrative
shards. Extracted from ``session`` to keep the orchestration class focused.
"""

from __future__ import annotations

from dataclasses import dataclass

from mythos_core import (
    Echo,
    LoopPhase,
    LoopState,
    NarrativeShard,
    Scene,
    WorldMemory,
    new_shard_id,
)
from mythos_core.clock import utc_now
from mythos_memory import MythOSStore
from mythos_runtime.narrative_rollup import _player_rollup


@dataclass(frozen=True)
class InitialLoopScores:
    stability: int
    tension: int
    state: dict


def _initial_loop_scores(
    world_memories: list[WorldMemory], player_id: str | None = None
) -> InitialLoopScores:
    base_stability = 70
    base_tension = 20
    archives = []
    for memory in world_memories[-8:]:
        if memory.kind == "loop_archive" and isinstance(memory.content, dict):
            if player_id is None or memory.content.get("player_id") == player_id:
                archives.append(memory.content)

    score_pairs = []
    for content in archives:
        s = content.get("stability")
        t = content.get("tension")
        if isinstance(s, int) and isinstance(t, int):
            score_pairs.append((s, t))

    rollup = _player_rollup(world_memories, player_id)
    if not score_pairs and rollup is None:
        return InitialLoopScores(
            stability=base_stability,
            tension=base_tension,
            state={},
        )

    recent_pairs = score_pairs[-5:]
    reasons: list[str] = []
    weight = len(recent_pairs)
    sum_stability: float = sum(pair[0] for pair in recent_pairs)
    sum_tension: float = sum(pair[1] for pair in recent_pairs)
    rollup_count = 0
    if rollup is not None:
        rollup_count = int(rollup.get("loop_count", 0))
        rollup_weight = min(rollup_count, 10)
        if rollup_weight > 0:
            sum_stability += float(rollup.get("avg_stability", base_stability)) * rollup_weight
            sum_tension += float(rollup.get("avg_tension", base_tension)) * rollup_weight
            weight += rollup_weight
            reasons.append("rollup_trend")
    if weight == 0:
        return InitialLoopScores(
            stability=base_stability,
            tension=base_tension,
            state={},
        )

    avg_stability = sum_stability / weight
    avg_tension = sum_tension / weight
    stability_delta = 0
    tension_delta = 0

    if avg_tension >= 70:
        stability_delta -= 5
        tension_delta += 8
        reasons.append("recent_archives_high_tension")
    elif avg_tension <= 25:
        tension_delta -= 3
        reasons.append("recent_archives_low_tension")

    if avg_stability <= 35:
        stability_delta -= 8
        tension_delta += 5
        reasons.append("recent_archives_low_stability")
    elif avg_stability >= 78:
        stability_delta += 4
        reasons.append("recent_archives_high_stability")

    archive_pressure = min(4, max(0, len(score_pairs) + rollup_count - 1))
    if archive_pressure:
        tension_delta += archive_pressure
        reasons.append("archive_pressure")

    stability = _clamp_score(base_stability + stability_delta)
    tension = _clamp_score(base_tension + tension_delta)
    state = {}
    if stability != base_stability or tension != base_tension:
        adjustment = {
            "stability_delta": stability - base_stability,
            "tension_delta": tension - base_tension,
            "sample_size": len(recent_pairs),
            "avg_stability": round(avg_stability, 2),
            "avg_tension": round(avg_tension, 2),
            "reasons": reasons,
        }
        if rollup_count:
            adjustment["rollup_loops"] = rollup_count
        state["initial_world_memory_adjustment"] = adjustment
    return InitialLoopScores(stability=stability, tension=tension, state=state)


def _narrative_shard_from_archive(loop: LoopState, scene: Scene, echo: Echo) -> NarrativeShard:
    return NarrativeShard(
        shard_id=new_shard_id(),
        loop_id=loop.loop_id,
        player_id=loop.player_id,
        symbol=echo.symbol,
        emotional_tone=_tone_from_loop(loop),
        text=f"{scene.title}: {scene.narration[:220].rstrip()}",
        weight=echo.weight,
        created_at=utc_now(),
    )


def _latest_scenes(store: MythOSStore, loops: list[LoopState], limit: int = 6) -> list[Scene]:
    scenes: list[Scene] = []
    for loop in loops[:limit]:
        scene = store.get_latest_scene(loop.loop_id)
        if scene is not None:
            scenes.append(scene)
    return scenes


def _tone_from_loop(loop: LoopState) -> str:
    if loop.tension >= 70:
        return "volatile"
    if loop.stability <= 35:
        return "fragile"
    if loop.phase is LoopPhase.ENDED:
        return "resolved"
    return "uncertain"


def _clamp_score(value: int) -> int:
    return max(0, min(100, value))
