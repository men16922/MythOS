"""Companion growth — allies scale with bonds, achievements, and run boons.

Allies used to be fixed scenario.json kits; the only cross-loop companion change
was WHO you could recruit (``unlocked_allies``). This module folds three optional
growth channels into each ally's combat build (all no-ops when absent, so
scenarios without the data — e.g. glass-library — keep exact prior behavior):

1. **Bond tiers** (cross-loop): ``loop.state["relationships"][ally_id]`` affection
   accrues across loops; every ``BOND_TIER_SIZE`` points is a tier (capped) that
   adds flat HP and combat stats — "유대가 전투력".
2. **Achievement kit upgrades** (cross-loop, data-driven): scenario
   ``combat.allies[id].upgrades`` entries unlock on the same meta-progression
   milestone axis as achievement recruitment (``requires`` compares numeric
   ``meta_progression`` fields, e.g. ``total_combats_won >= 6``) and add skills,
   stats, and HP.
3. **Party boons** (this-run): ``target="party"`` boons in the run's build buff
   every ally (``mythos_runtime.boons.party_boon_bonus``).

The result feeds ``build_ally_combatant``'s ``bonus_stats``/``bonus_hp``/
``extra_skills`` channel, so derived defense/speed/focus scale with the bonuses.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from mythos_runtime.boons import party_boon_bonus

BOND_TIER_SIZE = 2  # affection points per bond tier
BOND_TIER_MAX = 3
BOND_HP_PER_TIER = 2
BOND_STATS_PER_TIER: dict[str, int] = {"strength": 1, "perception": 1}


@dataclass(frozen=True)
class GrowthBonus:
    stats: dict[str, int] = field(default_factory=dict)
    hp: int = 0
    skills: list[str] = field(default_factory=list)
    bond_tier: int = 0
    upgrade_ids: list[str] = field(default_factory=list)


def bond_tier(affection: Any) -> int:
    """Affection points → bond tier (0 when unknown/negative)."""
    try:
        points = int(affection)
    except (TypeError, ValueError):
        return 0
    if points <= 0:
        return 0
    return min(BOND_TIER_MAX, points // BOND_TIER_SIZE)


def _meta_value(meta_progression: Any, key: str) -> int:
    if not isinstance(meta_progression, dict):
        return 0
    value = meta_progression.get(key)
    if not isinstance(value, int | float | str):
        return 0
    try:
        return int(value)
    except ValueError:
        return 0


def _upgrade_unlocked(requires: Any, meta_progression: Any) -> bool:
    """Every ``requires`` key must be a numeric meta-progression field at or
    above the threshold (mirrors the achievement-recruitment milestone axis)."""
    if not isinstance(requires, dict) or not requires:
        return False
    for key, threshold in requires.items():
        try:
            needed = int(threshold)
        except (TypeError, ValueError):
            return False
        if _meta_value(meta_progression, str(key)) < needed:
            return False
    return True


def growth_bonus(
    *,
    entry: dict[str, Any],
    affection: Any = None,
    meta_progression: Any = None,
    run_boons: Any = None,
) -> GrowthBonus:
    """Compose one ally's growth channels into a single bonus bundle."""
    stats: dict[str, int] = {}
    hp = 0
    skills: list[str] = []
    upgrade_ids: list[str] = []

    tier = bond_tier(affection)
    if tier:
        hp += BOND_HP_PER_TIER * tier
        for stat, per_tier in BOND_STATS_PER_TIER.items():
            stats[stat] = stats.get(stat, 0) + per_tier * tier

    for upgrade in entry.get("upgrades", []) if isinstance(entry, dict) else []:
        if not isinstance(upgrade, dict):
            continue
        if not _upgrade_unlocked(upgrade.get("requires"), meta_progression):
            continue
        upgrade_ids.append(str(upgrade.get("id", "")))
        hp += max(0, int(upgrade.get("hp", 0) or 0))
        for stat, delta in (upgrade.get("stats") or {}).items():
            if isinstance(delta, int | float):
                stats[stat] = stats.get(stat, 0) + int(delta)
        for skill_id in upgrade.get("skills", []) or []:
            if str(skill_id) not in skills:
                skills.append(str(skill_id))

    boon_stats, boon_hp = party_boon_bonus(run_boons)
    hp += boon_hp
    for stat, delta in boon_stats.items():
        stats[stat] = stats.get(stat, 0) + delta

    return GrowthBonus(
        stats=stats, hp=hp, skills=skills, bond_tier=tier, upgrade_ids=upgrade_ids
    )


def companion_sheet(
    entry: dict[str, Any],
    *,
    affection: Any = None,
    meta_progression: Any = None,
    run_boons: Any = None,
    carried_hp: Any = None,
) -> dict[str, Any]:
    """One ally's CHARACTER-tab display sheet: base kit split from growth.

    Mirrors ``build_ally_combatant``'s numbers but keeps ``stats`` (base) and
    ``stat_bonus`` (growth) separate so the client can render the same
    base-bar + amber-bonus overlay it uses for the player.
    """
    from mythos_combat.factory import DEFAULT_COMBAT_STATS, derive_max_hp

    growth = growth_bonus(
        entry=entry,
        affection=affection,
        meta_progression=meta_progression,
        run_boons=run_boons,
    )
    base_stats = {
        **DEFAULT_COMBAT_STATS,
        **{k: int(v) for k, v in entry.get("stats", {}).items() if isinstance(v, int | float)},
    }
    folded = dict(base_stats)
    for stat, delta in growth.stats.items():
        folded[stat] = folded.get(stat, 0) + delta
    max_hp = int(entry.get("hp", derive_max_hp(folded))) + max(0, growth.hp)
    hp = carried_hp if isinstance(carried_hp, int) else max_hp
    skills = [str(s) for s in entry.get("skills", [])]
    skills += [s for s in growth.skills if s not in skills]
    upgrades = [
        {
            "id": str(u.get("id", "")),
            "name": u.get("name") or u.get("id"),
            "name_en": u.get("name_en") or u.get("name") or u.get("id"),
        }
        for u in entry.get("upgrades", [])
        if isinstance(u, dict) and str(u.get("id", "")) in growth.upgrade_ids
    ]
    try:
        affection_points = int(affection)
    except (TypeError, ValueError):
        affection_points = 0
    return {
        "id": str(entry.get("id", "")),
        "name": entry.get("name") or entry.get("id"),
        "alias": entry.get("alias"),
        "image": entry.get("image"),
        "hp": max(0, min(max_hp, hp)),
        "max_hp": max_hp,
        "stats": base_stats,
        "stat_bonus": growth.stats,
        "skills": skills,
        "bond_tier": growth.bond_tier,
        "affection": affection_points,
        "upgrades": upgrades,
    }


__all__ = [
    "BOND_HP_PER_TIER",
    "BOND_STATS_PER_TIER",
    "BOND_TIER_MAX",
    "BOND_TIER_SIZE",
    "GrowthBonus",
    "bond_tier",
    "companion_sheet",
    "growth_bonus",
]
