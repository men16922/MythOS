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
    return Weapon(
        id=str(data.get("id", "weapon")),
        name=str(data.get("name", "무기")),
        kind=str(data.get("kind", "melee")),
        damage=str(data.get("damage", "1d6")),
        reach=int(data.get("reach", 1)),
        range=int(data.get("range", 0)),
        to_hit_bonus=int(data.get("to_hit_bonus", 0)),
        armor_pen=int(data.get("armor_pen", 0)),
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
    )


def build_ally_combatant(
    *,
    entry: dict[str, Any],
    weapons_pool: dict[str, dict[str, Any]],
    x: int,
    y: int,
    hp: int | None = None,
) -> Combatant:
    stats = {
        **_DEFAULT_STATS,
        **{k: int(v) for k, v in entry.get("stats", {}).items() if isinstance(v, int | float)},
    }
    max_hp = int(entry.get("hp", derive_max_hp(stats)))
    max_focus = derive_max_focus(stats)
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
        focus=max_focus,
        max_focus=max_focus,
        skills=[str(skill_id) for skill_id in entry.get("skills", [])],
    )


__all__ = [
    "build_player_combatant",
    "build_enemy_combatant",
    "build_ally_combatant",
    "weapon_from_dict",
    "derive_max_hp",
    "derive_defense",
    "derive_speed",
    "derive_max_focus",
]
