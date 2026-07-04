"""In-run build boons ("증폭 파편") — a light roguelite build layer with synergy.

A boon is a *this-run-only* power pick. On a growth beat (loop start + each combat
victory) the player is offered a seed-deterministic choice of distinct boons; the
chosen one is appended to ``loop.state["_run_boons"]`` and its stat deltas fold into
the player's combat stats (which derive HP / focus / defense / damage). Boons carry a
**tag**; stacking 2+ of the same tag grants a **synergy** bonus, so builds reward
commitment (an offense build, a tech build, …). Everything resets each loop.

Stat channel: strength->max_hp+melee, agility->defense/speed/evasion, intelligence->
focus (more skills), perception->accuracy/crit (effective damage). Selection is
deterministic (seed + turn), never ``random`` (replay-safe).
"""

from __future__ import annotations

from typing import Any

from mythos_core.dice import Dice

# id -> display + tag + this-run stat deltas. Names/descriptions carry both languages
# so the offer needs no scenario data. ``tag`` drives synergy (see ``boon_stat_bonus``).
BOON_POOL: dict[str, dict[str, Any]] = {
    # --- offense (strength → HP + melee) ---
    "power_core": {
        "name": "파워 코어", "name_en": "Power Core", "tag": "offense",
        "desc": "근력 +3 — 더 무거운 타격과 더 큰 체력.",
        "desc_en": "+3 Strength — heavier hits and more HP.",
        "stats": {"strength": 3},
    },
    "berserk_mod": {
        "name": "광폭 모듈", "name_en": "Berserk Mod", "tag": "offense",
        "desc": "근력 +2, 민첩 +1 — 몰아치는 근접 압박.",
        "desc_en": "+2 Strength, +1 Agility — relentless melee pressure.",
        "stats": {"strength": 2, "agility": 1},
    },
    "titan_frame": {
        "name": "타이탄 프레임", "name_en": "Titan Frame", "tag": "offense",
        "desc": "근력 +4 — 압도적 체력과 파괴력, 느린 몸.",
        "desc_en": "+4 Strength — overwhelming HP and force.",
        "stats": {"strength": 4},
    },
    # --- precision (perception → accuracy/crit) ---
    "neural_uplink": {
        "name": "신경 업링크", "name_en": "Neural Uplink", "tag": "precision",
        "desc": "지각 +3 — 명중과 결정타 확률 상승.",
        "desc_en": "+3 Perception — accuracy and critical chance.",
        "stats": {"perception": 3},
    },
    "predator_edge": {
        "name": "포식자의 날", "name_en": "Predator's Edge", "tag": "precision",
        "desc": "지각 +2, 민첩 +2 — 한 점을 노리는 일점사 특화.",
        "desc_en": "+2 Perception, +2 Agility — a focus-fire specialist.",
        "stats": {"perception": 2, "agility": 2},
    },
    "targeting_suite": {
        "name": "조준 스위트", "name_en": "Targeting Suite", "tag": "precision",
        "desc": "지각 +4 — 빗나가지 않는 사격.",
        "desc_en": "+4 Perception — shots that do not miss.",
        "stats": {"perception": 4},
    },
    # --- tech (intelligence → focus / more skills) ---
    "overclock": {
        "name": "오버클럭", "name_en": "Overclock", "tag": "tech",
        "desc": "연산 +3 — 기술 자원(focus)이 늘어 스킬을 더 자주.",
        "desc_en": "+3 Intelligence — more skill focus, cast more often.",
        "stats": {"intelligence": 3},
    },
    "logic_bomb": {
        "name": "로직 밤", "name_en": "Logic Bomb", "tag": "tech",
        "desc": "연산 +2, 지각 +1 — 계산된 한 방.",
        "desc_en": "+2 Intelligence, +1 Perception — a calculated strike.",
        "stats": {"intelligence": 2, "perception": 1},
    },
    # --- evasion (agility → defense/speed) ---
    "reflex_overclock": {
        "name": "반사 오버클럭", "name_en": "Reflex Overclock", "tag": "evasion",
        "desc": "민첩 +3 — 회피와 명중, 행동 속도 상승.",
        "desc_en": "+3 Agility — evasion, accuracy, and speed.",
        "stats": {"agility": 3},
    },
    "phase_coat": {
        "name": "페이즈 코트", "name_en": "Phase Coat", "tag": "evasion",
        "desc": "민첩 +2, 근력 +1 — 미끄러지듯 파고드는 몸놀림.",
        "desc_en": "+2 Agility, +1 Strength — slip in and strike.",
        "stats": {"agility": 2, "strength": 1},
    },
    "blur_drive": {
        "name": "블러 드라이브", "name_en": "Blur Drive", "tag": "evasion",
        "desc": "민첩 +4 — 붙잡을 수 없는 속도.",
        "desc_en": "+4 Agility — untouchable speed.",
        "stats": {"agility": 4},
    },
    # --- all-round ---
    "combat_protocol": {
        "name": "전투 프로토콜", "name_en": "Combat Protocol", "tag": "allround",
        "desc": "근력·민첩·지각 +1 — 전방위 강화.",
        "desc_en": "+1 to all combat stats — an all-round edge.",
        "stats": {"strength": 1, "agility": 1, "perception": 1},
    },
    # --- bond (target=party: buffs ALLIES, not the player; lowest balance risk
    # since it does nothing when fighting alone) ---
    "squad_sync": {
        "name": "분대 동기화", "name_en": "Squad Sync", "tag": "bond", "target": "party",
        "desc": "동료 전원 근력·지각 +1 — 합을 맞춘 화력.",
        "desc_en": "All allies +1 Strength & Perception — coordinated fire.",
        "stats": {"strength": 1, "perception": 1},
    },
    "guardian_protocol": {
        "name": "수호 프로토콜", "name_en": "Guardian Protocol", "tag": "bond", "target": "party",
        "desc": "동료 전원 최대 HP +4 — 쓰러지지 않는 대열.",
        "desc_en": "All allies +4 max HP — a line that holds.",
        "stats": {"hp": 4},
    },
    "link_overdrive": {
        "name": "링크 오버드라이브", "name_en": "Link Overdrive", "tag": "bond", "target": "party",
        "desc": "동료 전원 민첩·연산 +1 — 더 빠르게, 더 자주 스킬을.",
        "desc_en": "All allies +1 Agility & Intelligence — faster, more skills.",
        "stats": {"agility": 1, "intelligence": 1},
    },
}

