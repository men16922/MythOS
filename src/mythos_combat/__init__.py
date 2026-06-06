"""Turn-based, position/distance tactical combat for MythOS.

Engine-authoritative: all randomness flows through a seeded ``Dice`` so runs
replay deterministically. Combat state lives inside ``loop.state["_combat"]``
as JSON (no DB migration), serialized via the shared ``to_json_dict`` helpers.
"""

from __future__ import annotations

from .encounter import build_encounter, loadout_for_archetype
from .engine import CombatEngine, PlayerAction
from .factory import (
    build_ally_combatant,
    build_enemy_combatant,
    build_player_combatant,
    weapon_from_dict,
)
from .models import (
    Combatant,
    CombatLogEntry,
    CombatState,
    Weapon,
    combat_state_from_dict,
    combat_state_to_dict,
)
from .narrator import (
    narrate_entries,
    narrate_outcome,
    narrate_since,
    render_radar,
    serialize_combat_log,
)

__all__ = [
    "CombatEngine",
    "PlayerAction",
    "Combatant",
    "CombatLogEntry",
    "CombatState",
    "Weapon",
    "combat_state_from_dict",
    "combat_state_to_dict",
    "build_enemy_combatant",
    "build_ally_combatant",
    "build_player_combatant",
    "weapon_from_dict",
    "build_encounter",
    "loadout_for_archetype",
    "render_radar",
    "serialize_combat_log",
    "narrate_since",
    "narrate_entries",
    "narrate_outcome",
]
