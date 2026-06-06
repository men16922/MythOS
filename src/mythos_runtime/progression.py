from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Any

from mythos_core import (
    LoopState,
    NarrativeShard,
    PlayerMemory,
    Scene,
    WorldEvent,
    WorldMemory,
)
from mythos_core.clock import utc_now
from mythos_core.ids import new_memory_id
from mythos_memory import MythOSStore
from mythos_runtime.options import RunSummary


@dataclass(frozen=True)
class MetaProgression:
    player_id: str
    scenario_id: str
    runs_completed: int = 0
    endings_seen: list[str] = field(default_factory=list)
    unlocked_traits: list[str] = field(default_factory=list)
    unlocked_allies: list[str] = field(default_factory=list)
    unlocked_starting_items: list[str] = field(default_factory=list)
    codex_unlocks: list[str] = field(default_factory=list)
    total_clues: int = 0
    total_combats_won: int = 0
    total_combats_lost: int = 0
    allies_met: list[str] = field(default_factory=list)


def determine_autonomy_level(
    autonomy_config: dict[str, dict[str, Any]],
    clue_count: int,
    default: int = 1,
) -> int:
    """Calculate autonomy level from scenario thresholds and collected clues."""
    level = default
    for raw_level, config in sorted(
        autonomy_config.items(),
        key=lambda item: _level_sort_key(item[0]),
        reverse=True,
    ):
        parsed_level = _parse_level(raw_level)
        if parsed_level is None:
            continue
        required = config.get("clues_required", 999)
        if isinstance(required, int) and clue_count >= required:
            return parsed_level
    return level


def latest_meta_progression(
    memories: list[PlayerMemory],
    player_id: str,
    scenario_id: str,
) -> MetaProgression:
    candidates = [
        memory
        for memory in memories
        if memory.kind == "meta_progression"
        and memory.player_id == player_id
        and memory.content.get("scenario_id") == scenario_id
    ]
    if not candidates:
        return MetaProgression(player_id=player_id, scenario_id=scenario_id)
    latest = max(candidates, key=lambda memory: memory.created_at)
    return meta_progression_from_content(
        latest.content, player_id=player_id, scenario_id=scenario_id
    )


def meta_progression_from_content(
    content: dict[str, Any],
    *,
    player_id: str,
    scenario_id: str,
) -> MetaProgression:
    return MetaProgression(
        player_id=str(content.get("player_id") or player_id),
        scenario_id=str(content.get("scenario_id") or scenario_id),
        runs_completed=int(content.get("runs_completed") or 0),
        endings_seen=_string_list(content.get("endings_seen")),
        unlocked_traits=_string_list(content.get("unlocked_traits")),
        unlocked_allies=_string_list(content.get("unlocked_allies")),
        unlocked_starting_items=_string_list(content.get("unlocked_starting_items")),
        codex_unlocks=_string_list(content.get("codex_unlocks")),
        total_clues=int(content.get("total_clues") or 0),
        total_combats_won=int(content.get("total_combats_won") or 0),
        total_combats_lost=int(content.get("total_combats_lost") or 0),
        allies_met=_string_list(content.get("allies_met")),
    )


def meta_progression_to_content(progress: MetaProgression) -> dict[str, Any]:
    return {
        "player_id": progress.player_id,
        "scenario_id": progress.scenario_id,
        "runs_completed": progress.runs_completed,
        "endings_seen": progress.endings_seen,
        "unlocked_traits": progress.unlocked_traits,
        "unlocked_allies": progress.unlocked_allies,
        "unlocked_starting_items": progress.unlocked_starting_items,
        "codex_unlocks": progress.codex_unlocks,
        "total_clues": progress.total_clues,
        "total_combats_won": progress.total_combats_won,
        "total_combats_lost": progress.total_combats_lost,
        "allies_met": progress.allies_met,
    }


