"""Combat glue helpers used by the session orchestration layer.

Pure-ish functions that summarize a resolved combat turn, pick a defeat-fallback
ending, parse the scenario-requested encounter id from a scene payload, and build
a combat visual brief. Extracted from ``session`` to separate combat presentation
glue from core loop orchestration.
"""

from __future__ import annotations

from typing import Any

from mythos_narrative import ScenePayload
from mythos_runtime.combat_service import CombatService, CombatTurnResult


def _encounter_meta(encounter: Any) -> dict[str, Any]:
    """Surface player-facing encounter metadata so the combat board can show a
    banner connecting the fight to the story: name, why it happened
    (``narrative_trigger``), what it teaches (``learning_goal``), and what winning
    means (``reward_intent``). Only non-empty fields are included; unknown/legacy
    encounters yield ``{}``."""
    if not isinstance(encounter, dict):
        return {}
    meta: dict[str, Any] = {}
    for key in ("id", "name", "narrative_trigger", "learning_goal", "reward_intent"):
        value = encounter.get(key)
        if value:
            meta[key] = value
    return meta


def _combat_summary(result: CombatTurnResult) -> dict[str, Any]:
    state = CombatService.load_state(result.loop)
    if state is None:
        return {}
    return _combat_summary_from_state(state)


def _combat_summary_from_state(state) -> dict[str, Any]:
    damage_dealt = 0
    damage_taken = 0
    hits = 0
    misses = 0
    crits = 0
    moves = 0
    defeated: list[str] = []
    for entry in state.log:
        actor = state.by_id(entry.actor)
        target_id = str(entry.detail.get("target", ""))
        target = state.by_id(target_id) if target_id else None
        damage = int(entry.detail.get("damage", 0) or 0)
        if entry.action in {"hit", "defeat"}:
            hits += 1
            if bool(entry.detail.get("crit", False)):
                crits += 1
            if actor is not None and target is not None:
                if actor.faction in {"player", "ally"} and target.faction == "enemy":
                    damage_dealt += damage
                elif actor.faction == "enemy" and target.faction in {"player", "ally"}:
                    damage_taken += damage
        elif entry.action == "miss":
            misses += 1
        elif entry.action == "move":
            moves += 1
        if entry.action == "defeat" and target is not None:
            defeated.append(target.name)

    player = state.player()
    living_enemies = len(state.living_enemies())
    return {
        "rounds": state.round,
        "turns": len([entry for entry in state.log if entry.action not in {"start", "end"}]),
        "damage_dealt": damage_dealt,
        "damage_taken": damage_taken,
        "hits": hits,
        "misses": misses,
        "crits": crits,
        "moves": moves,
        "defeated": defeated,
        "living_enemies": living_enemies,
        "player_hp": player.hp if player else 0,
        "player_max_hp": player.max_hp if player else 0,
    }


def _combat_defeat_fallback_ending(
    endings: list[dict[str, Any]],
) -> tuple[str | None, str]:
    has_erasure = any(ending.get("id") == "ending_erasure" for ending in endings)
    if has_erasure:
        return "ending_erasure", "강제 최적화 (Forced Erasure)"
    if endings:
        ending = endings[-1]
        return ending.get("id"), ending.get("title") or "Ended Loop"
    return None, "Combat Defeat"


def _requested_combat_id(payload: ScenePayload) -> str | None:
    encounter_id = payload.world_delta.start_combat
    encounter_id = _normalized_request_id(encounter_id)
    if encounter_id:
        return encounter_id
    for flag in payload.world_delta.flags:
        if flag.startswith("start_combat:"):
            return _normalized_request_id(flag.split(":", 1)[1])
    return None


def _normalized_request_id(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned or cleaned.lower() in {"null", "none", "false", "undefined", "nil"}:
        return None
    return cleaned


def _combat_visual_brief(radar: dict[str, Any]) -> str:
    blips = radar.get("blips", []) if isinstance(radar, dict) else []
    enemies = [
        str(blip.get("name", "enemy"))
        for blip in blips
        if isinstance(blip, dict) and blip.get("faction") == "enemy" and blip.get("alive", True)
    ]
    enemy_text = ", ".join(enemies[:3]) if enemies else "hostile signals"
    return (
        "Cinematic cyberpunk tactical combat scene in Neo-Seoul, "
        f"player signal facing {enemy_text}, neon rain, ARK surveillance grid, "
        "dynamic action, sharp readable silhouettes."
    )
