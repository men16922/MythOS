"""Bridge scenario combat pools -> a live CombatState.

Reads the predefined pool (``scenario.combat``: weapons / bestiary / encounters)
and spawns the player on the left edge with enemies on the right, then hands off
to ``CombatEngine.start``. Keeps the first scenario fully data-driven.
"""

from __future__ import annotations

from typing import Any

from .engine import CombatEngine
from .factory import build_enemy_combatant
from .models import Combatant, CombatState

_DEFAULT_ARENA = {"width": 8, "height": 6}


def loadout_for_archetype(combat_pool: dict[str, Any], archetype_name: str | None) -> list[str]:
    loadout = combat_pool.get("archetype_loadout", {})
    weapons = loadout.get(archetype_name or "", [])
    return list(weapons) if weapons else ["unarmed"]


def build_encounter(
    combat_pool: dict[str, Any],
    encounter_id: str,
    *,
    player: Combatant,
    seed: str,
    engine: CombatEngine | None = None,
) -> CombatState:
    engine = engine or CombatEngine()
    encounter = combat_pool.get("encounters", {}).get(encounter_id)
    if encounter is None:
        raise KeyError(f"unknown encounter: {encounter_id!r}")

    weapons_pool = combat_pool.get("weapons", {})
    bestiary = combat_pool.get("bestiary", {})
    arena = encounter.get("arena") or combat_pool.get("arena") or _DEFAULT_ARENA
    width, height = int(arena["width"]), int(arena["height"])

    enemies: list[Combatant] = []
    index = 0
    for group in encounter.get("enemies", []):
        entry = bestiary.get(group.get("bestiary"))
        if entry is None:
            continue
        for _ in range(int(group.get("count", 1))):
            ex = max(0, width - 1 - (index // height))
            ey = index % height
            enemies.append(
                build_enemy_combatant(
                    entry=entry,
                    weapons_pool=weapons_pool,
                    x=ex,
                    y=ey,
                    instance_suffix=f"_{index + 1}",
                )
            )
            index += 1

    player.x, player.y = 0, height // 2
    return engine.start(
        [player], enemies, seed=seed, arena=(width, height), encounter_id=encounter_id
    )


__all__ = ["build_encounter", "loadout_for_archetype"]