# tag -> the stat its synergy pours into (2+ boons of a tag → +SYNERGY_BONUS there).
_TAG_STAT = {
    "offense": "strength",
    "precision": "perception",
    "tech": "intelligence",
    "evasion": "agility",
}
SYNERGY_THRESHOLD = 2
SYNERGY_BONUS = 2

RUN_BOONS_KEY = "_run_boons"
BOON_OFFER_KEY = "_boon_offer"
_OFFER_SIZE = 3


def offer_boons(
    *, seed: str, turn_index: int, taken: list[str] | None = None, size: int = _OFFER_SIZE
) -> list[str]:
    """Deterministically pick ``size`` distinct boon ids not already taken.

    Repeats are allowed only once every distinct boon is taken (so late offers still
    stack). Returns fewer than ``size`` only when the pool is exhausted entirely.
    """
    taken = list(taken or [])
    fresh = [bid for bid in BOON_POOL if bid not in taken]
    pool = fresh if len(fresh) >= size else list(BOON_POOL)
    if not pool:
        return []
    return Dice(f"{seed}:boon-offer:{turn_index}").shuffle(pool)[:size]


def boon_stat_bonus(run_boons: Any) -> dict[str, int]:
    """Sum the run's PLAYER boon stat deltas, plus per-tag synergy for stacked tags.

    ``target="party"`` boons buff allies instead (``party_boon_bonus``) and are
    excluded here — from the deltas and from synergy tag counts alike.
    """
    bonus: dict[str, int] = {}
    if not isinstance(run_boons, list):
        return bonus
    tag_counts: dict[str, int] = {}
    for boon_id in run_boons:
        entry = BOON_POOL.get(str(boon_id))
        if not entry or entry.get("target") == "party":
            continue
        tag_counts[str(entry.get("tag", ""))] = tag_counts.get(str(entry.get("tag", "")), 0) + 1
        for stat, delta in entry.get("stats", {}).items():
            if isinstance(delta, int | float):
                bonus[stat] = bonus.get(stat, 0) + int(delta)
    # Synergy: committing to a tag (2+) pours a bonus into that tag's stat, and each
    # further pick of the tag adds another increment (rewards a focused build).
    for tag, count in tag_counts.items():
        stat = _TAG_STAT.get(tag)
        if stat and count >= SYNERGY_THRESHOLD:
            bonus[stat] = bonus.get(stat, 0) + SYNERGY_BONUS * (count - SYNERGY_THRESHOLD + 1)
    return bonus


def party_boon_bonus(run_boons: Any) -> tuple[dict[str, int], int]:
    """Sum ``target="party"`` boon deltas for allies: ``(stat_bonus, bonus_hp)``.

    The special ``"hp"`` stat key is returned as flat bonus HP (ally kits declare
    an explicit ``hp``, so a strength delta would not raise it). No synergy —
    the ``bond`` tag deliberately has no ``_TAG_STAT`` entry.
    """
    stats: dict[str, int] = {}
    bonus_hp = 0
    if not isinstance(run_boons, list):
        return stats, bonus_hp
    for boon_id in run_boons:
        entry = BOON_POOL.get(str(boon_id))
        if not entry or entry.get("target") != "party":
            continue
        for stat, delta in entry.get("stats", {}).items():
            if not isinstance(delta, int | float):
                continue
            if stat == "hp":
                bonus_hp += int(delta)
            else:
                stats[stat] = stats.get(stat, 0) + int(delta)
    return stats, bonus_hp


def boon_card(boon_id: str, language: str = "ko") -> dict[str, Any]:
    """A client-facing card (id/name/desc/tag/stats) for one boon."""
    entry = BOON_POOL.get(boon_id, {})
    en = language == "en"
    return {
        "id": boon_id,
        "name": entry.get("name_en" if en else "name", boon_id),
        "desc": entry.get("desc_en" if en else "desc", ""),
        "tag": entry.get("tag", ""),
        "stats": dict(entry.get("stats", {})),
    }


__all__ = [
    "BOON_OFFER_KEY",
    "BOON_POOL",
    "RUN_BOONS_KEY",
    "SYNERGY_BONUS",
    "SYNERGY_THRESHOLD",
    "boon_card",
    "boon_stat_bonus",
    "offer_boons",
    "party_boon_bonus",
]