def evaluate_meta_progression(
    previous: MetaProgression,
    run_summary: RunSummary,
) -> tuple[MetaProgression, list[str]]:
    endings_seen = _append_unique(previous.endings_seen, run_summary.ending_id or run_summary.phase)
    allies_met = previous.allies_met
    for ally_id in run_summary.allies_met:
        allies_met = _append_unique(allies_met, ally_id)

    progress = MetaProgression(
        player_id=previous.player_id,
        scenario_id=previous.scenario_id,
        runs_completed=previous.runs_completed + 1,
        endings_seen=endings_seen,
        unlocked_traits=list(previous.unlocked_traits),
        unlocked_allies=list(previous.unlocked_allies),
        unlocked_starting_items=list(previous.unlocked_starting_items),
        codex_unlocks=list(previous.codex_unlocks),
        total_clues=previous.total_clues + len(run_summary.clues_collected),
        total_combats_won=previous.total_combats_won + run_summary.combats_won,
        total_combats_lost=previous.total_combats_lost + run_summary.combats_lost,
        allies_met=allies_met,
    )

    grants: list[str] = []
    progress, grants = _grant_if(
        progress,
        grants,
        bucket="unlocked_traits",
        value="loop_veteran",
        condition=progress.runs_completed >= 1,
    )
    progress, grants = _grant_if(
        progress,
        grants,
        bucket="codex_unlocks",
        value="first_run_record",
        condition=progress.runs_completed >= 1,
    )
    progress, grants = _grant_if(
        progress,
        grants,
        bucket="unlocked_traits",
        value="memory_weaver",
        condition=progress.total_clues >= 3,
    )
    progress, grants = _grant_if(
        progress,
        grants,
        bucket="unlocked_starting_items",
        value=_scenario_first_clue_item(progress.scenario_id),
        condition=progress.total_clues >= 1,
    )
    progress, grants = _grant_if(
        progress,
        grants,
        bucket="unlocked_starting_items",
        value=_scenario_combat_item(progress.scenario_id),
        condition=progress.total_combats_won >= 1,
    )
    for ally_id in progress.allies_met:
        progress, grants = _grant_if(
            progress,
            grants,
            bucket="unlocked_allies",
            value=ally_id,
            condition=True,
        )
    return progress, grants


def apply_meta_progression_to_state(
    state: dict[str, Any],
    progress: MetaProgression,
    scenario_combat: dict[str, Any],
) -> dict[str, Any]:
    updated = dict(state)
    progress_content = meta_progression_to_content(progress)
    updated["meta_progression"] = progress_content

    item_defs = scenario_combat.get("items", {}) if isinstance(scenario_combat, dict) else {}
    inventory = list(updated.get("_inventory", []))
    existing_ids = {_item_id(item) for item in inventory}
    for item_id in progress.unlocked_starting_items:
        if item_id in item_defs and item_id not in existing_ids:
            inventory.append(item_defs[item_id])
            existing_ids.add(item_id)
    if inventory:
        updated["_inventory"] = inventory
    return updated


def traits_with_meta_progression(
    traits: dict[str, Any],
    progress: MetaProgression,
) -> dict[str, Any]:
    updated = dict(traits)
    updated["meta_progression"] = meta_progression_to_content(progress)
    updated["unlocked_traits"] = sorted(
        set(_string_list(updated.get("unlocked_traits"))) | set(progress.unlocked_traits)
    )
    updated["unlocked_allies"] = sorted(
        set(_string_list(updated.get("unlocked_allies"))) | set(progress.unlocked_allies)
    )
    updated["unlocked_starting_items"] = sorted(
        set(_string_list(updated.get("unlocked_starting_items")))
        | set(progress.unlocked_starting_items)
    )
    updated["codex_unlocks"] = sorted(
        set(_string_list(updated.get("codex_unlocks"))) | set(progress.codex_unlocks)
    )
    return updated


def _level_sort_key(raw_level: str) -> int:
    return _parse_level(raw_level) or 0


def _parse_level(raw_level: str) -> int | None:
    try:
        return int(raw_level)
    except ValueError:
        return None


