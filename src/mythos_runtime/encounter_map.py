"""Map-level roaming encounter contacts.

This layer sits above tactical combat. The narrative/LLM can request encounter
contacts from the predefined scenario pool, but movement and collision are
deterministic runtime state so a rerun cannot invent or erase enemies.
"""

from __future__ import annotations

from typing import Any

from mythos_core.dice import Dice, _seed_int

ENCOUNTER_MAP_KEY = "_encounter_map"


def tick_encounter_map(
    state: dict[str, Any],
    *,
    combat_pool: dict[str, Any],
    seed: str,
    turn_index: int,
    requested: list[str] | None = None,
    max_contacts: int = 4,
    allow_ambient: bool = False,
) -> tuple[dict[str, Any], str | None]:
    """Advance roaming contacts and return a triggered encounter id, if any."""
    map_state = state.get("_map") if isinstance(state, dict) else None
    current = _current_coord(map_state)
    if current is None:
        return state, None

    new_state = dict(state)
    encounter_map = dict(new_state.get(ENCOUNTER_MAP_KEY, {}))
    contacts = {
        str(key): dict(value)
        for key, value in encounter_map.get("contacts", {}).items()
        if isinstance(value, dict)
    }
    encounters = combat_pool.get("encounters", {}) if isinstance(combat_pool, dict) else {}
    requested_ids = [eid for eid in requested or [] if eid in encounters]

    for encounter_id in requested_ids:
        if len(contacts) >= max_contacts:
            break
        if any(contact.get("encounter_id") == encounter_id for contact in contacts.values()):
            continue
        contact = _build_contact(
            encounter_id,
            encounters[encounter_id],
            combat_pool=combat_pool,
            origin=current,
            seed=f"{seed}:spawn:{turn_index}:{encounter_id}:{len(contacts)}",
            turn_index=turn_index,
        )
        contacts[contact["id"]] = contact

    if allow_ambient and not contacts and encounters:
        # Ambient contacts are reserved for high pressure states. In normal
        # exploration, forced patrols make the story feel like unavoidable combat.
        encounter_id = _weighted_encounter_id(encounters, Dice(f"{seed}:ambient:{turn_index}"))
        contact = _build_contact(
            encounter_id,
            encounters[encounter_id],
            combat_pool=combat_pool,
            origin=current,
            seed=f"{seed}:ambient-spawn:{turn_index}",
            turn_index=turn_index,
        )
        contacts[contact["id"]] = contact

    triggered: str | None = None
    for contact_id, contact in list(contacts.items()):
        if contact.get("state") == "defeated":
            continue
        cooldown = int(contact.get("cooldown", 0))
        if cooldown > 0:
            if int(contact.get("last_turn", -1)) < turn_index:
                contact = _move_contact_away(
                    contact,
                    current,
                    seed=f"{seed}:cooldown:{turn_index}:{contact_id}",
                )
                contact["last_turn"] = turn_index
            contact["cooldown"] = cooldown - 1
            contacts[contact_id] = contact
            continue
        if int(contact.get("last_turn", -1)) < turn_index:
            contact = _move_contact(contact, current, seed=f"{seed}:move:{turn_index}:{contact_id}")
            contact["last_turn"] = turn_index
            contacts[contact_id] = contact
        if (int(contact.get("x", 0)), int(contact.get("y", 0))) == current:
            triggered = str(contact.get("encounter_id"))
            contact["state"] = "engaged"
            contacts[contact_id] = contact
            break

    encounter_map["contacts"] = contacts
    encounter_map["last_turn"] = turn_index
    new_state[ENCOUNTER_MAP_KEY] = encounter_map
    return new_state, triggered


def mark_encounter_resolved(state: dict[str, Any], encounter_id: str | None) -> dict[str, Any]:
    if not encounter_id:
        return state
    encounter_map = state.get(ENCOUNTER_MAP_KEY) if isinstance(state, dict) else None
    if not isinstance(encounter_map, dict):
        return state
    contacts = {
        str(key): dict(value)
        for key, value in encounter_map.get("contacts", {}).items()
        if isinstance(value, dict)
    }
    for contact in contacts.values():
        if contact.get("encounter_id") == encounter_id:
            contact["state"] = "defeated"
    new_state = dict(state)
    new_state[ENCOUNTER_MAP_KEY] = {**encounter_map, "contacts": contacts}
    return new_state


def mark_encounter_alerted(state: dict[str, Any], encounter_id: str | None) -> dict[str, Any]:
    if not encounter_id:
        return state
    encounter_map = state.get(ENCOUNTER_MAP_KEY) if isinstance(state, dict) else None
    if not isinstance(encounter_map, dict):
        return state
    contacts = {
        str(key): dict(value)
        for key, value in encounter_map.get("contacts", {}).items()
        if isinstance(value, dict)
    }
    for contact in contacts.values():
        if contact.get("encounter_id") == encounter_id:
            contact["state"] = "alerted"
            contact["cooldown"] = max(1, int(contact.get("cooldown", 0)))
    new_state = dict(state)
    new_state[ENCOUNTER_MAP_KEY] = {**encounter_map, "contacts": contacts}
    return new_state


