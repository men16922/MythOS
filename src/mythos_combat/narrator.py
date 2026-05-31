"""Engine log -> dynamic Korean prose + radar snapshot (fallback path).

Combat mechanics are decided by the engine; this module only *presents* them:
- ``render_radar`` builds a structured snapshot the terminal radar UI consumes.
- ``narrate_since`` stitches the structured CombatLog into flowing prose so the
  text feels alive each round even without the LLM. The LLM narrator (Phase B4)
  can later replace/augment ``narrate_since`` using the same log.

Everything here is pure and deterministic given the combat seed.
"""

from __future__ import annotations

from typing import Any

from mythos_core.dice import Dice

from .models import CombatLogEntry, CombatState

_HIT_LEAD = ["", "그 순간, ", "곧바로 ", "틈을 놓치지 않고 "]
_MISS_LEAD = ["", "하지만 ", "아쉽게도 ", "간발의 차로 "]
_ROUND_LEAD = ["", "공기가 팽팽해진다. ", "신호가 요동친다. ", "정적이 깨지고 "]


def render_radar(state: CombatState) -> dict[str, Any]:
    """Structured tactical snapshot for the terminal radar UI."""
    current_id = state.order[state.turn_ptr] if 0 <= state.turn_ptr < len(state.order) else None
    return {
        "round": state.round,
        "active": state.active,
        "outcome": state.outcome,
        "encounter_id": state.encounter_id,
        "arena": {"w": state.arena_w, "h": state.arena_h},
        "turn_order": list(state.order),
        "current": current_id,
        "blips": [
            {
                "id": c.id,
                "name": c.name,
                "faction": c.faction,
                "glyph": c.blip,
                "x": c.x,
                "y": c.y,
                "hp": c.hp,
                "max_hp": c.max_hp,
                "alive": c.alive,
                "defending": c.defending,
                "portrait": c.portrait,
                "hp_ratio": round(c.hp / c.max_hp, 3) if c.max_hp else 0.0,
                "focus": c.focus,
                "max_focus": c.max_focus,
            }
            for c in state.combatants
        ],
    }


def narrate_since(state: CombatState, since_index: int) -> str:
    """Render log entries from ``since_index`` onward into Korean prose."""
    entries = state.log[since_index:]
    return narrate_entries(entries, seed=f"{state.seed}:narrate:{since_index}")


def narrate_entries(entries: list[CombatLogEntry], *, seed: str = "") -> str:
    dice = Dice(seed or "narrate")
    lines: list[str] = []
    move_buffer: list[str] = []

    def flush_moves() -> None:
        if move_buffer:
            names = ", ".join(dict.fromkeys(move_buffer))  # dedupe, keep order
            lines.append(f"{names}이(가) 자리를 옮긴다.")
            move_buffer.clear()

    for entry in entries:
        if entry.action == "move":
            move_buffer.append(entry.actor_name)
            continue
        flush_moves()
        if entry.action == "start":
            lines.append(f"{_pick(dice, _ROUND_LEAD)}전투가 시작된다.")
        elif entry.action == "hit":
            lines.append(f"{_pick(dice, _HIT_LEAD)}{entry.text}")
        elif entry.action == "miss":
            lines.append(f"{_pick(dice, _MISS_LEAD)}{entry.text}")
        elif entry.action in {"defeat", "defend", "flee", "end", "info", "item"}:
            lines.append(entry.text)
        else:
            lines.append(entry.text)
    flush_moves()
    return "\n".join(lines).strip()


def narrate_outcome(state: CombatState) -> str:
    return {
        "player_victory": "교전이 끝났다. 당신은 살아남았다.",
        "player_defeat": "시야가 흐려진다. 신호가 끊긴다…",
        "player_fled": "당신은 어둠 속으로 몸을 던져 전장을 빠져나간다.",
    }.get(state.outcome or "", "전투가 종료되었다.")


def _pick(dice: Dice, options: list[str]) -> str:
    return str(dice.choice(options))


__all__ = ["render_radar", "narrate_since", "narrate_entries", "narrate_outcome"]
