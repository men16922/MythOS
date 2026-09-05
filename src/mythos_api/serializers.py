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
from mythos_core.text_match import mentions
from mythos_runtime.companion_growth import companion_sheet
from mythos_runtime.options import MemoryOverview, RunSummary, RuntimeSnapshot, SaveSlot
from mythos_runtime.route_runtime import node_axis, select_perspective
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_directives import available_opening_variants
from mythos_runtime.session_memory import unresolved_setups


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
    loc = location_id or ""
    # word-bounded ASCII ("inspired" is not `spire`); Korean stays substring.
    if mentions(loc, ["spire", "스파이어"]):
        return "경보 (Critical)"
    elif mentions(loc, ["폐기", "abandoned", "wraith", "underground", "지하"]):
        return "위험 (High)"
    elif mentions(loc, ["야시장", "market", "binder", "hall", "회랑", "열람실"]):
        return "경계 (Medium)"
    elif mentions(loc, ["복지", "welfare", "corridor", "복도", "data-layer"]):
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
    "people": "사람 돕기",
    "data": "단서 찾기",
    "safety": "안전하게 가기",
    "control": "밀고 나가기",
}


def _clean_text(value: Any) -> str:
    text = str(value or "")
    text = re.sub(r"<0x[0-9a-fA-F]{2}>", "", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


# Value-axis vocabulary for Director-authored choices. Junction (``route:``)
# choices do NOT come through here — they read the destination node's real axis
# (see `_route_choice_axis`, 2026-07-19).
#
# The list was Korean-only, so on an EN loop nothing in the label could match and
# the axis collapsed to the `intent` fallback below: every `interact` choice
# became "Help people" whatever it actually did, and two choices sharing an
# intent always drew the same chip. Measured over three banked EN arms, only
# 5/292 labels hit any keyword — and those were `"ix"` matching inside *Fix* and
# *Prefix*. English terms are paired with the Korean ones here, and ASCII
# keywords are word-bounded so a substring can no longer decide a value axis.
#
# Widened again 2026-08-09 after measuring what the remaining chipless labels
# were: not choices that advertise nothing, but three families this list had no
# words for — traversal, sabotage, and choosing the fight. Chipless went 34% ->
# 10% over the same 292 labels with one reclassification. Evidence and the
# rejected fourth family (spoof -> data, where the *axis* is contested rather
# than the terms) are in `docs/plans/2026-08-09-value-axis-vocabulary-coverage.md`.
# Order is load-bearing: people, then data, then safety, then control.
_AXIS_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("people", (
        "시민", "세린", "카이", "구출", "도와", "사람", "아이", "동료", "보호", "대화", "설득",
        "구하", "살리", "지키", "감싸", "부축", "달래",
        "civilian", "citizen", "rescue", "help", "protect", "shield", "comfort",
        "reassure", "persuade", "convince", "ally", "companion", "wounded",
        "child", "aid", "se-rin", "kai", "han", "tae-o", "su-ah", "lin yue",
        # Plurals are separate keywords — ASCII matching is word-bounded, so
        # "civilian" never matched "civilians" (2026-08-09). Leading people to
        # safety is a rescue first and a route second, so these outrank the
        # traversal terms below by sitting on the earlier axis.
        "civilians", "survivor", "survivors",
        # Deliberately NOT here: "save" (saves a file as often as a person) and
        # "crowd" (a place to hide in — "blend into the crowd to lose the drones"
        # is evasion, and calling it "Help people" is the very mislabel this
        # vocabulary exists to stop).
    )),
    ("data", (
        "데이터", "증거", "단서", "기록", "로그", "명단", "신호", "분석", "추적", "해킹",
        "살펴", "조사", "확인", "관찰", "기억", "읽",
        "data", "evidence", "clue", "record", "records", "log", "logs", "ledger",
        "roster", "signal", "analyze", "analyse", "trace", "decrypt", "hack",
        "archive", "terminal", "memory", "memorise", "memorize", "observe",
        "study", "examine", "inspect", "decode", "search", "read", "scan", "map",
    )),
    ("safety", (
        "숨", "우회", "탈출", "도망", "회피", "재정비", "엄폐", "안전", "치료", "휴식",
        "빠져나", "벗어나", "물러", "잠복", "낮춰", "피한", "피해", "기다",
        "hide", "evade", "avoid", "slip", "retreat", "flee", "escape", "withdraw",
        "cover", "shelter", "rest", "recover", "safe", "conceal", "unseen", "wait",
        "freeze", "bypass", "sneak", "duck", "crouch", "blend", "disengage",
        # Traversal under threat (2026-08-09). This scenario almost never
        # phrases an escape with the abstract verbs above — it phrases it as a
        # body moving through a gap, and 47 such labels rendered no chip at all.
        # Deliberately NOT here: "run", whose only hit was "Wrench the slate
        # from her hands and run into the drainage system" — a theft the safety
        # axis would have hidden, and which "wrench" now reads as control.
        "sprint", "squeeze", "slide", "scramble", "climb", "scale", "leap",
        "dive", "dash", "crawl", "vault", "descend",
    )),
    ("control", (
        "공격", "돌파", "제압", "봉쇄", "명령", "위협", "강제", "관리자",
        "부수", "뚫", "차단", "제거", "맞서", "대면",
        "attack", "strike", "breach", "force", "seize", "suppress", "override",
        "command", "threaten", "demand", "destroy", "disable", "confront", "smash",
        "jam", "administrator", "ix",
        # Sabotage — the same family as override/disable/jam above, in the
        # phrasings the Director actually authors (2026-08-09).
        "overload", "sever", "short out", "reroute", "cut the power", "blackout",
        "pry", "wrench", "kick", "rip", "break open",
        # Choosing the fight. Safe to keep broad because safety is scanned
        # first, so "avoid the fight" and "flee the fight" stay safety.
        # Deliberately NOT here: "brace", which read "Brace yourself against the
        # wall and ride out the feedback loop" — enduring, not imposing — as
        # control; and "draw your weapon", whose only hit was drawing the drones
        # away *from the civilians*, a people choice this would have mislabelled.
        "ambush", "stand your ground", "fight",
    )),
)


