"""Build combatants from scenario pools (bestiary / weapons) + player stats.

Canonical Neo-Seoul stats (1-10): 근력/연산/공명/반사/관측. Combat mechanics use
strength (body) and agility (reflex); intelligence/charisma/perception drive the
GM's narrative checks (hacking, persuasion, clue-finding), not the tactical grid.
"""

from __future__ import annotations

from typing import Any

from .models import ALLY, ENEMY, PLAYER, Combatant, Weapon

_DEFAULT_STATS = {
    "strength": 5,
    "intelligence": 5,
    "charisma": 5,
    "agility": 5,
    "perception": 5,
}
# Public alias for display layers (e.g. the CHARACTER-tab companion sheet) that
# need the same base-stat merge the combatant builders apply.
DEFAULT_COMBAT_STATS = _DEFAULT_STATS


def derive_max_hp(stats: dict[str, int]) -> int:
    return 10 + int(stats.get("strength", 5))


def derive_defense(stats: dict[str, int], armor: int = 0) -> int:
    return 8 + int(stats.get("agility", 5)) // 2 + armor


def derive_speed(stats: dict[str, int]) -> int:
    return 2 + int(stats.get("agility", 5)) // 3


def derive_max_focus(stats: dict[str, int]) -> int:
    """Skill resource. Driven by 연산(intelligence) so smarter connectors cast more."""
    return 2 + int(stats.get("intelligence", 5)) // 3


def weapon_from_dict(data: dict[str, Any]) -> Weapon:
    applies_raw = data.get("applies")
    applies = (
        {str(k): int(v) for k, v in applies_raw.items()}
        if isinstance(applies_raw, dict)
        else {}
    )
    return Weapon(
        id=str(data.get("id", "weapon")),
        name=str(data.get("name", "무기")),
        kind=str(data.get("kind", "melee")),
        damage=str(data.get("damage", "1d6")),
        reach=int(data.get("reach", 1)),
        range=int(data.get("range", 0)),
        to_hit_bonus=int(data.get("to_hit_bonus", 0)),
        armor_pen=int(data.get("armor_pen", 0)),
        applies=applies,
    )


def _resolve_weapons(
    weapon_ids: list[str], weapons_pool: dict[str, dict[str, Any]]
) -> list[Weapon]:
    weapons = [weapon_from_dict(weapons_pool[wid]) for wid in weapon_ids if wid in weapons_pool]
    if not weapons:
        weapons = [Weapon(id="unarmed", name="맨손", kind="melee", damage="1d4", reach=1)]
    return weapons


def build_player_combatant(
    *,
    combatant_id: str,
    name: str,
    stats: dict[str, int],
    weapon_ids: list[str],
    weapons_pool: dict[str, dict[str, Any]],
    x: int,
    y: int,
    hp: int | None = None,
    skills: list[str] | None = None,
) -> Combatant:
    merged = {
        **_DEFAULT_STATS,
        **{k: int(v) for k, v in stats.items() if isinstance(v, int | float)},
    }
    max_hp = derive_max_hp(merged)
    max_focus = derive_max_focus(merged)
    return Combatant(
        id=combatant_id,
        name=name,
        faction=PLAYER,
        hp=hp if hp is not None else max_hp,
        max_hp=max_hp,
        x=x,
        y=y,
        stats=merged,
        defense=derive_defense(merged),
        speed=derive_speed(merged),
        weapons=_resolve_weapons(weapon_ids, weapons_pool),
        ai="player",
        blip="◎",
        portrait="characters/player-noise.png",
        combat_images={
            "idle": "characters/combat/player-noise-idle.png",
            "attack": "characters/combat/player-noise-attack.png",
            "guard": "characters/combat/player-noise-guard.png",
            "skill": "characters/combat/player-noise-skill.png",
            "hit": "characters/combat/player-noise-hit.png",
        },
        focus=max_focus,
        max_focus=max_focus,
        skills=list(skills or []),
    )


