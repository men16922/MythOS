from __future__ import annotations

from typing import Any

from mythos_core import WorldMemory, new_memory_id
from mythos_core.clock import utc_now
from mythos_memory import MythOSStore

DEFAULT_WORLD_ID = "mythos-local"
NARRATIVE_OUTCOMES = ("success", "provider_repair", "local_repair", "fallback")


def director_metric_total(director: Any) -> int:
    metrics = getattr(director, "metrics", None)
    return int(getattr(metrics, "total", 0) or 0)


def player_narrative_metrics(
    world_memories: list[WorldMemory], player_id: str | None
) -> dict[str, Any] | None:
    metrics = [
        memory
        for memory in world_memories
        if memory.kind == "narrative_metrics"
        and isinstance(memory.content, dict)
        and (player_id is None or memory.content.get("player_id") == player_id)
    ]
    if not metrics:
        return None
    return dict(sorted(metrics, key=lambda memory: memory.updated_at)[-1].content)


def save_narrative_metric_memory(
    store: MythOSStore,
    *,
    player_id: str,
    loop_id: str,
    outcome: str,
    increment: int = 1,
    world_id: str = DEFAULT_WORLD_ID,
) -> WorldMemory:
    world_memories = store.list_world_memories(world_id)
    existing = next(
        (
            memory
            for memory in world_memories
            if memory.kind == "narrative_metrics"
            and isinstance(memory.content, dict)
            and memory.content.get("player_id") == player_id
        ),
        None,
    )
    content = dict(existing.content) if existing else {}
    counts = dict(content.get("counts", {})) if isinstance(content.get("counts"), dict) else {}
    counts[outcome] = int(counts.get(outcome, 0)) + max(1, increment)
    counts = {key: int(counts.get(key, 0)) for key in NARRATIVE_OUTCOMES}
    total = sum(int(value) for value in counts.values())
    success = int(counts.get("success", 0))
    degraded = total - success
    ratios = {key: round(value / total, 4) if total else 0.0 for key, value in counts.items()}
    now = utc_now()
    updated = WorldMemory(
        memory_id=existing.memory_id if existing else new_memory_id(),
        world_id=world_id,
        kind="narrative_metrics",
        content={
            "player_id": player_id,
            "counts": counts,
            "total": total,
            "degraded": degraded,
            "success_ratio": round(success / total, 4) if total else 0.0,
            "degraded_ratio": round(degraded / total, 4) if total else 0.0,
            "ratios": ratios,
            "last_outcome": outcome,
            "last_loop_id": loop_id,
            "updated_at": now.isoformat(),
        },
        weight=1.0,
        created_at=existing.created_at if existing else now,
        updated_at=now,
    )
    store.save_world_memory(updated)
    return updated
