"""Shared runtime constants for the session orchestration layer.

Kept in a tiny dependency-free module so both ``session`` and
``narrative_rollup`` can import them without creating an import cycle.
"""

from __future__ import annotations

MYTHOS_WORLD_ID = "mythos-local"

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
#  - COMBAT_COOLDOWN_SCENES: minimum narrative scenes between combats unless
#    pressure is high (overridden by COMBAT_COOLDOWN_PRESSURE_TENSION).
#  - COMBAT_RISK_CAP_BY_COUNT: max encounter `risk` allowed after N combats won;
#    early fights stay on tutorial-tier (risk 1) and ramp as the player learns.
COMBAT_COOLDOWN_SCENES = 3
COMBAT_COOLDOWN_PRESSURE_TENSION = 80
COMBAT_RISK_CAP_BY_COUNT = (1, 2, 3, 4)