def _grant_if(
    progress: MetaProgression,
    grants: list[str],
    *,
    bucket: str,
    value: str,
    condition: bool,
) -> tuple[MetaProgression, list[str]]:
    if not condition:
        return progress, grants
    current = list(getattr(progress, bucket))
    if value in current:
        return progress, grants
    current.append(value)
    updated = MetaProgression(
        player_id=progress.player_id,
        scenario_id=progress.scenario_id,
        runs_completed=progress.runs_completed,
        endings_seen=progress.endings_seen,
        unlocked_traits=current if bucket == "unlocked_traits" else progress.unlocked_traits,
        unlocked_allies=current if bucket == "unlocked_allies" else progress.unlocked_allies,
        unlocked_starting_items=current
        if bucket == "unlocked_starting_items"
        else progress.unlocked_starting_items,
        codex_unlocks=current if bucket == "codex_unlocks" else progress.codex_unlocks,
        total_clues=progress.total_clues,
        total_combats_won=progress.total_combats_won,
        total_combats_lost=progress.total_combats_lost,
        allies_met=progress.allies_met,
    )
    return updated, [*grants, f"{bucket}:{value}"]


def _scenario_first_clue_item(scenario_id: str) -> str:
    return "memory_slip" if scenario_id == "glass-library" else "data_fragment"


def _scenario_combat_item(scenario_id: str) -> str:
    return "repair_tape" if scenario_id == "glass-library" else "stim_shard"


def _append_unique(values: list[str], value: str | None) -> list[str]:
    if not value or value in values:
        return list(values)
    return [*values, value]


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item is not None]


def _item_id(item: Any) -> str:
    if isinstance(item, dict):
        return str(item.get("id") or item.get("item") or item)
    return str(item)


def _run_summary_from_memory(memory: WorldMemory) -> RunSummary:
    content = memory.content
    metadata = content.get("metadata")
    return RunSummary(
        run_id=str(content.get("run_id") or f"run_{content.get('loop_id', memory.memory_id)}"),
        player_id=str(content.get("player_id") or ""),
        loop_id=str(content.get("loop_id") or ""),
        scenario_id=str(content.get("scenario_id") or "neo-seoul"),
        started_at=str(content.get("started_at") or memory.created_at.isoformat()),
        ended_at=str(content.get("ended_at") or memory.created_at.isoformat()),
        ending_id=str(content["ending_id"]) if content.get("ending_id") is not None else None,
        ending_label=str(content.get("ending_label") or "Archived Loop"),
        final_title=str(content.get("final_title") or "Untitled Run"),
        final_location=str(content.get("final_location") or ""),
        phase=str(content.get("phase") or "ended"),
        stability=int(content.get("stability") or 0),
        tension=int(content.get("tension") or 0),
        turns=int(content.get("turns") or 0),
        combats_won=int(content.get("combats_won") or 0),
        combats_lost=int(content.get("combats_lost") or 0),
        clues_collected=[str(item) for item in content.get("clues_collected", [])],
        allies_met=[str(item) for item in content.get("allies_met", [])],
        unlocks_granted=[str(item) for item in content.get("unlocks_granted", [])],
        summary_text=str(content.get("summary_text") or content.get("summary") or ""),
        metadata=metadata if isinstance(metadata, dict) else {},
    )


MYTHOS_WORLD_ID = "world_mythos"


