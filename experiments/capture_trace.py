"""Capture a workload trace by driving N turns of an existing MythOS loop.

Always picks the first offered choice, so the walk is one fixed path rather than
a play distribution — say so in any report that uses the trace. Purpose is
workload capture, not play.

Combat nodes are auto-played (attack the nearest enemy, stepping closer when a
reachable tile shortens the distance; ``defend`` when nothing is targetable), a
pending boon offer takes its first card, and a finished fight resumes the
narrative with a fixed post-combat action — otherwise a route walk stalls at the
first patrol node (the 2026-08-30 arm stopped at 9 calls). Combat rounds make no
narrative call, so they do not appear in the trace; only narrative turns count
toward ``turns``.

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

from mythos_combat.engine import CombatEngine, PlayerAction, distance  # noqa: E402
from mythos_memory import PostgresMythOSStore  # noqa: E402
from mythos_runtime.combat_service import CombatService  # noqa: E402
from mythos_runtime.options import RuntimeOptions, RuntimeSnapshot  # noqa: E402
from mythos_runtime.session import RuntimeSessionService  # noqa: E402

# Fed to the Director as the player's move after a fight (mirrors the SPA's
# post-combat resume); Korean because the trace scenario runs in Korean.
POST_COMBAT_ACTION = "전투를 마치고 숨을 고른 뒤 주변을 살핀다."
MAX_COMBAT_ROUNDS = 120


def _auto_combat_action(loop) -> PlayerAction:  # noqa: ANN001 - LoopState
    state = CombatService.load_state(loop)
    if state is None:
        return PlayerAction(type="defend")
    actor = state.active_actor()
    enemies = state.living_enemies()
    if actor is None or not enemies:
        return PlayerAction(type="defend")
    target = min(enemies, key=lambda e: distance(actor.x, actor.y, e.x, e.y))
    actions = CombatEngine().available_actions(state)
    if not actions.get("can_act", True):
        return PlayerAction(type="defend")
    best, best_d = None, distance(actor.x, actor.y, target.x, target.y)
    for tx, ty in actions.get("reachable", []):
        d = distance(tx, ty, target.x, target.y)
        if d < best_d:
            best_d, best = d, (tx, ty)
    return PlayerAction(type="attack", target_id=target.id, move_to=best)


def _play_out_combat(svc: RuntimeSessionService, loop_id: str, snap: RuntimeSnapshot, opts: RuntimeOptions) -> RuntimeSnapshot:
    rounds = 0
    while snap.combat and not snap.combat.get("finished") and rounds < MAX_COMBAT_ROUNDS:
        rounds += 1
        snap = svc.combat_action(loop_id, _auto_combat_action(snap.loop), options=opts)
    outcome = (snap.combat or {}).get("outcome")
    print(f"  combat: {rounds} rounds -> {outcome}", flush=True)
    return snap

loop_id = sys.argv[1]
turns = int(sys.argv[2]) if len(sys.argv) > 2 else 6

svc = RuntimeSessionService(PostgresMythOSStore())
# No image generation: it would add minutes per turn and is not part of the
# narrative workload being characterised.
opts = RuntimeOptions(with_image=False)

snap = svc.resume(loop_id, options=opts)
for n in range(turns):
    if snap.combat and not snap.combat.get("finished"):
        snap = _play_out_combat(svc, loop_id, snap, opts)
    offer = (snap.boons or {}).get("offer") if isinstance(snap.boons, dict) else None
    if isinstance(offer, list) and offer:
        first = offer[0]
        boon_id = first.get("id") if isinstance(first, dict) else str(first)
        if boon_id:
            svc.choose_boon(loop_id, str(boon_id), options=opts)
            print(f"  boon: {boon_id}", flush=True)
            # The boon snapshot carries no combat view; re-read so a just-finished
            # fight is still visible to the post-combat branch below.
            snap = svc.resume(loop_id, options=opts)
    choices = list(snap.scene.choices or [])
    start = time.perf_counter()
    try:
        if choices:
            snap = svc.choose(loop_id, choice_id=choices[0].choice_id, options=opts)
        elif snap.combat and snap.combat.get("finished"):
            snap = svc.choose(loop_id, action=POST_COMBAT_ACTION, options=opts)
        else:
            print(f"turn {n}: no choices (phase={snap.loop.phase}); stopping", flush=True)
            break
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
