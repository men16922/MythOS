"""B3 loop modifiers — one authored per-run twist, seed-picked from loop 2.

CBT feedback #2 (replay variety): each loop from the second onward announces a
single scenario-authored modifier ("이번 루프의 변주") that deterministically
bends one system — e.g. patrol surge (ambient combat more frequent, victory
insight up), market boom (barter cheaper), signal jam (map horizon down, clue
insight up). The table is data-driven (``scenario.json`` top-level
``loop_modifiers``: ``[{id, name, desc, effect}]``); scenarios without one are
untouched. The pick is stored on ``loop.state["_loop_modifier"]`` at loop start
so consumers (combat pacing gate, market exchange, route rewards, the client
banner) all read the same decision. Loop 1 stays modifier-free — the tutorial
loop teaches the baseline rules before the game starts bending them.
"""

from __future__ import annotations

from typing import Any

from mythos_core.dice import Dice

LOOP_MODIFIER_KEY = "_loop_modifier"


def select_loop_modifier(
    modifiers: list[dict[str, Any]] | None, *, seed: str, loop_index: int
) -> dict[str, Any] | None:
    """Seed-deterministic pick of this loop's modifier, or None.

    None for loop 1, for scenarios without a table, and for malformed entries.
    The stored dict is a compact copy (id/name/desc/effect) so the loop state
    stays independent of later scenario.json edits.
    """
    candidates = [m for m in (modifiers or []) if isinstance(m, dict) and m.get("id")]
    if loop_index <= 1 or not candidates:
        return None
    picked = Dice(f"{seed}:loop-modifier").choice(candidates)
    effect_raw = picked.get("effect")
    return {
        "id": str(picked.get("id")),
        "name": str(picked.get("name") or picked.get("id")),
        "desc": str(picked.get("desc") or ""),
        "effect": dict(effect_raw) if isinstance(effect_raw, dict) else {},
    }


def modifier_effect(state: Any, key: str) -> int:
    """The active modifier's integer effect for ``key`` (0 when absent/invalid)."""
    if not isinstance(state, dict):
        return 0
    modifier = state.get(LOOP_MODIFIER_KEY)
    effect = modifier.get("effect") if isinstance(modifier, dict) else None
    if not isinstance(effect, dict):
        return 0
    try:
        return int(effect.get(key, 0) or 0)
    except (TypeError, ValueError):
        return 0
