"""Server-side replay check of a daily-seed result (the client records its committed actions; see
``src/mythos_ui/src/v2/ui/replay``).

The check runs the game's own TypeScript engine, bundled with the content into ``replay_verify.mjs``
(``make replay-verifier``), under Node: one JSON request on stdin, one verdict on stdout. Returns True (the replay
reaches the claimed result), False (it does not), or None when there is nothing to check or no way to check it —
no replay, no ``node`` on PATH, ``MYTHOS_REPLAY_VERIFY=off``, a timeout. None never blocks a submit.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import threading
from pathlib import Path
from typing import Any

from mythos_v2.log import get_logger

_logger = get_logger(__name__)

VERIFIER = Path(__file__).resolve().parent / "replay_verify.mjs"
#: A recorded daily is a few hundred KB at most; anything bigger is not checked.
MAX_REPLAY_BYTES = 1_500_000
TIMEOUT_S = 10.0
#: Replays are CPU work: at most this many at once per instance (others go unchecked, never queued).
_SLOTS = threading.BoundedSemaphore(2)


def _node() -> str | None:
    if (os.getenv("MYTHOS_REPLAY_VERIFY") or "on").strip().lower() == "off":
        return None
    if not VERIFIER.exists():
        return None
    return shutil.which(os.getenv("MYTHOS_NODE") or "node")


def available() -> bool:
    return _node() is not None


def verify(replay: dict[str, Any] | None, result: dict[str, Any], day: str) -> bool | None:
    """Replay ``replay`` for ``day`` and compare with the claimed ``result`` (DailyResult dict)."""
    if not replay:
        return None
    node = _node()
    if node is None:
        return None
    payload = json.dumps({"log": replay, "result": result, "date": day}, separators=(",", ":"))
    if len(payload) > MAX_REPLAY_BYTES:
        return None
    if not _SLOTS.acquire(blocking=False):
        _logger.info("v2 daily replay skipped: busy", extra={"outcome": "busy"})
        return None
    try:
        proc = subprocess.run(
            [node, str(VERIFIER)],
            input=payload,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_S,
            check=False,
        )
        verdict = json.loads(proc.stdout or "{}")
    except subprocess.TimeoutExpired:
        _logger.warning("v2 daily replay timed out", extra={"outcome": "timeout"})
        return None
    except (OSError, ValueError) as exc:
        _logger.warning(
            "v2 daily replay failed: %s", type(exc).__name__, extra={"outcome": "error"}
        )
        return None
    finally:
        _SLOTS.release()
    ok = verdict.get("verified") is True
    if not ok:
        _logger.info(
            "v2 daily replay mismatch", extra={"outcome": str(verdict.get("error", "?"))[:120]}
        )
    return ok
