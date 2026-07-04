---
inclusion: always
---


# /overnight-seed — pre-loop seed judgment & backfill

Before turning on the unattended loop (`scripts/overnight/run.sh`), **judge how much `[auto]` seed
exists for the night and fill the shortfall**. Morning review is `/overnight-report`.

## Config

Read `.claude/harness-config.json` for `gate`/`smoke` and the plan doc. Defaults: `plan=docs/NEXT_PLAN.md`,
`gate=make check`, `smoke=make smoke-local`.

> **Correct the framing every time (tell the user):** this loop is not a "run for N hours" device.
> One iteration = one `[auto]` = one commit, on the order of a few minutes each (gate + pause). When the
> backlog drains it **stops** (`MAX_NO_PROGRESS`→`DONE`) rather than spinning to fill time. So **seed
> supply, not wall-clock, is the binding constraint** — to fill a window you need that many seeds.

## Procedure

1. **Confirm window:** the run→review span (e.g. midnight~06:00 ≈ 6h). Single-engine (claude) is the
   default here.

2. **Count current backlog:** in the plan doc, count actionable `[auto]` items (non-`[blocked]`,
   non-`[manual]`). State whether it's drained (0). For newly `[blocked]` items, note the prerequisite
   (it returns as a seed candidate once unblocked).

3. **Live-survey candidates** (never hardcode — re-collect each run so it can't go stale). Survey, for
   **this repo's** structure:
   - **Invariant/regression tests** → data/properties not yet guarded (dangling refs / set equality /
     numeric bounds / enum closure / schema integrity). Read your existing test patterns and your
     data/config to find unguarded properties → `[auto]` (add a test).
   - **lint/type debt · deprecated APIs · codemods**: `rg 'type: ignore|TODO|FIXME|XXX|HACK'`,
     `xfail`/`skip`, deprecated framework calls, mechanical refactors with a deterministic gate → `[auto]`.
   - **Doc compression** (line-budget overflow / completed checklists): plan/completed/dated-plan docs → `[auto]`.
   - Each candidate = {**one-line done-criterion**, verification gate (`$GATE_CMD` / `$SMOKE`)}.

4. **Estimate volume:** assume a few minutes per iteration. `N items × per-iter`. Compare to the window
   and state in one line: **"~X min of work now · ~Y short of the <window> target"**. Always note:
   ① draining = it stops (won't fill time — that's normal), ② raise `MAX_ITER` (default 20) **above the
   seed count**.

5. **Propose + record on approval:**
   - Present candidates as a table (done-criterion · gate · effect/priority).
   - Append **only what the user picks** to the plan doc's overnight-seed section, one line each:
     `- [ ] [auto] <description>. Done: <one line>.`
   - Don't touch unapproved candidates, untagged lines, or other sections.

6. **Output run commands:** `MAX_ITER=<seeds+slack> make overnight` (observe `make overnight-logs`,
   stop `make overnight-stop`). Morning review: `/overnight-report`.

## Rules

- Candidates must be **deterministic·offline** (`$GATE_CMD`/`$SMOKE`). feel / content authoring /
  balance / prompt tuning are `[manual]`, never `[auto]` (unverifiable-unattended is the biggest risk).
- **Never auto-promote untagged → `[auto]`.** Record only user-approved items.
- The menu is **not hardcoded** — live-survey each run (candidates change as code/data change).
- Estimate from measured per-iteration time, no optimism. Always state **drain = normal stop**.
- This skill only records seeds into the plan doc — no code/doc edits or commits (the loop implements).
- No guessing. If it's not in the backlog/source, write "none".
