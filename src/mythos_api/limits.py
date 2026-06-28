"""Per-player loop cap for the closed beta (cost ceiling, DEPLOY.md §9/§7).

``MYTHOS_MAX_LOOPS_PER_PLAYER`` (int, default 0 = unlimited) caps how many loops a
single player can START — the per-tester variable-cost ceiling (each loop ≈ 30 Gemini
turns + ~5–15 Imagen images). Unset/0 → no cap (local/test/un-capped deploy unchanged).
Resuming an existing loop is never blocked; only NEW begins count.
"""

from __future__ import annotations

import os

from mythos_runtime.session import RuntimeSessionService

LOOP_CAP_MESSAGE = "loop limit reached for this beta — thanks for playing!"


def max_loops_per_player() -> int:
    try:
        return max(0, int(os.getenv("MYTHOS_MAX_LOOPS_PER_PLAYER", "0")))
    except ValueError:
        return 0


def loop_cap_exceeded(service: RuntimeSessionService, player_id: str) -> bool:
    cap = max_loops_per_player()
    if cap <= 0:
        return False
    return len(service.store.list_loops(player_id)) >= cap
