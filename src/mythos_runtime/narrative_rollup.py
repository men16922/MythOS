"""Long-term narrative/archive memory compaction.

Extracted from ``session`` to isolate the rollup responsibility: rolling old
``narrative_shards`` into a per-player ``causality_summary`` and old
``loop_archive`` world memories into a statistical ``archive_rollup``. These are
pure helpers over a :class:`MythOSStore`; the orchestration layer calls them.
"""

from __future__ import annotations

from dataclasses import replace
from typing import Any

from mythos_core import NarrativeShard, PlayerMemory, WorldMemory, new_memory_id
from mythos_core.clock import utc_now
from mythos_core.models import to_json_dict
from mythos_memory import MythOSStore
from mythos_runtime.constants import (
    ARCHIVE_RETENTION,
    MYTHOS_WORLD_ID,
    SHARD_CONTEXT_RETENTION,
    SHARD_ROLLUP_TRIGGER_CHARS,
    SHARD_ROLLUP_TRIGGER_COUNT,
    SHARD_ROLLUP_TRIGGER_TURN,
)


def _player_rollup(world_memories: list[WorldMemory], player_id: str | None) -> dict | None:
    for memory in world_memories:
        content = memory.content
        if (
            memory.kind == "archive_rollup"
            and isinstance(content, dict)
            and (player_id is None or content.get("player_id") == player_id)
        ):
            return content
    return None


def _latest_causality_summary(memories: list[PlayerMemory], player_id: str) -> PlayerMemory | None:
    summaries = [
        memory
        for memory in memories
        if memory.kind == "causality_summary"
        and isinstance(memory.content, dict)
        and memory.content.get("player_id") == player_id
    ]
    if not summaries:
        return None
    return sorted(summaries, key=lambda memory: memory.updated_at)[-1]


def _prepare_narrative_memory_context(
    store: MythOSStore,
    director: Any,
    player_id: str,
    memories: list[PlayerMemory],
    narrative_shards: list[NarrativeShard],
    *,
    turn_index: int,
    use_llm: bool,
    retention: int = SHARD_CONTEXT_RETENTION,
    trigger_turn: int = SHARD_ROLLUP_TRIGGER_TURN,
    trigger_count: int = SHARD_ROLLUP_TRIGGER_COUNT,
    trigger_chars: int = SHARD_ROLLUP_TRIGGER_CHARS,
) -> tuple[list[PlayerMemory], list[NarrativeShard]]:
    """Persist a long-term shard summary and return prompt-sized raw shards."""
    ordered_shards = sorted(narrative_shards, key=lambda shard: shard.created_at)
    retained_shards, older_shards = _split_retained_shards(ordered_shards, retention)
    total_chars = sum(len(shard.text) for shard in ordered_shards)
    should_rollup = (
        turn_index >= trigger_turn
        or len(ordered_shards) >= trigger_count
        or total_chars >= trigger_chars
    )
    if not should_rollup:
        return memories, retained_shards

    existing = _latest_causality_summary(memories, player_id)
    covered_ids = set()
    if existing and isinstance(existing.content.get("covered_shard_ids"), list):
        covered_ids = {str(item) for item in existing.content["covered_shard_ids"]}

    absorbable = [shard for shard in older_shards if shard.shard_id not in covered_ids]
    if not absorbable:
        return memories, retained_shards

    now = utc_now()
    summary_text = _summarize_shards_for_rollup(
        director,
        absorbable,
        existing_summary=str(existing.content.get("summary_text") or "") if existing else None,
        use_llm=use_llm,
    )
    memory = PlayerMemory(
        memory_id=existing.memory_id if existing else new_memory_id(),
        player_id=player_id,
        kind="causality_summary",
        content=_merge_causality_summary_content(
            existing.content if existing else None, absorbable, summary_text
        ),
        weight=1.0,
        created_at=existing.created_at if existing else now,
        updated_at=now,
    )
    store.save_player_memory(memory)
    updated_memories = [
        memory_item for memory_item in memories if memory_item.memory_id != memory.memory_id
    ]
    updated_memories.append(memory)
    return updated_memories, retained_shards