class ProgressionService:
    def __init__(self, store: MythOSStore) -> None:
        self.store = store

    def list_run_summaries(self, player_id: str, limit: int = 20) -> list[RunSummary]:
        world_memories = self.store.list_world_memories(MYTHOS_WORLD_ID)
        runs = []
        for memory in world_memories:
            if memory.kind == "run_summary" and memory.content.get("player_id") == player_id:
                runs.append(_run_summary_from_memory(memory))
        runs.sort(key=lambda r: r.ended_at, reverse=True)
        return runs[:limit]

    def apply_meta_progression(
        self,
        player_id: str,
        loop: LoopState,
        run_summary: RunSummary,
    ) -> tuple[LoopState, list[str]]:
        memories = self.store.list_player_memories(player_id)
        scenario_id = run_summary.scenario_id
        previous = latest_meta_progression(memories, player_id, scenario_id)
        updated_progress, grants = evaluate_meta_progression(previous, run_summary)

        memory = _meta_progression_memory(updated_progress)
        self.store.save_player_memory(memory)

        from mythos_runtime.scenario import load_scenario

        scenario = load_scenario(scenario_id)
        state_after = apply_meta_progression_to_state(loop.state, updated_progress, scenario.combat)
        updated_loop = replace(loop, state=state_after)
        return updated_loop, grants


def _meta_progression_memory(progress: MetaProgression) -> PlayerMemory:
    now = utc_now()
    return PlayerMemory(
        memory_id=new_memory_id(),
        player_id=progress.player_id,
        kind="meta_progression",
        content=meta_progression_to_content(progress),
        weight=1.0,
        created_at=now,
        updated_at=now,
    )


def _allies_from_loop_state(state: dict[str, Any]) -> list[str]:
    party = state.get("_party")
    if not isinstance(party, dict):
        return []
    members = party.get("members")
    if not isinstance(members, list):
        return []
    allies = []
    for member in members:
        if isinstance(member, dict) and member.get("id"):
            allies.append(str(member["id"]))
    return allies


def _world_memory_from_archive(loop: LoopState, scene: Scene) -> WorldMemory:
    now = utc_now()
    return WorldMemory(
        memory_id=new_memory_id(),
        world_id=MYTHOS_WORLD_ID,
        kind="loop_archive",
        content={
            "loop_id": loop.loop_id,
            "player_id": loop.player_id,
            "final_title": scene.title,
            "final_location": scene.location,
            "phase": loop.phase.value,
            "stability": loop.stability,
            "tension": loop.tension,
        },
        weight=1.0,
        created_at=now,
        updated_at=now,
    )


def _run_summary_memory_from_archive(
    loop: LoopState,
    scene: Scene,
    events: list[WorldEvent],
    shards: list[NarrativeShard],
    summary_text: str,
) -> WorldMemory:
    now = utc_now()
    clues = [
        shard.symbol
        for shard in shards
        if shard.loop_id == loop.loop_id and (shard.kind == "clue" or shard.metadata.get("clue_id"))
    ]
    allies = _allies_from_loop_state(loop.state)
    combats_won = len(
        [
            e
            for e in events
            if e.loop_id == loop.loop_id
            and e.state_delta.get("combat_outcome") in ("victory", "player_victory")
        ]
    )
    combats_lost = len(
        [
            e
            for e in events
            if e.loop_id == loop.loop_id
            and e.state_delta.get("combat_outcome") in ("defeat", "player_defeat")
        ]
    )

    run_sum = {
        "run_id": f"run_{loop.loop_id}",
        "loop_id": loop.loop_id,
        "player_id": loop.player_id,
        "scenario_id": str(loop.state.get("scenario_id") or "neo-seoul"),
        "started_at": loop.started_at.isoformat() if loop.started_at else now.isoformat(),
        "ended_at": loop.ended_at.isoformat() if loop.ended_at else now.isoformat(),
        "ending_id": loop.state.get("ending_id"),
        "ending_label": loop.state.get("ending_label") or "Unknown",
        "final_title": scene.title,
        "final_location": scene.location,
        "phase": loop.phase.value,
        "stability": loop.stability,
        "tension": loop.tension,
        "turns": scene.turn_index + 1,
        "clues_collected": clues,
        "allies_met": allies,
        "combats_won": combats_won,
        "combats_lost": combats_lost,
        "summary": summary_text,
        "saved_at": now.isoformat(),
    }
    return WorldMemory(
        memory_id=new_memory_id(),
        world_id=MYTHOS_WORLD_ID,
        kind="run_summary",
        content=run_sum,
        weight=1.0,
        created_at=now,
        updated_at=now,
    )
