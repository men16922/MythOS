"""JSON serializers mapping runtime DTOs to the REST contract.

The frontend consumes a stable `RuntimeSnapshot` JSON shape (design §3.1).
We lean on `mythos_core.to_json_dict` for faithful recursive serialization
of the frozen dataclasses and only reshape the top level for client
convenience (flattened scene, explicit loop fields).
"""

from __future__ import annotations

import re
from typing import Any, cast

from mythos_core import PlayerProfile
from mythos_core.models import to_json_dict
from mythos_runtime.companion_growth import companion_sheet
from mythos_runtime.options import MemoryOverview, RunSummary, RuntimeSnapshot, SaveSlot
from mythos_runtime.scenario import load_scenario


def player_to_dict(player: PlayerProfile) -> dict[str, Any]:
    """Serialize a player profile for the auth/connect response."""
    return cast(dict[str, Any], to_json_dict(player))


def memory_overview_to_dict(overview: MemoryOverview, language: str = "ko") -> dict[str, Any]:
    """Serialize a MemoryOverview for Codex and memory progression.

    Enriches the raw round-trip with a resolved ``cutscene_gallery``: the player's
    cross-loop ``unlocked_cutscenes`` (ids in meta progression) joined with the
    scenario's authored cutscene directives, so the UI gets unlocked entries (image
    + script body) and locked stubs (title + threshold) without re-loading content.
    """
    payload = cast(dict[str, Any], to_json_dict(overview))
    payload["cutscene_gallery"] = _cutscene_gallery_for_overview(
        overview.meta_progression, language
    )
    return payload


def _cutscene_gallery_for_overview(
    meta_progression: dict[str, Any] | None,
    language: str = "ko",
) -> list[dict[str, Any]]:
    from mythos_runtime.cutscenes import cutscene_gallery
    from mythos_runtime.scenario_directives import load_scenario_directives

    if not isinstance(meta_progression, dict):
        return []
    scenario_id = meta_progression.get("scenario_id")
    if not scenario_id:
        return []
    cutscenes = load_scenario_directives(str(scenario_id), language).cutscenes
    if not cutscenes:
        return []
    unlocked = meta_progression.get("unlocked_cutscenes") or []
    return cutscene_gallery(cutscenes, [str(c) for c in unlocked])


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


_CHOICE_AXIS_LABELS = {
    "people": "시민/관계",
    "data": "증거/진실",
    "safety": "안전/은신",
    "control": "통제/돌파",
}