def _choice_axis(label: str, intent: str | None) -> str | None:
    """The value axis this choice advertises, or ``None`` for no chip at all.

    ``None`` is a real answer, not a failure: a junction choice whose
    destination has no axis already renders no chip (2026-07-19). Inventing one
    is worse than omitting it, because the chip is a promise about what the
    choice does. Two fallbacks used to invent one and produced exactly the
    mislabels reported on the 2026-08-08 arm — ``interact`` meant "Help people"
    however the choice was phrased, so an evasion action advertised rescue, and
    everything else defaulted to "safety", so both choices in a scene drew the
    same chip.
    """
    text = f"{label} {intent or ''}".lower()
    for axis, keywords in _AXIS_KEYWORDS:
        if mentions(text, keywords):
            return axis
    # Only intents that *name* their axis are trusted. `interact` does not — a
    # terminal, a door and a person are all interactions — and neither does
    # `explore`.
    if intent:
        clean_intent = intent.lower()
        if "archive" in clean_intent:
            return "data"
        if "rewrite" in clean_intent:
            return "control"
    return None


def _safe_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _choice_stakes(choice_data: dict[str, Any], axis_label: str | None) -> list[str]:
    stakes = [f"가치축: {axis_label}"] if axis_label else []
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
        "people": "누군가를 살리거나 신뢰를 얻는 쪽입니다.",
        "data": "단서와 기록을 더 얻는 쪽입니다.",
        "safety": "위험을 줄이고 버티는 쪽입니다.",
        "control": "막힌 길을 힘으로 여는 쪽입니다.",
    }
    return previews.get(axis, "다음 장면의 우선순위를 바꿉니다.")


# Route-runtime axis vocabulary → the UI chip vocabulary (only "evidence"
# differs; the UI has always called that chip "data").
_ROUTE_AXIS_TO_UI = {"people": "people", "evidence": "data", "safety": "safety", "control": "control"}


