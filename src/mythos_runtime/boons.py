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
        "desc": "타격이 묵직해지고 버틸 힘도 커진다.",
        "desc_en": "Hits land harder, and you can endure more punishment.",
        "stats": {"strength": 3},
    },
    "berserk_mod": {
        "name": "광폭 모듈", "name_en": "Berserk Mod", "tag": "offense",
        "desc": "가까운 거리에서 쉼 없이 압박을 이어 간다.",
        "desc_en": "You keep up relentless pressure at close range.",
        "stats": {"strength": 2, "agility": 1},
    },
    "titan_frame": {
        "name": "타이탄 프레임", "name_en": "Titan Frame", "tag": "offense",
        "desc": "느려지는 대신 압도적인 체력과 파괴력을 얻는다.",
        "desc_en": "You trade speed for overwhelming endurance and force.",
        "stats": {"strength": 4},
    },
    # --- precision (perception → accuracy/crit) ---
    "neural_uplink": {
        "name": "신경 업링크", "name_en": "Neural Uplink", "tag": "precision",
        "desc": "공격이 더 정확해지고 결정적인 빈틈을 더 잘 잡아낸다.",
        "desc_en": "Your attacks become more precise, and you find decisive openings more often.",
        "stats": {"perception": 3},
    },
    "predator_edge": {
        "name": "포식자의 날", "name_en": "Predator's Edge", "tag": "precision",
        "desc": "한 점을 노리는 일점사에 특화된다.",
        "desc_en": "You specialize in focusing fire on a single weak point.",
        "stats": {"perception": 2, "agility": 2},
    },
    "targeting_suite": {
        "name": "조준 스위트", "name_en": "Targeting Suite", "tag": "precision",
        "desc": "표적을 놓치지 않는 사격 감각을 얻는다.",
        "desc_en": "You gain the aim to keep every target in sight.",
        "stats": {"perception": 4},
    },
    # --- tech (intelligence → focus / more skills) ---
    "overclock": {
        "name": "오버클럭", "name_en": "Overclock", "tag": "tech",
        "desc": "집중이 늘어 스킬을 더 자주 쓸 수 있다.",
        "desc_en": "You gain more focus and can use skills more often.",
        "stats": {"intelligence": 3},
    },
    "logic_bomb": {
        "name": "로직 밤", "name_en": "Logic Bomb", "tag": "tech",
        "desc": "상황을 읽고 계산된 한 방을 꽂아 넣는다.",
        "desc_en": "You read the situation and land a calculated strike.",
        "stats": {"intelligence": 2, "perception": 1},
    },
    # --- evasion (agility → defense/speed) ---
    "reflex_overclock": {
        "name": "반사 오버클럭", "name_en": "Reflex Overclock", "tag": "evasion",
        "desc": "몸이 빨라져 피하고 맞히는 흐름이 가벼워진다.",
        "desc_en": "You move faster, making it easier to evade and strike cleanly.",
        "stats": {"agility": 3},
    },
    "phase_coat": {
        "name": "페이즈 코트", "name_en": "Phase Coat", "tag": "evasion",
        "desc": "미끄러지듯 파고들어 빈틈에 타격을 넣는다.",
        "desc_en": "You slip through openings and strike where it hurts.",
        "stats": {"agility": 2, "strength": 1},
    },
    "blur_drive": {
        "name": "블러 드라이브", "name_en": "Blur Drive", "tag": "evasion",
        "desc": "붙잡기 어려운 속도로 전장을 흔든다.",
        "desc_en": "You unsettle the battlefield with speed that is hard to pin down.",
        "stats": {"agility": 4},
    },
    # --- all-round ---
    "combat_protocol": {
        "name": "전투 프로토콜", "name_en": "Combat Protocol", "tag": "allround",
        "desc": "모든 능력이 고르게 올라 전방위로 강해진다.",
        "desc_en": "Your combat ability improves evenly across the board.",
        "stats": {"strength": 1, "agility": 1, "perception": 1},
    },
    # --- bond (target=party: buffs ALLIES, not the player; lowest balance risk
    # since it does nothing when fighting alone) ---
    "squad_sync": {
        "name": "분대 동기화", "name_en": "Squad Sync", "tag": "bond", "target": "party",
        "desc": "동료들이 호흡을 맞춰 더 안정적인 화력을 낸다.",
        "desc_en": "Allies coordinate their timing and deliver steadier fire.",
        "stats": {"strength": 1, "perception": 1},
    },
    "guardian_protocol": {
        "name": "수호 프로토콜", "name_en": "Guardian Protocol", "tag": "bond", "target": "party",
        "desc": "동료들이 더 오래 버티며 쉽게 무너지지 않는다.",
        "desc_en": "Allies hold out longer and are harder to bring down.",
        "stats": {"hp": 4},
    },
    "link_overdrive": {
        "name": "링크 오버드라이브", "name_en": "Link Overdrive", "tag": "bond", "target": "party",
        "desc": "동료들이 더 빠르게 움직이고 스킬을 더 자주 이어 간다.",
        "desc_en": "Allies move faster and keep their skills flowing more often.",
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
