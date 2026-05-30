from __future__ import annotations

import json
from hashlib import sha256
from typing import Any


def create_loop_seed(
    player_id: str,
    loop_index: int,
    memory_snapshot: dict[str, Any] | None = None,
    world_id: str = "world-connect",
) -> str:
    payload = {
        "loop_index": loop_index,
        "memory_snapshot": memory_snapshot or {},
        "player_id": player_id,
        "world_id": world_id,
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return sha256(canonical.encode("utf-8")).hexdigest()[:32]