def _route_choice_axis(choice_id: str, state: dict[str, Any]) -> str | None:
    """UI axis for a junction (route:) choice, from the destination node itself.

    The keyword heuristic must not run on route choices: destination labels are
    full of words like 데이터/단서/추적(도) that classify almost every branch as
    "단서 찾기" regardless of what picking it actually tallies (§3 2026-07-19
    finding). Anchors answer with the perspective that would be selected under
    current flags — the axis that will really accrue on entry; waypoints answer
    with their node axis. ``None`` (market/event…) renders no value-axis chip.
    """
    target = choice_id[len("route:") :]
    route = state.get("_route_map")
    nodes = route.get("nodes") if isinstance(route, dict) else None
    node = nodes.get(target) if isinstance(nodes, dict) else None
    if not isinstance(node, dict):
        return None
    if node.get("perspectives"):
        chosen = select_perspective(node, set(state.get("flags", []) or []))
        axis = chosen.get("axis") if isinstance(chosen, dict) else None
    else:
        axis = node_axis(node)
    return _ROUTE_AXIS_TO_UI.get(axis) if isinstance(axis, str) else None


def _choice_to_dict(
    choice: Any, *, combat_pending: bool = False, state: dict[str, Any] | None = None
) -> dict[str, Any]:
    choice_data = cast(dict[str, Any], to_json_dict(choice))
    choice_data["label"] = _clean_text(choice_data.get("label"))
    choice_id = str(choice_data.get("choice_id") or "")
    if choice_id.startswith("route:") and state is not None:
        axis = _route_choice_axis(choice_id, state)
    else:
        axis = _choice_axis(str(choice_data.get("label") or ""), choice_data.get("intent"))
    axis_label = _CHOICE_AXIS_LABELS[axis] if axis else None
    # Combat telegraph: on a parked-climax confrontation scene every choice fires
    # the boss fight, so all choices carry the risk badge regardless of what the
    # Director generated.
    if combat_pending:
        choice_data["combat_risk"] = True
    out = {
        **choice_data,
        "stakes": _choice_stakes(choice_data, axis_label),
    }
    if axis:
        out["axis"] = axis
        out["axis_label"] = axis_label
        out["result_preview"] = _choice_preview(axis)
    return out


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
    (which carries internal flag names) is never exposed — only `player_goal`.

    On a variant loop (`_opening_variant` != "default") a gate may reskin its
    goal via `player_goal_variants: {<variant_id>: str}` — the connect gate uses
    this so a non-Se-rin opening does not display the Se-rin escape objective.
    Missing map/entry falls back to the shared `player_goal` (loop 1 and later
    acts converge by design)."""
    scenario_id = state.get("scenario_id") if isinstance(state, dict) else None
    if not scenario_id:
        return None
    try:
        gates = load_scenario(str(scenario_id)).session_design.get("chapter_gates", [])
    except Exception:  # noqa: BLE001 — scenario lookup is best-effort
        return None
    phase = loop.phase.value
    variant = str(state.get("_opening_variant") or "default")
    for gate in gates:
        if isinstance(gate, dict) and gate.get("phase") == phase:
            if variant != "default":
                overrides = gate.get("player_goal_variants")
                if isinstance(overrides, dict):
                    override = overrides.get(variant)
                    if isinstance(override, str) and override.strip():
                        return override
            goal = gate.get("player_goal")
            return str(goal) if goal else None
    return None


def _presentation_cues(scene: Any, state: dict[str, Any], combat: Any) -> list[str]:
    """Deterministic audiovisual cues for this snapshot (G3 cinematic system).

    Derived from state the engine already produced — never from LLM prose — so
    the client's effect layer (shake/vignette/sting + SFX) fires on rule-true
    moments: combat entry, cutscene reveal, tension spike, item pickup.
    """
    cues: list[str] = []
    fighting = bool(combat) and not (isinstance(combat, dict) and combat.get("finished"))
    if fighting and state.get("_combat_interstitial"):
        cues += ["alarm", "shake"]
    elif scene.scene_type == "cutscene" or state.get("_active_twist"):
        # G2: a twist delivery scene is forced to pair with the reveal cues.
        cues += ["sting", "glitch"]
    impact = state.get("_last_choice_impact")
    if isinstance(impact, dict):
        try:
            tension_delta = int(impact.get("tension_delta") or 0)
        except (TypeError, ValueError):
            tension_delta = 0
        if tension_delta >= 8 and not fighting:
            cues += ["vignette", "drone"]
        if impact.get("items_gained"):
            cues.append("pickup")
    return cues


def _next_loop_teaser(loop: Any, state: dict[str, Any]) -> dict[str, Any] | None:
    """G4 loop hooking: the ended-loop screen's "다음 루프 예고" payload.

    Cliffhanger material derived from what this run left behind: the first
    unresolved setup ("떡밥"), the opening-variant candidates the player could
    plausibly draw next (unlocked-but-unmet companions), and the modifier pool.
    None outside an ended loop or when nothing teases.
    """
    if loop.phase.value != "ended":
        return None
    teaser: dict[str, Any] = {}
    open_setups = unresolved_setups(state)
    if open_setups:
        teaser["open_setup"] = str(open_setups[0].get("text") or "")
    scenario_id = str(state.get("scenario_id") or "neo-seoul")
    try:
        scenario = load_scenario(scenario_id)
        variants = available_opening_variants(scenario_id)
    except Exception:
        return teaser or None
    meta = state.get("meta_progression")
    meta = meta if isinstance(meta, dict) else {}
    unlocked = {str(a) for a in meta.get("unlocked_allies") or []} | {"kai"}
    met = {str(a) for a in meta.get("allies_met") or []}
    allies = scenario.combat.get("allies", {}) if isinstance(scenario.combat, dict) else {}
    candidates = []
    for vid in sorted(variants):
        if vid == "solo" or vid not in unlocked or vid in met:
            continue
        entry = allies.get(vid)
        candidates.append(str(entry.get("name")) if isinstance(entry, dict) else vid)
    if candidates:
        teaser["variant_candidates"] = candidates[:3]
    modifiers = [
        str(m.get("name") or m.get("id"))
        for m in scenario.loop_modifiers
        if isinstance(m, dict) and m.get("id")
    ]
    if modifiers:
        teaser["modifier_names"] = modifiers[:3]
    return teaser or None


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
            "choices": [
                _choice_to_dict(
                    choice,
                    combat_pending=bool(state.get("_pending_boss_combat")),
                    state=state,
                )
                for choice in scene.choices
            ],
            "visual_brief": _clean_text(scene.visual_brief),
            "scene_type": scene.scene_type,
            "objective": _clean_text(scene.objective) if scene.objective else scene.objective,
            "chapter_goal": _chapter_goal(loop, state),
            "action_result": _clean_text(scene.action_result) if scene.action_result else scene.action_result,
            "stakes_summary": _scene_stakes_summary(loop, state),
            "choice_result": state.get("_last_choice_impact") if isinstance(state, dict) else None,
            # G3 deterministic cinematic cues (alarm/shake/sting/glitch/vignette/
            # drone/pickup) — the client effect layer keys off these, not prose.
            "presentation_cues": _presentation_cues(scene, state, snapshot.combat),
        },
        "assets": [to_json_dict(asset) for asset in snapshot.assets],
        "image_result": to_json_dict(snapshot.image_result) if snapshot.image_result else None,
        "echo": to_json_dict(snapshot.echo) if snapshot.echo else None,
        "active_echoes": [to_json_dict(echo) for echo in loop.active_echoes],
        # G4 loop hooking: ended-loop cliffhanger (open setup + next-run teasers).
        "next_loop_teaser": _next_loop_teaser(loop, state),
        "bgm_path": snapshot.bgm_path,
        "combat": snapshot.combat,
        "epiphanies_unlocked": snapshot.epiphanies_unlocked,
        "boons": snapshot.boons,
        "market": snapshot.market,
        # Met companions with growth-folded stat sheets (CHARACTER tab).
        "companions": _companion_roster(state),
    }
