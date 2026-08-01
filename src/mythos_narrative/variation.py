from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field

from mythos_core import Scene


@dataclass(frozen=True)
class NoveltySignal:
    notes: list[str] = field(default_factory=list)
    recent_titles: list[str] = field(default_factory=list)
    recent_locations: list[str] = field(default_factory=list)
    recent_choice_patterns: list[str] = field(default_factory=list)
    recent_signatures: list[NoveltySignature] = field(default_factory=list)


@dataclass(frozen=True)
class NoveltySignature:
    title_key: str
    location_key: str
    motifs: frozenset[str] = frozenset()


@dataclass(frozen=True)
class NoveltyAssessment:
    repeated_title: bool = False
    repeated_location_streak: bool = False
    repeated_motif_streak: bool = False

    @property
    def requires_revision(self) -> bool:
        return self.repeated_title or self.structural_repeat

    @property
    def structural_repeat(self) -> bool:
        return self.repeated_location_streak or self.repeated_motif_streak


@dataclass(frozen=True)
class NoveltyRevision:
    title: str
    location: str
    narration: str
    assessment: NoveltyAssessment


_MOTIF_TERMS: dict[str, tuple[str, ...]] = {
    "drainage": (
        "drain", "sewer", "sluice", "sump", "sludge", "filtration", "underbelly",
        "conduit", "exhaust vent", "subterranean", "배수", "하수", "수문", "통풍", "지하",
    ),
    "pursuit": (
        "searchlight", "cordon", "pursuit", "chase", "patrol", "tracker", "escape",
        "flee", "cornered", "tightening", "서치라이트", "봉쇄", "추격", "도주",
    ),
    "combat": ("combat", "fight", "ambush", "battle", "attack", "교전", "전투", "매복"),
    "market": ("market", "stall", "kiosk", "vendor", "시장", "야시장", "가판", "판매"),
    "signal_grid": ("signal", "grid", "circuit", "static", "archive", "신호", "그리드", "회로", "정전"),
}


class NoveltyController:
    def build_signal(self, recent_scenes: list[Scene]) -> NoveltySignal:
        titles = _unique_recent([scene.title for scene in recent_scenes])
        locations = _unique_recent([scene.location for scene in recent_scenes])
        choice_patterns = _recent_choice_patterns(recent_scenes)
        signatures = [_scene_signature(scene) for scene in recent_scenes[-6:]]
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
            recent_signatures=signatures,
        )

    def assess_candidate(
        self,
        signal: NoveltySignal,
        *,
        title: str,
        location: str,
        narration: str,
    ) -> NoveltyAssessment:
        candidate = _signature(title, location, narration)
        recent = signal.recent_signatures
        repeated_title = bool(candidate.title_key) and any(
            prior.title_key == candidate.title_key for prior in recent
        )
        last_two = recent[-2:]
        repeated_location_streak = bool(candidate.location_key) and len(last_two) == 2 and all(
            prior.location_key == candidate.location_key for prior in last_two
        )
        repeated_motif_streak = bool(candidate.motifs) and len(last_two) == 2 and all(
            bool(candidate.motifs & prior.motifs) for prior in last_two
        )
        return NoveltyAssessment(
            repeated_title=repeated_title,
            repeated_location_streak=repeated_location_streak,
            repeated_motif_streak=repeated_motif_streak,
        )

    def revise_candidate(
        self,
        signal: NoveltySignal,
        *,
        title: str,
        location: str,
        narration: str,
        alternate_location: str | None,
        language: str,
    ) -> NoveltyRevision | None:
        assessment = self.assess_candidate(
            signal, title=title, location=location, narration=narration
        )
        if not assessment.requires_revision:
            return None

        revised_location = location.strip()
        if assessment.structural_repeat:
            candidate_alternate = (alternate_location or "").strip()
            if candidate_alternate and _normalize_location(candidate_alternate) != _normalize_location(
                location
            ):
                revised_location = candidate_alternate
            elif language == "en":
                revised_location = f"Alternate access beyond {location.strip()}"
            else:
                revised_location = f"{location.strip()} 너머의 우회 접근로"

        if language == "en":
            revised_title = f"New Vector at {revised_location}"
            tail = (
                f"The repeated route seals behind you; the action shifts to {revised_location}, "
                "where a new constraint changes the situation."
            )
        else:
            revised_title = f"{revised_location}의 새 국면"
            tail = (
                f"반복되던 경로가 뒤에서 닫히고, 행동은 {revised_location}(으)로 옮겨간다. "
                "새 제약이 이전과 다른 국면을 만든다."
            )
        return NoveltyRevision(
            title=revised_title,
            location=revised_location,
            narration=f"{narration.rstrip()} {tail}",
            assessment=assessment,
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


def _scene_signature(scene: Scene) -> NoveltySignature:
    return _signature(scene.title, scene.location, scene.narration)


def _signature(title: str, location: str, narration: str) -> NoveltySignature:
    combined = " ".join((title, location, narration)).casefold()
    motifs = frozenset(
        motif
        for motif, terms in _MOTIF_TERMS.items()
        if any(term in combined for term in terms)
    )
    return NoveltySignature(
        title_key=_normalize_title(title),
        location_key=_normalize_location(location),
        motifs=motifs,
    )


def _normalize_title(value: str) -> str:
    normalized = value.strip().casefold()
    while normalized.startswith("changed ") or normalized.startswith("달라진 "):
        normalized = normalized.split(" ", 1)[1].strip()
    return re.sub(r"[\W_]+", "", normalized, flags=re.UNICODE)


def _normalize_location(value: str) -> str:
    return re.sub(r"[\W_]+", "", value.strip().casefold(), flags=re.UNICODE)
