"""Dynamic tile map built from the locations a loop passes through.

The Narrative Director emits free-text `scene.location` values; there is no fixed
world grid. This module incrementally lays those locations out as tiles on an integer
grid: the first location sits at (0, 0) and each newly visited location is placed on a
free cell adjacent to the one the player came from. Placement is deterministic (seeded
by the location name) so the same playthrough always yields the same map.

The map lives inside `loop.state["_map"]` (JSON-serializable, persisted with the loop
just like `_active_echoes`). The UI reads it to draw a minimap + current coordinate.
"""

from __future__ import annotations

import hashlib
from typing import Any

MAP_STATE_KEY = "_map"

# N, E, S, W first (orthogonal), then diagonals — preferred adjacency order.
_DIRECTIONS = [(0, 1), (1, 0), (0, -1), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)]

# Keyword -> tile kind, used by the UI for an icon/colour. Korean + English hints.
_KIND_RULES: list[tuple[tuple[str, ...], str]] = [
    (("야시장", "시장", "market", "bazaar"), "market"),
    (("스파이어", "spire", "tower", "탑", "첨탑"), "spire"),
    (("경계", "boundary", "border", "edge", "관문", "gate"), "edge"),
    (("정전", "blackout", "암흑", "dark"), "blackout"),
    (("데이터", "data", "서버", "server", "네트", "net", "코어", "core"), "data"),
    (("은신", "refuge", "safehouse", "hideout", "shelter", "쉼터"), "refuge"),
]


def normalize_location(location: str) -> str:
    """Stable key for a location name (case/whitespace-insensitive)."""
    return " ".join((location or "").strip().lower().split())


def classify_kind(location: str) -> str:
    text = (location or "").lower()
    for keys, kind in _KIND_RULES:
        if any(k in text for k in keys):
            return kind
    return "node"


def _hash_int(key: str) -> int:
    return int(hashlib.sha256(key.encode("utf-8")).hexdigest(), 16)


def _assign_coord(
    tiles: dict[str, dict[str, Any]], current_key: str | None, key: str
) -> tuple[int, int]:
    if not tiles:
        return (0, 0)
    occupied = {(t["x"], t["y"]) for t in tiles.values()}
    if current_key and current_key in tiles:
        cx, cy = tiles[current_key]["x"], tiles[current_key]["y"]
    else:
        cx, cy = (0, 0)

    # Rotate the direction order by a hash of the name so the map branches instead of
    # always growing in a straight line, while staying deterministic.
    rot = _hash_int(key) % len(_DIRECTIONS)
    ordered = _DIRECTIONS[rot:] + _DIRECTIONS[:rot]
    for dx, dy in ordered:
        cand = (cx + dx, cy + dy)
        if cand not in occupied:
            return cand

    # All neighbours taken — spiral outward to the nearest free cell.
    radius = 2
    while radius < 64:
        for dx in range(-radius, radius + 1):
            for dy in range(-radius, radius + 1):
                if max(abs(dx), abs(dy)) != radius:
                    continue
                cand = (cx + dx, cy + dy)
                if cand not in occupied:
                    return cand
        radius += 1
    return (cx + 1, cy)


def update_map(
    state: dict[str, Any], location: str, turn_index: int, kind: str | None = None
) -> dict[str, Any]:
    """Return a new state dict with `_map` updated to include/visit `location`."""
    new_state = dict(state)
    raw = (location or "").strip() or "Unknown"
    key = normalize_location(raw)

    existing = new_state.get(MAP_STATE_KEY) or {}
    tiles: dict[str, dict[str, Any]] = {k: dict(v) for k, v in existing.get("tiles", {}).items()}
    order: list[str] = list(existing.get("order", []))

    if key in tiles:
        tiles[key]["visits"] = int(tiles[key].get("visits", 1)) + 1
        tiles[key]["last_turn"] = turn_index
        tiles[key]["name"] = raw
    else:
        x, y = _assign_coord(tiles, existing.get("current"), key)
        tiles[key] = {
            "x": x,
            "y": y,
            "name": raw,
            "kind": kind or classify_kind(raw),
            "turn": turn_index,
            "last_turn": turn_index,
            "visits": 1,
        }
        order.append(key)

    new_state[MAP_STATE_KEY] = {"tiles": tiles, "current": key, "order": order}
    return new_state


def current_tile(state: dict[str, Any]) -> dict[str, Any] | None:
    map_state = state.get(MAP_STATE_KEY) if isinstance(state, dict) else None
    if not map_state:
        return None
    current = map_state.get("current")
    tile = map_state.get("tiles", {}).get(current) if current else None
    return tile