def build_enemy_combatant(
    *,
    entry: dict[str, Any],
    weapons_pool: dict[str, dict[str, Any]],
    x: int,
    y: int,
    instance_suffix: str = "",
) -> Combatant:
    stats = {**_DEFAULT_STATS, **entry.get("stats", {})}
    max_hp = int(entry.get("hp", derive_max_hp(stats)))
    base_id = str(entry.get("id", "enemy"))
    skills = [str(skill_id) for skill_id in entry.get("skills", [])]
    # Skill-using enemies (bosses) need a focus pool; plain enemies stay at 0 (no skills).
    max_focus = int(entry.get("max_focus", derive_max_focus(stats))) if skills else 0
    focus = int(entry.get("focus", max_focus)) if skills else 0
    return Combatant(
        id=f"{base_id}{instance_suffix}",
        name=str(entry.get("name", base_id)),
        faction=ENEMY,
        hp=max_hp,
        max_hp=max_hp,
        x=x,
        y=y,
        stats=stats,
        defense=int(entry.get("defense", derive_defense(stats, int(entry.get("armor", 0))))),
        speed=int(entry.get("speed", derive_speed(stats))),
        armor=int(entry.get("armor", 0)),
        weapons=_resolve_weapons(list(entry.get("weapons", [])), weapons_pool),
        ai=str(entry.get("ai", "melee")),
        blip=str(entry.get("blip", "●")),
        loot_table=entry.get("loot_table"),
        portrait=str(entry.get("image", "")),
        combat_images={str(k): str(v) for k, v in entry.get("combat_images", {}).items()},
        focus=focus,
        max_focus=max_focus,
        skills=skills,
    )


def build_ally_combatant(
    *,
    entry: dict[str, Any],
    weapons_pool: dict[str, dict[str, Any]],
    x: int,
    y: int,
    hp: int | None = None,
    controllable: bool = False,
    bonus_stats: dict[str, int] | None = None,
    bonus_hp: int = 0,
    extra_skills: list[str] | None = None,
) -> Combatant:
    """``bonus_stats``/``bonus_hp``/``extra_skills`` are the companion-growth
    channel (bond tiers, achievement kit upgrades, party-targeted boons). Stat
    bonuses fold in BEFORE derivation so defense/speed/focus scale with them;
    ``bonus_hp`` is explicit because authored kits declare a flat ``hp``.
    """
    stats = {
        **_DEFAULT_STATS,
        **{k: int(v) for k, v in entry.get("stats", {}).items() if isinstance(v, int | float)},
    }
    for key, delta in (bonus_stats or {}).items():
        if isinstance(delta, int | float):
            stats[key] = stats.get(key, 0) + int(delta)
    max_hp = int(entry.get("hp", derive_max_hp(stats))) + max(0, int(bonus_hp))
    # Explicit override mirrors the enemy builder: 한's signature (시스템 침투,
    # ◆4) costs more than his derived pool of 3 — uncastable forever without it
    # (owner call 2026-07-12: raise the pool, keep the premium cost).
    max_focus = int(entry.get("max_focus", derive_max_focus(stats)))
    skills = [str(skill_id) for skill_id in entry.get("skills", [])]
    for skill_id in extra_skills or []:
        if str(skill_id) not in skills:
            skills.append(str(skill_id))
    return Combatant(
        id=str(entry.get("id", "ally")),
        name=str(entry.get("name", entry.get("id", "동료"))),
        faction=ALLY,
        hp=max(0, min(max_hp, hp if hp is not None else max_hp)),
        max_hp=max_hp,
        x=x,
        y=y,
        stats=stats,
        defense=int(entry.get("defense", derive_defense(stats, int(entry.get("armor", 0))))),
        speed=int(entry.get("speed", derive_speed(stats))),
        armor=int(entry.get("armor", 0)),
        weapons=_resolve_weapons(list(entry.get("weapons", [])), weapons_pool),
        ai=str(entry.get("ai", "melee")),
        blip=str(entry.get("blip", "◆")),
        portrait=str(entry.get("image", "")),
        combat_images={str(k): str(v) for k, v in entry.get("combat_images", {}).items()},
        focus=max_focus,
        max_focus=max_focus,
        skills=skills,
        controllable=controllable,
    )


__all__ = [
    "DEFAULT_COMBAT_STATS",
    "build_player_combatant",
    "build_enemy_combatant",
    "build_ally_combatant",
    "weapon_from_dict",
    "derive_max_hp",
    "derive_defense",
    "derive_speed",
    "derive_max_focus",
]