def _clean_text(value: Any) -> str:
    text = str(value or "")
    text = re.sub(r"<0x[0-9a-fA-F]{2}>", "", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def _choice_axis(label: str, intent: str | None) -> str:
    text = f"{label} {intent or ''}".lower()
    axis_keywords = [
        ("people", ["시민", "세린", "카이", "구출", "도와", "사람", "아이", "동료", "보호", "대화", "설득"]),
        ("data", ["데이터", "증거", "단서", "기록", "로그", "명단", "신호", "분석", "추적", "해킹", "archive"]),
        ("safety", ["숨", "우회", "탈출", "도망", "회피", "재정비", "엄폐", "안전", "치료", "휴식", "explore"]),
        ("control", ["공격", "돌파", "제압", "봉쇄", "명령", "위협", "강제", "관리자", "ix", "rewrite"]),
    ]
    for axis, keywords in axis_keywords:
        if any(keyword in text for keyword in keywords):
            return axis
    if intent:
        clean_intent = intent.lower()
        if "interact" in clean_intent:
            return "people"
        if "archive" in clean_intent:
            return "data"
        if "rewrite" in clean_intent:
            return "control"
    return "safety"


def _safe_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _choice_stakes(choice_data: dict[str, Any], axis_label: str) -> list[str]:
    stakes = [f"가치축: {axis_label}"]
    cost = choice_data.get("cost")
    if isinstance(cost, dict):
        stability = _safe_int(cost.get("stability"))
        tension = _safe_int(cost.get("tension"))
        if stability:
            stakes.append(f"안정성 {stability:+d}")
        if tension:
            stakes.append(f"긴장도 {tension:+d}")
    requires = choice_data.get("requires")
    if isinstance(requires, dict):
        stability_min = requires.get("stability_min")
        tension_max = requires.get("tension_max")
        if stability_min is not None:
            stakes.append(f"필요 안정성 {stability_min}+")
        if tension_max is not None:
            stakes.append(f"긴장도 {tension_max} 이하")
    return stakes


def _choice_preview(axis: str) -> str:
    previews = {
        "people": "관계와 시민 안전 쪽 결과가 커집니다.",
        "data": "단서, 기록, 진실 규명 쪽 결과가 커집니다.",
        "safety": "생존, 은신, 재정비 쪽 결과가 커집니다.",
        "control": "충돌, 돌파, 시스템 통제 쪽 결과가 커집니다.",
    }
    return previews.get(axis, "다음 장면의 우선순위를 바꿉니다.")


def _choice_to_dict(choice: Any) -> dict[str, Any]:
    choice_data = cast(dict[str, Any], to_json_dict(choice))
    choice_data["label"] = _clean_text(choice_data.get("label"))
    axis = _choice_axis(str(choice_data.get("label") or ""), choice_data.get("intent"))
    axis_label = _CHOICE_AXIS_LABELS[axis]
    return {
        **choice_data,
        "axis": axis,
        "axis_label": axis_label,
        "stakes": _choice_stakes(choice_data, axis_label),
        "result_preview": _choice_preview(axis),
    }


def _route_node_label(state: dict[str, Any]) -> str | None:
    route = state.get("_route_map")
    if not isinstance(route, dict):
        return None
    current = route.get("current")
    nodes = route.get("nodes")
    if not current or not isinstance(nodes, dict):
        return None
    node = nodes.get(current)
    if not isinstance(node, dict):
        return str(current)
    return str(node.get("title") or node.get("label") or current)


def _scene_stakes_summary(loop: Any, state: dict[str, Any]) -> list[str]:
    stakes: list[str] = []
    # Early acts: the player is still learning *why* they're in danger ("왜 위험한지
    # 모르겠다" feedback). Surface the scenario's core existential stake up top until
    # the threat is established; drop it once past the opening acts.
    if loop.phase.value in ("connect", "explore"):
        scenario_id = state.get("scenario_id") if isinstance(state, dict) else None
        if scenario_id:
            try:
                core = load_scenario(str(scenario_id)).playability.get("core_stake")
            except Exception:  # noqa: BLE001 — scenario lookup is best-effort
                core = None
            if core:
                stakes.append(str(core))
    route_label = _route_node_label(state)
    if route_label:
        stakes.append(f"현재 지점: {route_label}")
    if loop.stability <= 35:
        stakes.append("루프 안정도 위험")
    elif loop.stability >= 70:
        stakes.append("루프 안정도 양호")
    if loop.tension >= 70:
        stakes.append("관리망 추적 위험 높음")
    elif loop.tension <= 30:
        stakes.append("관리망 추적 낮음")
    if state.get("_soft_defeat_pending"):
        stakes.append("포획 후 회복 루트 진행 중")
    return stakes


def _resolve_inventory(state: dict[str, Any]) -> list[dict[str, Any]]:
    """Resolve ``state["_inventory"]`` into named, counted entries for the client.

    Combat loot lands in ``loop.state["_inventory"]``; ``CombatService`` stores
    each entry as the item-definition dict (``{id, name, kind, rarity, ...}``),
    though legacy/skill paths may store a bare id string. We normalize both,
    backfilling missing fields from the scenario's ``combat.items`` definitions,
    and collapse duplicates into ``count``.
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
    fields: dict[str, dict[str, Any]] = {}
    for entry in raw:
        if isinstance(entry, dict):
            item_id = str(entry.get("id") or entry.get("item_id") or entry.get("name") or "item")
            source = entry
        else:
            item_id = str(entry)
            source = {}
        definition = items_def.get(item_id, {}) if isinstance(items_def, dict) else {}
        quantity = 1
        if isinstance(source, dict):
            try:
                quantity = max(1, int(source.get("quantity") or source.get("count") or 1))
            except (TypeError, ValueError):
                quantity = 1
        if item_id not in counts:
            order.append(item_id)
            fields[item_id] = {
                "name": source.get("name") or definition.get("name") or item_id,
                "kind": source.get("kind") or definition.get("kind") or "item",
                "rarity": source.get("rarity") or definition.get("rarity"),
                "effect": source.get("effect") or definition.get("effect"),
                # equipment metadata (slot/stats from scenario def; equipped from state)
                "slot": source.get("slot") or definition.get("slot"),
                "stats": source.get("stats") or (definition.get("stats") if isinstance(definition, dict) else None),
                "equipped": bool(source.get("equipped")),
                # who wears it — "player" (default) or a party member id
                "equipped_by": source.get("equipped_by") if source.get("equipped") else None,
            }
        elif isinstance(source, dict) and source.get("equipped"):
            fields[item_id]["equipped"] = True
            fields[item_id]["equipped_by"] = source.get("equipped_by")
        counts[item_id] = counts.get(item_id, 0) + quantity

    return [{"id": item_id, "count": counts[item_id], **fields[item_id]} for item_id in order]


def _companion_roster(state: dict[str, Any]) -> list[dict[str, Any]]:
    """Met companions with growth-folded sheets for the CHARACTER tab.

    Membership = any signal the loop already knows this companion: a ``_party``
    member, an unlock flag set, or an affection entry. Each sheet keeps base
    stats and growth bonuses separate (``companion_sheet``) and resolves skill
    ids to display names from the scenario skill pool.
    """
    if not isinstance(state, dict):
        return []
    scenario_id = state.get("scenario_id")
    if not scenario_id:
        return []
    try:
        combat = load_scenario(str(scenario_id)).combat
    except Exception:  # noqa: BLE001 — scenario lookup is best-effort
        return []
    allies_pool = combat.get("allies", {}) if isinstance(combat, dict) else {}
    if not isinstance(allies_pool, dict):
        return []
    skills_pool = combat.get("skills", {}) if isinstance(combat, dict) else {}
    flags = {str(f) for f in state.get("flags", []) or []}
    relationships = state.get("relationships")
    relationships = relationships if isinstance(relationships, dict) else {}
    party = state.get("_party")
    party = party if isinstance(party, dict) else {}
    members: dict[str, dict[str, Any]] = {}
    for member in party.get("members", []) if isinstance(party.get("members"), list) else []:
        if isinstance(member, str):
            members[member] = {"id": member}
        elif isinstance(member, dict) and member.get("id"):
            members[str(member["id"])] = member
    roster: list[dict[str, Any]] = []
    for ally_id, entry in allies_pool.items():
        if not isinstance(entry, dict):
            continue
        actual_id = str(entry.get("id", ally_id))
        unlock_flags = {str(flag) for flag in entry.get("unlock_flags", [])}
        met = (
            actual_id in members
            or bool(unlock_flags & flags)
            or actual_id in relationships
        )
        if not met:
            continue
        member = members.get(actual_id, {})
        carried_hp = member.get("hp")
        sheet = companion_sheet(
            entry,
            affection=relationships.get(actual_id),
            meta_progression=state.get("meta_progression"),
            run_boons=state.get("_run_boons"),
            carried_hp=int(carried_hp) if isinstance(carried_hp, int | float) else None,
        )
        sheet["in_party"] = actual_id in members
        sheet["skills"] = [
            {
                "id": skill_id,
                "name": (skills_pool.get(skill_id) or {}).get("name") or skill_id
                if isinstance(skills_pool, dict)
                else skill_id,
            }
            for skill_id in sheet["skills"]
        ]
        roster.append(sheet)
    return roster


def _chapter_goal(loop: Any, state: dict[str, Any]) -> str | None:
    """The current act's player-facing goal from the scenario's `chapter_gates`,
    keyed by loop phase. Gives the objective strip a stable Golden Path goal even
    when the per-scene LLM `objective` is vague or missing. The raw `gate` text
    (which carries internal flag names) is never exposed — only `player_goal`."""
    scenario_id = state.get("scenario_id") if isinstance(state, dict) else None
    if not scenario_id:
        return None
    try:
        gates = load_scenario(str(scenario_id)).session_design.get("chapter_gates", [])
    except Exception:  # noqa: BLE001 — scenario lookup is best-effort
        return None
    phase = loop.phase.value
    for gate in gates:
        if isinstance(gate, dict) and gate.get("phase") == phase:
            goal = gate.get("player_goal")
            return str(goal) if goal else None
    return None


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
            "title": _clean_text(scene.title),
            "location": _clean_text(scene.location),
            "narration": _clean_text(scene.narration),
            "choices": [_choice_to_dict(choice) for choice in scene.choices],
            "visual_brief": _clean_text(scene.visual_brief),
            "scene_type": scene.scene_type,
            "objective": _clean_text(scene.objective) if scene.objective else scene.objective,
            "chapter_goal": _chapter_goal(loop, state),
            "action_result": _clean_text(scene.action_result) if scene.action_result else scene.action_result,
            "stakes_summary": _scene_stakes_summary(loop, state),
            "choice_result": state.get("_last_choice_impact") if isinstance(state, dict) else None,
        },
        "assets": [to_json_dict(asset) for asset in snapshot.assets],
        "image_result": to_json_dict(snapshot.image_result) if snapshot.image_result else None,
        "echo": to_json_dict(snapshot.echo) if snapshot.echo else None,
        "active_echoes": [to_json_dict(echo) for echo in loop.active_echoes],
        "bgm_path": snapshot.bgm_path,
        "combat": snapshot.combat,
        "epiphanies_unlocked": snapshot.epiphanies_unlocked,
        "boons": snapshot.boons,
        "market": snapshot.market,
        # Met companions with growth-folded stat sheets (CHARACTER tab).
        "companions": _companion_roster(state),
    }
