"""Echo inscription ("각인") — carried memories become a themed run modifier.

At loop start the player may *inscribe* one of the Echoes carried from prior loops
(``loop.active_echoes``). Each Echo maps deterministically to one of a small set of
**themed effects** (a flavored name + a combat stat profile), so "carry an Echo into
the next loop" is felt mechanically and reads as a specific memory shaping this run —
e.g. reading IX's optimization pattern sharpens accuracy/crit. Stats fold through
``_player_combat_stats`` (strength->HP, agility->evasion/speed, intelligence->focus,
perception->accuracy/crit) so no engine change is needed. Everything resets each
loop; permanent progression stays in ``MetaProgression``.
"""

from __future__ import annotations

from typing import Any

from mythos_core.dice import Dice

ECHO_OFFER_KEY = "_echo_offer"
INSCRIBED_ECHOES_KEY = "_inscribed_echoes"
INSCRIBE_CAP = 1

# Themed effects a carried Echo can crystallize into. Chosen deterministically per
# echo id so the same memory always yields the same power. Stat profiles route to
# derived attributes: strength->max_hp+melee, agility->defense/speed, intelligence->
# focus (more skills), perception->accuracy/crit (effective damage).
_ECHO_EFFECTS: tuple[dict[str, Any], ...] = (
    {
        "key": "ix_read",
        "name": "IX 패턴 간파",
        "name_en": "Reading IX",
        "desc": "최적화의 리듬이 기억에 새겨진다 — 명중과 결정타가 날카로워진다.",
        "desc_en": "IX's optimization rhythm is etched in — sharper accuracy and crits.",
        "stats": {"perception": 3},
    },
    {
        "key": "scarred_resolve",
        "name": "각인된 각오",
        "name_en": "Scarred Resolve",
        "desc": "지난 루프의 상처가 몸을 단단하게 한다 — 체력과 타격이 오른다.",
        "desc_en": "Last loop's wounds harden you — more HP and heavier hits.",
        "stats": {"strength": 3},
    },
    {
        "key": "cold_calc",
        "name": "차가운 연산",
        "name_en": "Cold Calculus",
        "desc": "반복이 사고를 최적화한다 — 기술 자원(focus)이 늘어난다.",
        "desc_en": "Repetition optimizes your mind — more skill focus.",
        "stats": {"intelligence": 3},
    },
    {
        "key": "ghost_step",
        "name": "유령 보행",
        "name_en": "Ghost Step",
        "desc": "죽음의 궤적을 외운 몸이 더 빠르고 미끄럽게 움직인다 — 회피·속도 상승.",
        "desc_en": "A body that memorized its deaths moves faster — evasion and speed.",
        "stats": {"agility": 3},
    },
    {
        "key": "tempered_signal",
        "name": "단련된 신호",
        "name_en": "Tempered Signal",
        "desc": "균형 잡힌 각성 — 근력과 관측이 함께 오른다.",
        "desc_en": "A balanced awakening — strength and perception both rise.",
        "stats": {"strength": 2, "perception": 1},
    },
)


def echo_effect(echo_id: str) -> dict[str, Any]:
    """The themed effect a given Echo crystallizes into (stable per echo id)."""
    return dict(Dice(f"{echo_id}:echo-effect").choice(list(_ECHO_EFFECTS)))


def echo_run_modifier(echo_id: str) -> dict[str, int]:
    """This-run stat bonus from an Echo's themed effect."""
    stats = echo_effect(echo_id).get("stats", {})
    return {str(k): int(v) for k, v in stats.items() if isinstance(v, int | float)}


def echo_stat_bonus(inscribed: Any) -> dict[str, int]:
    """Sum the stat bonuses of the run's inscribed echoes."""
    bonus: dict[str, int] = {}
    if not isinstance(inscribed, list):
        return bonus
    for echo_id in inscribed:
        for stat, delta in echo_run_modifier(str(echo_id)).items():
            bonus[stat] = bonus.get(stat, 0) + delta
    return bonus


def echo_offer_ids(active_echoes: Any, *, size: int = 3) -> list[str]:
    """The (up to ``size``) most recent carried echo ids eligible to inscribe."""
    ids: list[str] = []
    for echo in list(active_echoes or [])[:size]:
        echo_id = getattr(echo, "echo_id", None) or (
            echo.get("echo_id") if isinstance(echo, dict) else None
        )
        if echo_id:
            ids.append(str(echo_id))
    return ids


def echo_card(
    echo_id: str, *, symbol: str = "", text: str = "", language: str = "ko"
) -> dict[str, Any]:
    """Client-facing inscription card: the memory + the themed effect it grants."""
    effect = echo_effect(echo_id)
    en = language == "en"
    return {
        "id": echo_id,
        "symbol": symbol,
        "text": text,
        "effect": effect.get("name_en" if en else "name", ""),
        "desc": effect.get("desc_en" if en else "desc", ""),
        "stats": echo_run_modifier(echo_id),
    }


__all__ = [
    "ECHO_OFFER_KEY",
    "INSCRIBED_ECHOES_KEY",
    "INSCRIBE_CAP",
    "echo_card",
    "echo_effect",
    "echo_offer_ids",
    "echo_run_modifier",
    "echo_stat_bonus",
]