def _current_coord(map_state: Any) -> tuple[int, int] | None:
    if not isinstance(map_state, dict):
        return None
    current = map_state.get("current")
    tile = map_state.get("tiles", {}).get(current) if current else None
    if not isinstance(tile, dict):
        return None
    return int(tile.get("x", 0)), int(tile.get("y", 0))


def _build_contact(
    encounter_id: str,
    encounter: dict[str, Any],
    *,
    combat_pool: dict[str, Any],
    origin: tuple[int, int],
    seed: str,
    turn_index: int,
) -> dict[str, Any]:
    dice = Dice(seed)
    ox, oy = origin
    distance = int(encounter.get("map_distance", 2))
    direction = dice.choice([(-1, 0), (1, 0), (0, -1), (0, 1), (-1, 1), (1, -1)])
    x, y = ox + direction[0] * distance, oy + direction[1] * distance
    enemies = _encounter_enemy_brief(encounter, combat_pool)
    risk = int(encounter.get("risk", max(1, len(enemies))))
    glyph = enemies[0].get("glyph", "!") if enemies else "!"
    return {
        # sha-derived, not ``hash()``: str hashing is salted per process, and
        # the id is folded into later movement seeds — a restart must not
        # move a persisted contact differently.
        "id": f"contact_{turn_index}_{encounter_id}_{_seed_int(seed) % 10000}",
        "encounter_id": encounter_id,
        "name": str(encounter.get("name", encounter_id)),
        "x": x,
        "y": y,
        "state": "roaming",
        "risk": risk,
        "glyph": glyph,
        "enemies": enemies,
        "reward": dict(encounter.get("reward", {})),
        "last_turn": turn_index,
    }


def _move_contact(contact: dict[str, Any], player: tuple[int, int], *, seed: str) -> dict[str, Any]:
    dice = Dice(seed)
    cx, cy = int(contact.get("x", 0)), int(contact.get("y", 0))
    px, py = player
    distance = max(abs(cx - px), abs(cy - py))
    risk = int(contact.get("risk", 1))
    if distance <= 1:
        return {**contact, "x": px, "y": py}
    if distance <= 3 or risk >= 3:
        step_x = 0 if cx == px else (1 if px > cx else -1)
        step_y = 0 if cy == py else (1 if py > cy else -1)
        return {**contact, "x": cx + step_x, "y": cy + step_y}
    step_x, step_y = dice.choice([(-1, 0), (1, 0), (0, -1), (0, 1), (0, 0)])
    return {**contact, "x": cx + step_x, "y": cy + step_y}


def _move_contact_away(
    contact: dict[str, Any], player: tuple[int, int], *, seed: str
) -> dict[str, Any]:
    dice = Dice(seed)
    cx, cy = int(contact.get("x", 0)), int(contact.get("y", 0))
    px, py = player
    steps = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)]
    scored = [(max(abs((cx + sx) - px), abs((cy + sy) - py)), sx, sy) for sx, sy in steps]
    best_distance = max(distance for distance, _, _ in scored)
    best_steps = [(sx, sy) for distance, sx, sy in scored if distance == best_distance]
    step_x, step_y = dice.choice(best_steps)
    return {**contact, "x": cx + step_x, "y": cy + step_y}


def _weighted_encounter_id(encounters: dict[str, Any], dice: Dice) -> str:
    ids = list(encounters)
    weights = [float(encounters[eid].get("weight", 1)) for eid in ids]
    return str(dice.weighted_choice(ids, weights))


def _encounter_enemy_brief(
    encounter: dict[str, Any], combat_pool: dict[str, Any]
) -> list[dict[str, Any]]:
    bestiary = combat_pool.get("bestiary", {}) if isinstance(combat_pool, dict) else {}
    result: list[dict[str, Any]] = []
    for group in encounter.get("enemies", []):
        entry = bestiary.get(group.get("bestiary"), {})
        if not isinstance(entry, dict):
            continue
        result.append(
            {
                "id": str(entry.get("id", group.get("bestiary", "enemy"))),
                "name": str(entry.get("name", group.get("bestiary", "enemy"))),
                "count": int(group.get("count", 1)),
                "glyph": str(entry.get("blip", "!")),
                "hp": int(entry.get("hp", 1)),
                "image": str(entry.get("image", "")),
            }
        )
    return result


__all__ = [
    "ENCOUNTER_MAP_KEY",
    "mark_encounter_alerted",
    "mark_encounter_resolved",
    "tick_encounter_map",
]
