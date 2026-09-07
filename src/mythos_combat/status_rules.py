"""Per-status rule table — the one place a persistent status's caps and
magnitudes live (owner calls 2026-07-12 accumulation / 2026-07-14 split caps /
2026-08-15 intensity stacks — docs/plans/2026-09-06-status-effect-stacking.md).

A leaf module on purpose: ``models.py`` reads it for the intensity seams and
``engine.py`` for apply/tick, so neither has to import the other. Adding a
status means adding one ``StatusRule`` row here; a status with no scaling
fields is a binary gate that stays at one stack.
"""

from __future__ import annotations

from dataclasses import dataclass

# Utility statuses (corrode/acid/freeze/shock/hacked) accumulate turns to 6;
# hard crowd-control — burn's armor-bypass DoT and stun's lost turns — caps at
# 3 (owner call 2026-07-14, bin/docs/plans/2026-07-14-combat-balance-tuning.md).
STATUS_EFFECT_TURNS_CAP = 6
HARD_CC_TURNS_CAP = 3
# Boss stack resistance (2026-09-07, DECISIONS): a boss holds at most this many
# stacks of any status. Same intent as the 07-14 stun guard — a hard-won ×2
# still matters, but IX cannot be burned down by ticks alone (synthetic ×3
# lifted the solo win rate 0.30→0.82 with a third of the kills on a DoT tick,
# docs/reference/2026-09-06-status-stacking-balance.md).
BOSS_STACK_CAP = 2


@dataclass(frozen=True)
class StatusRule:
    turns_cap: int = STATUS_EFFECT_TURNS_CAP
    # Intensity cap (owner "option 2"): >1 only for statuses with a numeric
    # magnitude. Stacks never decay on their own — they clear with the status.
    stack_cap: int = 1
    dot_dice: str | None = None  # rolled × stacks at the victim's turn start
    armor_per_stack: int = 0  # subtracted from armor while active
    defense_per_stack: int = 0  # subtracted from defense while active


STATUS_RULES: dict[str, StatusRule] = {
    "burn": StatusRule(turns_cap=HARD_CC_TURNS_CAP, stack_cap=3, dot_dice="1d4"),
    "corrode": StatusRule(stack_cap=2, armor_per_stack=2),
    "acid": StatusRule(stack_cap=2, defense_per_stack=2),
    "freeze": StatusRule(),  # no movement (can still act)
    "shock": StatusRule(),  # focus regen + cooldown tick frozen
    "hacked": StatusRule(),  # next turn spent attacking its own side; consumed at act time
}

STATUS_EFFECT_IDS: tuple[str, ...] = tuple(STATUS_RULES)
# Derived views kept for the engine's apply path and the existing tests.
STATUS_EFFECT_TURNS_CAPS: dict[str, int] = {
    sid: rule.turns_cap
    for sid, rule in STATUS_RULES.items()
    if rule.turns_cap != STATUS_EFFECT_TURNS_CAP
}
STATUS_STACK_CAPS: dict[str, int] = {
    sid: rule.stack_cap for sid, rule in STATUS_RULES.items() if rule.stack_cap > 1
}


def rule_for(status_id: str) -> StatusRule:
    """Rule for ``status_id``; an unknown id behaves as a single-stack utility status."""
    return STATUS_RULES.get(status_id, StatusRule())


def turns_cap(status_id: str) -> int:
    return rule_for(status_id).turns_cap


def stack_cap(status_id: str, *, boss: bool = False) -> int:
    cap = rule_for(status_id).stack_cap
    return min(cap, BOSS_STACK_CAP) if boss else cap