def _split_retained_shards(
    ordered_shards: list[NarrativeShard], retention: int
) -> tuple[list[NarrativeShard], list[NarrativeShard]]:
    if retention <= 0:
        return [], list(ordered_shards)
    if len(ordered_shards) <= retention:
        return list(ordered_shards), []
    return ordered_shards[-retention:], ordered_shards[: len(ordered_shards) - retention]


def _summarize_shards_for_rollup(
    director: Any,
    shards: list[NarrativeShard],
    *,
    existing_summary: str | None,
    use_llm: bool,
) -> str:
    payload = [to_json_dict(shard) for shard in shards]
    summarize = getattr(director, "summarize_narrative_shards", None)
    if callable(summarize):
        return str(
            summarize(payload, existing_summary=existing_summary or None, use_llm=use_llm)
        ).strip()
    return _deterministic_shard_summary(shards, existing_summary=existing_summary)


def _merge_causality_summary_content(
    existing: dict[str, Any] | None,
    absorbed: list[NarrativeShard],
    summary_text: str,
) -> dict[str, Any]:
    content = dict(existing or {})
    covered_ids = list(content.get("covered_shard_ids", []))
    loop_ids = list(content.get("loop_ids", []))
    clue_symbols = list(content.get("clue_symbols", []))
    tone_histogram = dict(content.get("tone_histogram", {}))
    symbol_histogram = dict(content.get("symbol_histogram", {}))
    window = dict(content.get("window", {})) if isinstance(content.get("window"), dict) else {}
    created_times = [
        item
        for item in [window.get("first_created_at"), window.get("last_created_at")]
        if isinstance(item, str)
    ]

    for shard in absorbed:
        covered_ids.append(shard.shard_id)
        loop_ids.append(shard.loop_id)
        if shard.kind == "clue" and shard.symbol:
            clue_symbols.append(shard.symbol)
        if shard.emotional_tone:
            tone_histogram[shard.emotional_tone] = tone_histogram.get(shard.emotional_tone, 0) + 1
        if shard.symbol:
            symbol_histogram[shard.symbol] = symbol_histogram.get(shard.symbol, 0) + 1
        created_times.append(shard.created_at.isoformat())

    if created_times:
        window = {"first_created_at": min(created_times), "last_created_at": max(created_times)}

    player_id = absorbed[0].player_id if absorbed else str(content.get("player_id") or "")
    return {
        "player_id": player_id,
        "source": "narrative_shards",
        "summary_text": summary_text,
        "covered_shard_ids": list(dict.fromkeys(str(item) for item in covered_ids)),
        "shard_count": len(dict.fromkeys(str(item) for item in covered_ids)),
        "loop_ids": list(dict.fromkeys(str(item) for item in loop_ids)),
        "clue_symbols": list(dict.fromkeys(str(item) for item in clue_symbols)),
        "tone_histogram": tone_histogram,
        "symbol_histogram": symbol_histogram,
        "window": window,
    }


def _deterministic_shard_summary(
    shards: list[NarrativeShard], *, existing_summary: str | None = None
) -> str:
    if not shards:
        return existing_summary or "아직 압축할 장기 서사 파편이 없다."
    symbols = [shard.symbol for shard in shards if shard.symbol]
    tones = [shard.emotional_tone for shard in shards if shard.emotional_tone]
    clues = [shard.symbol for shard in shards if shard.kind == "clue" and shard.symbol]
    symbol_text = ", ".join(dict.fromkeys(symbols[:6])) or "이름 없는 신호"
    tone_text = ", ".join(dict.fromkeys(tones[:4])) or "불안정한 잔향"
    clue_text = ", ".join(dict.fromkeys(clues[:6])) or "확정 단서 없음"
    prefix = f"{existing_summary.rstrip()} " if existing_summary else ""
    return (
        f"{prefix}장기 기억은 {len(shards)}개의 파편을 흡수했다. "
        f"반복 상징은 [{symbol_text}], 정서는 [{tone_text}], 확정 단서는 [{clue_text}]로 남아 "
        "다음 장면의 인과율 압력과 NPC 반응을 낮은 배경 신호로 조정한다."
    ).strip()


def _archives_to_compact(
    active_archives: list[WorldMemory], retention: int = ARCHIVE_RETENTION
) -> list[WorldMemory]:
    """Return the oldest archives beyond the retention window, oldest first."""
    ordered = sorted(active_archives, key=lambda memory: memory.created_at)
    if len(ordered) <= retention:
        return []
    return ordered[: len(ordered) - retention]


