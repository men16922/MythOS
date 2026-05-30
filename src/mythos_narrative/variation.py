from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

from mythos_core import Scene


@dataclass(frozen=True)
class NoveltySignal:
    notes: list[str] = field(default_factory=list)
    recent_titles: list[str] = field(default_factory=list)
    recent_locations: list[str] = field(default_factory=list)
    recent_choice_patterns: list[str] = field(default_factory=list)


class NoveltyController:
    def build_signal(self, recent_scenes: list[Scene]) -> NoveltySignal:
        titles = _unique_recent([scene.title for scene in recent_scenes])
        locations = _unique_recent([scene.location for scene in recent_scenes])
        choice_patterns = _recent_choice_patterns(recent_scenes)
        notes: list[str] = []
        if titles:
            notes.append(f"Avoid reusing recent scene titles: {', '.join(titles)}.")
        if locations:
            notes.append(f"Change texture or pressure if location repeats: {', '.join(locations)}.")
        if choice_patterns:
            notes.append(
                f"Avoid repeating recent choice intent patterns: {'; '.join(choice_patterns)}."
            )
        if recent_scenes:
            notes.append("Introduce one concrete new object, constraint, or NPC reaction.")
        return NoveltySignal(
            notes=notes,
            recent_titles=titles,
            recent_locations=locations,
            recent_choice_patterns=choice_patterns,
        )


def _unique_recent(values: list[str], limit: int = 5) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in reversed(values):
        normalized = value.strip()
        if not normalized or normalized.lower() in seen:
            continue
        seen.add(normalized.lower())
        output.append(normalized)
        if len(output) >= limit:
            break
    return output


def _recent_choice_patterns(scenes: list[Scene], limit: int = 3) -> list[str]:
    patterns: list[str] = []
    for scene in reversed(scenes):
        intents = [
            choice.intent.strip().lower() for choice in scene.choices if choice.intent.strip()
        ]
        if not intents:
            continue
        counts = Counter(intents)
        pattern = ", ".join(f"{intent}x{counts[intent]}" for intent in sorted(counts))
        if pattern not in patterns:
            patterns.append(pattern)
        if len(patterns) >= limit:
            break
    return patterns
