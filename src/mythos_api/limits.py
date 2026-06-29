"""Per-player loop cap for the closed beta (cost ceiling, DEPLOY.md §9/§7).

``MYTHOS_MAX_LOOPS_PER_PLAYER`` (int, default 0 = unlimited) caps how many loops a
single player can START — the per-tester variable-cost ceiling (each loop ≈ 30 Gemini
turns + ~5–15 Imagen images). Unset/0 → no cap (local/test/un-capped deploy unchanged).
Resuming an existing loop is never blocked; only NEW begins count.

``MYTHOS_ADMIN_KEYS`` (comma-separated) names owner/admin invite keys that are EXEMPT
from the cap — their derived player_id (same ``stablePlayerId`` cyrb53 the SPA uses,
ported below) skips the limit so the owner can QA without burning a tester slot. Admin
keys must also be in ``MYTHOS_INVITE_KEYS`` to pass the access gate.
"""

from __future__ import annotations

import os
from functools import lru_cache

from mythos_runtime.session import RuntimeSessionService

LOOP_CAP_MESSAGE = "loop limit reached for this beta — thanks for playing!"


def _imul(a: int, b: int) -> int:
    """JS ``Math.imul`` (32-bit) so the hash matches the SPA byte-for-byte."""
    return ((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF)) & 0xFFFFFFFF


def _cyrb53(s: str, seed: int = 0) -> str:
    """Port of the SPA's ``cyrb53`` (``api.ts``); same input → same player id."""
    h1 = (0xDEADBEEF ^ seed) & 0xFFFFFFFF
    h2 = (0x41C6CE57 ^ seed) & 0xFFFFFFFF
    for ch in s:
        c = ord(ch)
        h1 = _imul(h1 ^ c, 2654435761)
        h2 = _imul(h2 ^ c, 1597334677)
    h1 = _imul(h1 ^ (h1 >> 16), 2246822507)
    h1 = (h1 ^ _imul(h2 ^ (h2 >> 13), 3266489909)) & 0xFFFFFFFF
    h2 = _imul(h2 ^ (h2 >> 16), 2246822507)
    h2 = (h2 ^ _imul(h1 ^ (h1 >> 13), 3266489909)) & 0xFFFFFFFF
    n = 4294967296 * (2097151 & h2) + (h1 & 0xFFFFFFFF)
    return format(n, "x").rjust(14, "0")


def stable_player_id(invite_key: str) -> str:
    """Mirror of the SPA's ``stablePlayerId(inviteKey)`` (Option B identity)."""
    return f"player_{_cyrb53(invite_key)}"


@lru_cache(maxsize=1)
def _admin_player_ids_cached(raw: str) -> frozenset[str]:
    keys = {k.strip() for k in raw.split(",") if k.strip()}
    return frozenset(stable_player_id(k) for k in keys)


def admin_player_ids() -> frozenset[str]:
    """player_ids derived from ``MYTHOS_ADMIN_KEYS`` — exempt from the loop cap."""
    return _admin_player_ids_cached(os.getenv("MYTHOS_ADMIN_KEYS", ""))


def max_loops_per_player() -> int:
    try:
        return max(0, int(os.getenv("MYTHOS_MAX_LOOPS_PER_PLAYER", "0")))
    except ValueError:
        return 0


def loop_cap_exceeded(service: RuntimeSessionService, player_id: str) -> bool:
    if player_id in admin_player_ids():
        return False  # owner/admin key — unlimited
    cap = max_loops_per_player()
    if cap <= 0:
        return False
    return len(service.store.list_loops(player_id)) >= cap
