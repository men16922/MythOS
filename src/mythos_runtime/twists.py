"""G2 twist bank — authored, condition-gated narrative reversals.

"반전은 연출 없이 텍스트로만 오면 죽는다": the bank is authored (deterministic
quality), the trigger is rule-based (flags / route progress / relationships),
at most ONE twist fires per loop, and the delivery scene is forced to pair
with the G3 sting+glitch cinematic cues.

Lifecycle on ``loop.state``:
- ``_pending_twist``  — selected at commit N; the NEXT prompt injects its
  directive so the model builds the scene around the reversal.
- ``_active_twist``   — moved here at commit N+1 (the delivery scene); the
  serializer keys the cinematic cues off it; cleared at commit N+2.
- ``_twists_fired``   — permanent per-loop ledger enforcing the 1/loop cap
  and never re-firing the same twist.

Data: ``scenario.json`` top-level ``twist_bank``:
``[{id, title, directive, when: {flags_any?, min_layer?, relationship_min?}}]``.
"""

from __future__ import annotations

from typing import Any

from mythos_core.dice import Dice
from mythos_runtime.route_map import ROUTE_MAP_KEY

PENDING_TWIST_KEY = "_pending_twist"
ACTIVE_TWIST_KEY = "_active_twist"
TWISTS_FIRED_KEY = "_twists_fired"


def _current_layer(state: dict[str, Any]) -> int:
    route = state.get(ROUTE_MAP_KEY)
    if not isinstance(route, dict):
        return 0
    node = (route.get("nodes") or {}).get(route.get("current"))
    if not isinstance(node, dict):
        return 0
    try:
        return int(node.get("layer", 0) or 0)
    except (TypeError, ValueError):
        return 0


def _conditions_met(when: dict[str, Any], state: dict[str, Any]) -> bool:
    flags = {str(f) for f in state.get("flags", []) or []}
    flags_any = when.get("flags_any")
    if isinstance(flags_any, list) and flags_any:
        if not flags & {str(f) for f in flags_any}:
            return False
    min_layer = when.get("min_layer")
    if min_layer is not None and _current_layer(state) < int(min_layer):
        return False
    relationship_min = when.get("relationship_min")
    if isinstance(relationship_min, dict):
        relationships = state.get("relationships")
        relationships = relationships if isinstance(relationships, dict) else {}
        for companion, minimum in relationship_min.items():
            try:
                if int(relationships.get(str(companion), 0) or 0) < int(minimum):
                    return False
            except (TypeError, ValueError):
                return False
    return True


def select_twist(
    twist_bank: list[dict[str, Any]] | None,
    state: dict[str, Any],
    *,
    seed: str,
    turn_index: int,
) -> dict[str, Any] | None:
    """Seed-pick one eligible authored twist, or None.

    None when the bank is empty, a twist already fired this loop (1/loop cap),
    one is already pending/active, or no candidate's conditions are met.
    """
    if not isinstance(state, dict):
        return None
    if state.get(PENDING_TWIST_KEY) or state.get(ACTIVE_TWIST_KEY):
        return None
    if state.get(TWISTS_FIRED_KEY):
        return None
    candidates = []
    for twist in twist_bank or []:
        if not isinstance(twist, dict) or not twist.get("id"):
            continue
        when_raw = twist.get("when")
        when: dict[str, Any] = when_raw if isinstance(when_raw, dict) else {}
        if _conditions_met(when, state):
            candidates.append(twist)
    if not candidates:
        return None
    picked = Dice(f"{seed}:twist:{turn_index}").choice(candidates)
    return {
        "id": str(picked.get("id")),
        "title": str(picked.get("title") or picked.get("id")),
        "directive": str(picked.get("directive") or ""),
    }


def advance_twist_lifecycle(state: dict[str, Any]) -> dict[str, Any]:
    """Per-commit stepper: active → cleared, pending → active (delivery scene).

    Called at the START of a narrative commit, mirroring the interstitial /
    cutscene transients: the scene being committed is the one whose prompt saw
    ``_pending_twist``, so it becomes the ``_active_twist`` delivery scene.
    """
    if not isinstance(state, dict):
        return state
    if not state.get(PENDING_TWIST_KEY) and not state.get(ACTIVE_TWIST_KEY):
        return state
    new_state = dict(state)
    new_state.pop(ACTIVE_TWIST_KEY, None)
    pending = new_state.pop(PENDING_TWIST_KEY, None)
    if isinstance(pending, dict):
        new_state[ACTIVE_TWIST_KEY] = pending
        fired = [str(t) for t in new_state.get(TWISTS_FIRED_KEY, []) or []]
        if pending.get("id") and str(pending["id"]) not in fired:
            fired.append(str(pending["id"]))
        new_state[TWISTS_FIRED_KEY] = fired
    return new_state


def twist_directive_note(state: dict[str, Any]) -> str:
    """Prompt directive for the delivery scene ("" when no twist is pending)."""
    pending = state.get(PENDING_TWIST_KEY) if isinstance(state, dict) else None
    if not isinstance(pending, dict) or not pending.get("directive"):
        return ""
    return (
        "=== 반전 발화 (TWIST — 이번 장면의 중심 사건) ===\n"
        f"[{pending.get('title')}] {pending.get('directive')}\n"
        "지침: 이 반전을 이번 장면의 중심 사건으로 삼아 화면 위에서 '보여'주어라 — "
        "설명 덤프 금지, 인물의 행동·대사·물증으로 드러낼 것. 새 수수께끼를 추가로 "
        "만들지 말고, 이 반전 하나에 집중하라."
    )
