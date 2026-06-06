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