def _merge_archive_rollup(
    existing: dict | None,
    absorbed: list[WorldMemory],
    shards_by_loop: dict[str, NarrativeShard],
    player_id: str,
) -> dict:
    loop_count = int(existing.get("loop_count", 0)) if existing else 0
    sum_stability = float(existing.get("avg_stability", 0.0)) * loop_count if existing else 0.0
    sum_tension = float(existing.get("avg_tension", 0.0)) * loop_count if existing else 0.0
    phase_histogram = dict(existing.get("phase_histogram", {})) if existing else {}
    tone_histogram = dict(existing.get("tone_histogram", {})) if existing else {}
    symbol_histogram = dict(existing.get("symbol_histogram", {})) if existing else {}
    window = (
        dict(existing.get("window", {}))
        if existing and isinstance(existing.get("window"), dict)
        else {}
    )

    created_times: list[str] = []
    if window:
        t1 = window.get("first_created_at")
        t2 = window.get("last_created_at")
        if isinstance(t1, str):
            created_times.append(t1)
        if isinstance(t2, str):
            created_times.append(t2)

    for memory in absorbed:
        content = memory.content if isinstance(memory.content, dict) else {}
        stability = content.get("stability")
        tension = content.get("tension")
        loop_id = content.get("loop_id")
        if isinstance(stability, int) and isinstance(tension, int):
            sum_stability += stability
            sum_tension += tension
            loop_count += 1
        phase = content.get("phase")
        if phase and isinstance(phase, str):
            phase_histogram[phase] = phase_histogram.get(phase, 0) + 1
        shard = shards_by_loop.get(loop_id) if isinstance(loop_id, str) else None
        if shard is not None:
            if shard.emotional_tone:
                tone_histogram[shard.emotional_tone] = (
                    tone_histogram.get(shard.emotional_tone, 0) + 1
                )
            if shard.symbol:
                symbol_histogram[shard.symbol] = symbol_histogram.get(shard.symbol, 0) + 1
        created_times.append(memory.created_at.isoformat())

    avg_stability = round(sum_stability / loop_count, 2) if loop_count else 0.0
    avg_tension = round(sum_tension / loop_count, 2) if loop_count else 0.0
    if created_times:
        window = {
            "first_created_at": min(created_times),
            "last_created_at": max(created_times),
        }
    return {
        "player_id": player_id,
        "loop_count": loop_count,
        "avg_stability": avg_stability,
        "avg_tension": avg_tension,
        "phase_histogram": phase_histogram,
        "tone_histogram": tone_histogram,
        "symbol_histogram": symbol_histogram,
        "window": window,
    }


def _compact_player_archives(
    store: MythOSStore, player_id: str, retention: int = ARCHIVE_RETENTION
) -> None:
    world_memories = store.list_world_memories(MYTHOS_WORLD_ID)
    active_archives = [
        memory
        for memory in world_memories
        if memory.kind == "loop_archive"
        and isinstance(memory.content, dict)
        and memory.content.get("player_id") == player_id
    ]
    absorbed = _archives_to_compact(active_archives, retention)
    if not absorbed:
        return

    existing_rollup = next(
        (
            memory
            for memory in world_memories
            if memory.kind == "archive_rollup"
            and isinstance(memory.content, dict)
            and memory.content.get("player_id") == player_id
        ),
        None,
    )
    shards = store.list_narrative_shards(player_id, limit=1000)
    shards_by_loop = {shard.loop_id: shard for shard in shards}
    content = _merge_archive_rollup(
        existing_rollup.content if existing_rollup else None,
        absorbed,
        shards_by_loop,
        player_id,
    )
    now = utc_now()
    rollup = WorldMemory(
        memory_id=existing_rollup.memory_id if existing_rollup else new_memory_id(),
        world_id=MYTHOS_WORLD_ID,
        kind="archive_rollup",
        content=content,
        weight=1.0,
        created_at=existing_rollup.created_at if existing_rollup else now,
        updated_at=now,
    )
    with store.transaction():
        store.save_world_memory(rollup)
        for memory in absorbed:
            store.save_world_memory(replace(memory, kind="archive_compacted", updated_at=now))
