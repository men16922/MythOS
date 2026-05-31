from __future__ import annotations

from typing import Any


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


def _level_sort_key(raw_level: str) -> int:
    return _parse_level(raw_level) or 0


def _parse_level(raw_level: str) -> int | None:
    try:
        return int(raw_level)
    except ValueError:
        return None
