# Held-out bank v2 — proposal (NOT ratified)

Status: **draft for owner decision**, 2026-10-13. The frozen bank v1 (`scripts/overnight/heldout-bank.md`,
ratified 2026-07-27) targets 1.x code that now lives on branch `1.0`, so it can no longer be dispatched
against `main`. Replacing it needs a recorded owner decision (its own protocol: "Composition changes:
owner-approved only"). This file only proposes the replacement; nothing in the runner reads it.

## Selection rules used

- Same shape as v1: one UI extraction, one engine test lock, one server-side test lock — each
  `[auto:claude]`-shaped, deterministic, gate-verifiable, inside the claude lane scope
  (`src/ tests/ harness/ scripts/overnight/ docs/ Makefile`, see `docs/LESSONS.md` 2026-09-06).
- Checked open on 2026-10-13 (grep): none is done in source, none appears in `docs/NEXT_PLAN.md`.
- Small enough to human-audit 100 % of accepted commits.

## Proposed tasks

- [ ] [auto:claude] Extract `useTierAlert` from `src/mythos_ui/src/v2/ui/shell/GameShell.tsx` (Trace-tier
  alarm: `tierAlert` state, the `lastTier` ref, the escalation check that plays `sound('alarm')`, and the
  auto-dismiss timer with its 6000 ms in-combat / 4200 ms otherwise delay) into
  `src/mythos_ui/src/v2/ui/shell/useTierAlert.ts`, behavior-preserving; the banner JSX may stay in
  GameShell. Done: `make check` green and GameShell.tsx no longer declares `lastTier` or the tier timer.
- [ ] [auto:claude] Add `src/mythos_ui/src/v2/engine/intents.test.ts` locking `effectiveIntentDamage` and
  `isRelative`: a no-damage move → 0; base damage unchanged with no statuses; a damage bonus adds;
  `weak` subtracts `WEAK_PENALTY`; the result floors at 0; `isRelative` is true exactly for
  melee/line/beam/charge/nova. Done: `make test-v2` and `make check` green with the new file.
- [ ] [auto:claude] Cover the `RateLimiter` key-eviction path (`src/mythos_v2/ratelimit.py` `_evict`,
  `max_keys`) in `tests/test_v2_gm.py` `RateLimiterTest`: with a fake clock and `max_keys=2`, keys idle past
  both windows are dropped once the table exceeds the cap, while a key still inside its day window keeps
  its spent budget. Done: `make check` green with the new test.

## To adopt (owner)

Say "bank v2 승인" (or amend the list). The agent then replaces the Tasks section of
`scripts/overnight/heldout-bank.md`, adds a swap-log line ("2026-10-xx: owner ratified bank v2 for the
2.0 tree; v1 retired with branch `1.0`"), deletes this proposal, and re-runs the v1 mechanical audit
(open in source, not in NEXT_PLAN, contract compiles).
