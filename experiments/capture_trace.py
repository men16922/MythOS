"""Capture a workload trace by driving N turns of an existing MythOS loop.

Always picks the first offered choice, so the walk is one fixed path rather than
a play distribution — say so in any report that uses the trace. Purpose is
workload capture, not play.

    export MYTHOS_PROMPT_TRACE=/tmp/mythos-trace
    .venv/bin/python -m mythos_runtime.connect_cli new-player X --player-id p1
    .venv/bin/python -m mythos_runtime.connect_cli connect --player-id p1
    .venv/bin/python -m experiments.capture_trace <loop_id> 8

Requires the local infra (``make infra-up && make db-migrate``) and a reachable
provider. Costs real generation time; never run it from an unattended loop.
"""

from __future__ import annotations

import os
import sys
import time

os.environ.setdefault("MYTHOS_LOG_LEVEL", "ERROR")

from mythos_memory import PostgresMythOSStore  # noqa: E402
from mythos_runtime.options import RuntimeOptions  # noqa: E402
from mythos_runtime.session import RuntimeSessionService  # noqa: E402

loop_id = sys.argv[1]
turns = int(sys.argv[2]) if len(sys.argv) > 2 else 6

svc = RuntimeSessionService(PostgresMythOSStore())
# No image generation: it would add minutes per turn and is not part of the
# narrative workload being characterised.
opts = RuntimeOptions(with_image=False)

snap = svc.resume(loop_id, options=opts)
for n in range(turns):
    choices = list(snap.scene.choices or [])
    if not choices:
        print(f"turn {n}: no choices (phase={snap.loop.phase}); stopping", flush=True)
        break
    pick = choices[0]
    start = time.perf_counter()
    try:
        snap = svc.choose(loop_id, choice_id=pick.choice_id, options=opts)
    except Exception as exc:  # noqa: BLE001 - a failed turn is data, keep going
        print(f"turn {n}: FAILED {type(exc).__name__}: {exc}", flush=True)
        break
    took = time.perf_counter() - start
    print(
        f"turn {n}: phase={snap.loop.phase} scene='{(snap.scene.title or '')[:40]}' "
        f"narration={len(snap.scene.narration or '')}ch choices={len(snap.scene.choices or [])} "
        f"{took:.1f}s",
        flush=True,
    )
    if str(snap.loop.phase) in {"LoopPhase.ENDED", "ended", "LoopPhase.ARCHIVE", "archive"}:
        print("loop ended", flush=True)
        break
print("done", flush=True)
