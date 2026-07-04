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


def _meta_scaled(
    entry: dict[str, Any], scaling: Any, runs_completed: int
) -> dict[str, Any]:
    """Grow an enemy entry with the player's cross-loop meta progression.

    The player gets stronger every completed run (bond tiers, skill ranks,
    equipment), so an encounter may declare ``meta_scaling`` to keep pace:
    ``hp_per_run`` flat HP per completed run, plus ``stats`` added once every
    ``stat_every_runs`` runs, both capped at ``cap_runs``. ``runs_completed=0``
    (first loop, and every existing test) is a strict no-op."""
    if not isinstance(scaling, dict) or runs_completed <= 0:
        return entry
    n = min(int(runs_completed), int(scaling.get("cap_runs", 6)))
    if n <= 0:
        return entry
    scaled = dict(entry)
    hp_per = int(scaling.get("hp_per_run", 0))
    if hp_per and isinstance(entry.get("hp"), int | float):
        scaled["hp"] = int(entry["hp"]) + hp_per * n
    steps = n // max(1, int(scaling.get("stat_every_runs", 2)))
    stat_inc = scaling.get("stats")
    if steps and isinstance(stat_inc, dict):
        stats = dict(entry.get("stats", {}))
        for key, delta in stat_inc.items():
            if isinstance(delta, int | float):
                stats[key] = int(stats.get(key, 5)) + int(delta) * steps
        scaled["stats"] = stats
    return scaled


def build_encounter(
    combat_pool: dict[str, Any],
    encounter_id: str,
    *,
    player: Combatant,
    allies: list[Combatant] | None = None,
    seed: str,
    engine: CombatEngine | None = None,
    language: str = "ko",
    runs_completed: int = 0,
) -> CombatState:
    engine = engine or CombatEngine()
    encounter = combat_pool.get("encounters", {}).get(encounter_id)
    if encounter is None:
        raise KeyError(f"unknown encounter: {encounter_id!r}")

    weapons_pool = combat_pool.get("weapons", {})
    bestiary = combat_pool.get("bestiary", {})
    arena = encounter.get("arena") or combat_pool.get("arena") or _DEFAULT_ARENA
    width, height = int(arena["width"]), int(arena["height"])

    # Party-size scaling: a fixed roster designed for a full party is unfair for
    # a small one (measured: IX + 2 escorts is ~8% winnable with only Se-rin).
    # An enemy group may declare ``min_party`` — the minimum party size (player +
    # allies) for that group to appear — so escort waves drop out for a small
    # party and the climax stays tense-but-fair. No ``min_party`` = always spawn
    # (backward compatible), so only encounters that opt in are affected.
    party_size = 1 + len(allies or [])

    enemies: list[Combatant] = []
    index = 0
    for group in encounter.get("enemies", []):
        min_party = group.get("min_party")
        if isinstance(min_party, int) and party_size < min_party:
            continue
        entry = bestiary.get(group.get("bestiary"))
        if entry is None:
            continue
        # Per-encounter stat overrides let one bestiary archetype play a
        # different role across encounters (e.g. a fragile "kill-first" sentinel
        # vs a durable decoy drone) without forking the bestiary. Shallow merge.
        overrides = group.get("overrides")
        if isinstance(overrides, dict):
            entry = {**entry, **overrides}
        entry = _meta_scaled(entry, encounter.get("meta_scaling"), runs_completed)
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

    party = [player, *(allies or [])]
    player.x, player.y = 0, height // 2
    ally_slots = [
        (0, max(0, height // 2 - 1)),
        (0, min(height - 1, height // 2 + 1)),
        (1, height // 2),
        (1, max(0, height // 2 - 1)),
        (1, min(height - 1, height // 2 + 1)),
    ]
    occupied = {(player.x, player.y)}
    for ally, (ax, ay) in zip(allies or [], ally_slots, strict=False):
        if (ax, ay) in occupied:
            continue
        ally.x, ally.y = ax, ay
        occupied.add((ax, ay))
    return engine.start(
        party, enemies, seed=seed, arena=(width, height),
        encounter_id=encounter_id, language=language,
    )


__all__ = ["build_encounter", "loadout_for_archetype"]
