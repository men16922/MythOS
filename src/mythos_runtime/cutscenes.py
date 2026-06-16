"""Deterministic companion-cutscene unlock evaluation + gallery assembly.

Companion cutscenes (authored in ``resources/<scenario>/directives/companions/<name>.md``,
loaded as ``CutsceneDirective``s) unlock when the run's accumulated companion affection
and flags cross an authored threshold. This module is **pure** (no I/O): the directives
+ a relationships dict + a flag set in, unlocked ids / a gallery payload out — so it is
unit-testable and can be called both at archive (to persist unlocks into meta progression)
and at read time (to build the player-facing gallery).

Unlock rule (both must hold):
- ``relationships.get(companion, 0) >= cutscene.affection``
- ``set(cutscene.flags) <= flag_set``  (an empty ``flags`` is always satisfied)

This mirrors the live-state convention in ``route_runtime`` (relationships are ints,
missing companion reads as 0) and the cross-loop persistence in ``progression``.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any

from mythos_runtime.scenario_directives import CutsceneDirective

__all__ = ["evaluate_unlocked_cutscenes", "cutscene_gallery", "is_cutscene_unlocked"]


def _affection(relationships: Mapping[str, Any] | None, companion: str) -> int:
    if not isinstance(relationships, Mapping):
        return 0
    try:
        return int(relationships.get(companion, 0))
    except (TypeError, ValueError):
        return 0


def is_cutscene_unlocked(
    cutscene: CutsceneDirective,
    relationships: Mapping[str, Any] | None,
    flag_set: set[str],
) -> bool:
    """True when affection threshold met and every required flag is present."""
    if _affection(relationships, cutscene.companion) < cutscene.affection:
        return False
    return set(cutscene.flags) <= flag_set


def evaluate_unlocked_cutscenes(
    cutscenes: Iterable[CutsceneDirective],
    relationships: Mapping[str, Any] | None,
    flags: Iterable[str] | None,
) -> list[str]:
    """Return the sorted ids of cutscenes unlocked by the given affection + flags."""
    flag_set = {str(f) for f in (flags or [])}
    unlocked = [
        cs.cutscene_id
        for cs in cutscenes
        if is_cutscene_unlocked(cs, relationships, flag_set)
    ]
    return sorted(unlocked)


def cutscene_gallery(
    cutscenes: Iterable[CutsceneDirective],
    unlocked_ids: Iterable[str],
) -> list[dict[str, Any]]:
    """Build a gallery payload: every authored cutscene as locked stub or unlocked entry.

    Locked entries expose only the id / companion / title / threshold (so the UI can
    render a "locked" card hinting at the requirement); unlocked entries additionally
    carry the curated ``image`` and script ``body``. Order follows the authored
    directive order (stable, deterministic).
    """
    unlocked = set(unlocked_ids)
    gallery: list[dict[str, Any]] = []
    for cs in cutscenes:
        is_unlocked = cs.cutscene_id in unlocked
        gallery.append(
            {
                "id": cs.cutscene_id,
                "companion": cs.companion,
                "title": cs.title,
                "affection_required": cs.affection,
                "flags_required": list(cs.flags),
                "unlocked": is_unlocked,
                "image": cs.image if is_unlocked else None,
                "body": cs.body if is_unlocked else None,
            }
        )
    return gallery
