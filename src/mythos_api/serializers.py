"""JSON serializers mapping runtime DTOs to the REST contract.

The frontend consumes a stable `RuntimeSnapshot` JSON shape (design §3.1).
We lean on `mythos_core.to_json_dict` for faithful recursive serialization
of the frozen dataclasses and only reshape the top level for client
convenience (flattened scene, explicit loop fields).
"""

from __future__ import annotations

from typing import Any, cast

from mythos_core import PlayerProfile
from mythos_core.models import to_json_dict
from mythos_runtime.options import MemoryOverview, RunSummary, RuntimeSnapshot, SaveSlot
from mythos_runtime.scenario import load_scenario


def player_to_dict(player: PlayerProfile) -> dict[str, Any]:
    """Serialize a player profile for the auth/connect response."""
    return cast(dict[str, Any], to_json_dict(player))


def memory_overview_to_dict(overview: MemoryOverview) -> dict[str, Any]:
    """Serialize a MemoryOverview for Codex and memory progression."""
    return cast(dict[str, Any], to_json_dict(overview))


def save_slot_to_dict(slot: SaveSlot) -> dict[str, Any]:
    """Serialize a SaveSlot for slots listing and manual saving."""
    return cast(dict[str, Any], to_json_dict(slot))


def run_summary_to_dict(run: RunSummary) -> dict[str, Any]:
    """Serialize a RunSummary for the run history list."""
    return cast(dict[str, Any], to_json_dict(run))


def _calculate_zone_risk(location_id: str, turn_index: int) -> str:
    loc = (location_id or "").lower()
    if any(k in loc for k in ["spire", "스파이어"]):
        return "경보 (Critical)"
    elif any(k in loc for k in ["폐기", "abandoned", "wraith", "underground", "지하"]):
        return "위험 (High)"
    elif any(k in loc for k in ["야시장", "market", "binder", "hall", "회랑", "열람실"]):
        return "경계 (Medium)"
    elif any(k in loc for k in ["복지", "welfare", "corridor", "복도", "data-layer"]):
        return "보통 (Low)"

    if turn_index < 7:
        return "보통 (Low)"
    elif turn_index < 19:
        return "경계 (Medium)"
    elif turn_index < 35:
        return "위험 (High)"
    else:
        return "경보 (Critical)"


def _resolve_inventory(state: dict[str, Any]) -> list[dict[str, Any]]:
    """Resolve ``state["_inventory"]`` item ids into named, counted entries.

    Combat loot lands in ``loop.state["_inventory"]`` as bare item ids; the client
    needs names/kinds to render them, so we map each id against the scenario's
    ``combat.items`` definitions here (server-side, single source of truth).
    """
    raw = state.get("_inventory") if isinstance(state, dict) else None
    if not isinstance(raw, list) or not raw:
        return []
    items_def: dict[str, Any] = {}
    scenario_id = state.get("scenario_id")
    if scenario_id:
        try:
            combat = load_scenario(str(scenario_id)).combat
            items_def = combat.get("items", {}) if isinstance(combat, dict) else {}
        except Exception:  # noqa: BLE001 — scenario lookup is best-effort
            items_def = {}
    counts: dict[str, int] = {}
    order: list[str] = []
    for item_id in raw:
        key = str(item_id)
        if key not in counts:
            order.append(key)
        counts[key] = counts.get(key, 0) + 1
    resolved: list[dict[str, Any]] = []
    for key in order:
        definition = items_def.get(key, {}) if isinstance(items_def, dict) else {}
        resolved.append(
            {
                "id": key,
                "name": definition.get("name", key),
                "kind": definition.get("kind", "item"),
                "rarity": definition.get("rarity"),
                "effect": definition.get("effect"),
                "count": counts[key],
            }
        )
    return resolved


def snapshot_to_dict(snapshot: RuntimeSnapshot) -> dict[str, Any]:
    """Serialize a RuntimeSnapshot into the frontend GameState contract."""
    loop = snapshot.loop
    scene = snapshot.scene
    state = loop.state if isinstance(loop.state, dict) else {}
    decay_pct = min(100, int((scene.turn_index / 60.0) * 100))
    return {
        "player": to_json_dict(snapshot.player),
        "loop_id": loop.loop_id,
        "phase": loop.phase.value,
        "location": loop.location_id,
        "stability": loop.stability,
        "tension": loop.tension,
        "decay_percent": decay_pct,
        "zone_risk": _calculate_zone_risk(loop.location_id, scene.turn_index),
        "clues_collected": snapshot.clues_collected,
        # Resolved combat loot inventory (ids -> named/counted entries) so the
        # client can render what the player actually picked up.
        "inventory": _resolve_inventory(state),
        # Metrics (humanity/insight/resilience/dominance) and autonomy live in
        # loop.state["flags"]; the client reads them from here.
        "state": to_json_dict(state),
        "active_scene": {
            "scene_id": scene.scene_id,
            "turn_index": scene.turn_index,
            "title": scene.title,
            "location": scene.location,
            "narration": scene.narration,
            "choices": [to_json_dict(choice) for choice in scene.choices],
            "visual_brief": scene.visual_brief,
            "scene_type": scene.scene_type,
            "objective": scene.objective,
            "action_result": scene.action_result,
        },
        "assets": [to_json_dict(asset) for asset in snapshot.assets],
        "image_result": to_json_dict(snapshot.image_result) if snapshot.image_result else None,
        "echo": to_json_dict(snapshot.echo) if snapshot.echo else None,
        "bgm_path": snapshot.bgm_path,
        "combat": snapshot.combat,
        "epiphanies_unlocked": snapshot.epiphanies_unlocked,
    }
