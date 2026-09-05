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

from .log_i18n import clog, leads
from .models import CombatLogEntry, CombatState


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
        "enemy_intents": [
            {
                "enemy_id": intent.enemy_id,
                "action": intent.action,
                "target_x": intent.target_x,
                "target_y": intent.target_y,
                "target_name": intent.target_name,
                # Full telegraph (P0): the announced attack's dice cost ("2d6").
                "damage_hint": getattr(intent, "damage_hint", None),
            }
            for intent in getattr(state, "enemy_intents", [])
        ],
        # E2 boss telegraphs: marked tiles the client must render as danger
        # zones (the strike resolves on the caster's next turn — dodgeable).
        "telegraphs": [
            {"name": t.get("name"), "tiles": t.get("tiles", [])}
            for t in getattr(state, "telegraphs", [])
        ],
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
                # Active buff/debuff state for the D2 status chips (roster cards +
                # board): temporary DEF bonus w/ remaining rounds, boss enrage,
                # and the generic status list (e.g. future "stunned").
                "status": list(c.status),
                "defense_buff": c.defense_buff,
                "defense_buff_turns": c.defense_buff_turns,
                "enraged": c.enraged,
                "portrait": c.portrait,
                "combat_images": dict(c.combat_images),
                "hp_ratio": round(c.hp / c.max_hp, 3) if c.max_hp else 0.0,
                "focus": c.focus,
                "max_focus": c.max_focus,
            }
            for c in state.combatants
        ],
    }


def serialize_combat_log(entries: list[CombatLogEntry]) -> list[dict[str, Any]]:
    """Plain-dict combat log for the web client.

    The React client diffs ``prev.log`` → ``next.log`` to drive per-hit
    cinematics and board animation, so the structured entries (round/actor/
    action/detail) must survive serialization, not just the rendered prose.
    """
    return [
        {
            "round": entry.round,
            "actor": entry.actor,
            "actor_name": entry.actor_name,
            "action": entry.action,
            "text": entry.text,
            "detail": entry.detail,
        }
        for entry in entries
    ]


def narrate_since(state: CombatState, since_index: int) -> str:
    """Render log entries from ``since_index`` onward into prose (state language)."""
    entries = state.log[since_index:]
    return narrate_entries(
        entries, seed=f"{state.seed}:narrate:{since_index}", language=state.language
    )


def narrate_entries(entries: list[CombatLogEntry], *, seed: str = "", language: str = "ko") -> str:
    dice = Dice(seed or "narrate")
    lines: list[str] = []
    move_buffer: list[str] = []

    def flush_moves() -> None:
        if move_buffer:
            names = ", ".join(dict.fromkeys(move_buffer))  # dedupe, keep order
            lines.append(clog(language, "narrate_move", names=names))
            move_buffer.clear()

    for entry in entries:
        if entry.action == "move":
            move_buffer.append(entry.actor_name)
            continue
        flush_moves()
        if entry.action == "start":
            lines.append(
                f"{_pick(dice, leads(language, 'round'))}{clog(language, 'narrate_start')}"
            )
        elif entry.action == "hit":
            lines.append(f"{_pick(dice, leads(language, 'hit'))}{entry.text}")
        elif entry.action == "miss":
            lines.append(f"{_pick(dice, leads(language, 'miss'))}{entry.text}")
        elif entry.action in {"defeat", "defend", "flee", "end", "info", "item"}:
            lines.append(entry.text)
        else:
            lines.append(entry.text)
    flush_moves()
    return "\n".join(lines).strip()


def narrate_outcome(state: CombatState) -> str:
    key = {
        "player_victory": "outcome_victory",
        "player_defeat": "outcome_defeat",
        "player_fled": "outcome_fled",
    }.get(state.outcome or "", "outcome_over")
    return clog(state.language, key)


def _pick(dice: Dice, options: list[str]) -> str:
    return str(dice.choice(options))


__all__ = [
    "render_radar",
    "serialize_combat_log",
    "narrate_since",
    "narrate_entries",
    "narrate_outcome",
]
