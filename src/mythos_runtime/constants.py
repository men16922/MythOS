"""Shared runtime constants for the session orchestration layer.

Kept in a tiny dependency-free module so both ``session`` and
``narrative_rollup`` can import them without creating an import cycle.
"""

from __future__ import annotations

# The one world id for world_memories rows (loop_archive / run_summary /
# archive_rollup). progression.py carried its own copy set to "world_mythos"
# since 2026-06-06 while the readers here used "mythos-local", so every archive
# ever written was invisible to initial-loop scoring, the memory overview and
# compaction. "world_mythos" is the value the persisted rows actually hold.
MYTHOS_WORLD_ID = "world_mythos"

# Per-player active `loop_archive` world memories kept verbatim; older ones are
# absorbed into a statistical `archive_rollup`. See
# bin/docs/archive/2026-05-30-memory-summary.md.
ARCHIVE_RETENTION = 20
SHARD_CONTEXT_RETENTION = 12
SHARD_ROLLUP_TRIGGER_TURN = 50
SHARD_ROLLUP_TRIGGER_COUNT = 40
SHARD_ROLLUP_TRIGGER_CHARS = 12_000

# Combat pacing (narrative path). Live play showed combat firing 2x within 4
# turns and an early enforcer one-shotting the player. The narrative path gates
# the next combat through `RuntimeSessionService._gate_next_combat`:
#  - COMBAT_COOLDOWN_SCENES: minimum narrative scenes between combats. High
#    pressure may override it after a win, but never immediately after fleeing.
#  - COMBAT_RISK_CAP_BY_COUNT: max encounter `risk` allowed after N combats won;
#    early fights stay on tutorial-tier (risk 1) and ramp as the player learns.
COMBAT_COOLDOWN_SCENES = 3
COMBAT_COOLDOWN_PRESSURE_TENSION = 80
COMBAT_RISK_CAP_BY_COUNT = (1, 2, 3, 4)

# A normal combat defeat should be a playable setback, not an immediate run
# deletion. Repeated defeat is still tracked in state for future hard-fail tuning.
COMBAT_SOFT_DEFEAT_HEAL_FRAC = 0.45
COMBAT_SOFT_DEFEAT_STABILITY_LOSS = 10
COMBAT_SOFT_DEFEAT_TENSION_GAIN = 15
# After a soft defeat, guarantee a genuine narrative recovery beat: suppress
# ambient (LLM `start_combat` / encounter-map) combat for this many scenes,
# regardless of tension. Prevents the death-spiral where a losing player is
# re-thrown into a fight every turn (soft defeat adds tension -> the cooldown's
# high-pressure bypass would otherwise re-trigger combat immediately, and 0 wins
# keeps the risk cap at the lowest tier so the same downgraded encounter recurs).
# Deliberate route-node combat (patrol/boss) is unaffected.
SOFT_DEFEAT_COMBAT_COOLDOWN_SCENES = 3

# Rest recovery: every *narrative* scene commit (combat rounds excluded) heals
# the player and living party members this many HP toward their max — quiet
# turns between fights read as the party catching its breath. Downed members
# (hp<=0) are NOT healed here; they rejoin the next encounter at quarter HP
# (combat_service._build_allies) or via a revive consumable in combat.
REST_RECOVERY_HP = 2
