from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from mythos_core import LoopPhase, LoopState
from mythos_runtime.scenario import PROJECT_ROOT


@dataclass(frozen=True)
class StoryBibleEntry:
    entry_id: str
    kind: str
    title: str
    summary: str
    content: str
    when: dict[str, Any] = field(default_factory=dict)
    priority: int = 0
    token_budget: int = 600
    tags: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class StoryBible:
    scenario_id: str
    title: str
    premise: str
    entries: list[StoryBibleEntry] = field(default_factory=list)

    @property
    def empty(self) -> bool:
        return not self.entries


@lru_cache(maxsize=16)
def load_story_bible(scenario_id: str) -> StoryBible:
    path = PROJECT_ROOT / "resources" / scenario_id / "story_bible" / "bible.json"
    if not path.exists():
        return StoryBible(scenario_id=scenario_id, title=scenario_id, premise="", entries=[])

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    entries = []
    for raw in data.get("entries", []):
        if not isinstance(raw, dict):
            continue
        entry_id = raw.get("id")
        if not entry_id:
            continue
        entries.append(
            StoryBibleEntry(
                entry_id=str(entry_id),
                kind=str(raw.get("kind", "note")),
                title=str(raw.get("title", entry_id)),
                summary=str(raw.get("summary", "")),
                content=str(raw.get("content", "")),
                when=raw.get("when", {}) if isinstance(raw.get("when", {}), dict) else {},
                priority=int(raw.get("priority", 0)),
                token_budget=int(raw.get("token_budget", 600)),
                tags=[str(tag) for tag in raw.get("tags", []) if tag],
            )
        )

    return StoryBible(
        scenario_id=str(data.get("id", scenario_id)),
        title=str(data.get("title", scenario_id)),
        premise=str(data.get("premise", "")),
        entries=entries,
    )


def select_story_bible_entries(
    bible: StoryBible,
    loop: LoopState,
    *,
    turn_index: int,
    token_budget: int = 1600,
    max_entries: int = 3,
) -> list[StoryBibleEntry]:
    if bible.empty or token_budget <= 0 or max_entries <= 0:
        return []

    scored: list[tuple[int, StoryBibleEntry]] = []
    for entry in bible.entries:
        score = _entry_score(entry, loop, turn_index)
        if score is None:
            continue
        scored.append((score, entry))

    selected: list[StoryBibleEntry] = []
    remaining = token_budget
    for _, entry in sorted(scored, key=lambda pair: (-pair[0], pair[1].entry_id)):
        cost = max(
            1,
            min(entry.token_budget, _approx_tokens(entry.summary) + _approx_tokens(entry.content)),
        )
        if cost > remaining and selected:
            continue
        selected.append(entry)
        remaining -= cost
        if len(selected) >= max_entries or remaining <= 0:
            break
    return selected


def story_bible_notes(entries: list[StoryBibleEntry]) -> list[str]:
    notes = []
    for entry in entries:
        body = entry.content.strip() or entry.summary.strip()
        if not body:
            continue
        notes.append(
            "STORY_BIBLE_SNIPPET "
            f"[{entry.entry_id} / {entry.kind} / {entry.title}]: "
            f"{entry.summary.strip()} :: {body}"
        )
    return notes


def _entry_score(entry: StoryBibleEntry, loop: LoopState, turn_index: int) -> int | None:
    when = entry.when
    score = entry.priority

    phases = _lower_set(when.get("phase"))
    if phases:
        phase = loop.phase.value if isinstance(loop.phase, LoopPhase) else str(loop.phase)
        if phase.lower() not in phases:
            return None
        score += 8

    flags = _loop_flags(loop)
    flags_any = _lower_set(when.get("flags_any"))
    if flags_any:
        if flags.isdisjoint(flags_any):
            return None
        score += 4

    flags_all = _lower_set(when.get("flags_all"))
    if flags_all:
        if not flags_all.issubset(flags):
            return None
        score += 6

    locations = _loop_locations(loop)
    locations_any = _lower_set(when.get("locations_any"))
    if locations_any:
        if not any(_location_matches(location, locations_any) for location in locations):
            return None
        score += 5

    turn_min = when.get("turn_min")
    if isinstance(turn_min, int | float) and turn_index < int(turn_min):
        return None
    turn_max = when.get("turn_max")
    if isinstance(turn_max, int | float) and turn_index > int(turn_max):
        return None

    return score


def _loop_flags(loop: LoopState) -> set[str]:
    flags = loop.state.get("flags", []) if isinstance(loop.state, dict) else []
    if not isinstance(flags, list):
        return set()
    return {str(flag).lower() for flag in flags}


def _loop_locations(loop: LoopState) -> set[str]:
    locations = {str(loop.location_id).lower()}
    state = loop.state if isinstance(loop.state, dict) else {}
    map_state = state.get("_map")
    if isinstance(map_state, dict):
        current = map_state.get("current")
        if current:
            locations.add(str(current).lower())
        tile = map_state.get("tiles", {}).get(current) if current else None
        if isinstance(tile, dict):
            for key in ("name", "label", "location", "kind"):
                if tile.get(key):
                    locations.add(str(tile[key]).lower())
    for key in ("location", "current_location"):
        if state.get(key):
            locations.add(str(state[key]).lower())
    return locations


def _location_matches(location: str, needles: set[str]) -> bool:
    return any(needle == location or needle in location for needle in needles)


def _lower_set(value: Any) -> set[str]:
    if isinstance(value, str):
        return {value.lower()}
    if isinstance(value, list | tuple | set):
        return {str(item).lower() for item in value if item}
    return set()


def _approx_tokens(text: str) -> int:
    return max(1, len(text) // 4)


__all__ = [
    "StoryBible",
    "StoryBibleEntry",
    "load_story_bible",
    "select_story_bible_entries",
    "story_bible_notes",
]
