---
name: overnight-seed
description: Before arming an unattended overnight loop, judge how much [auto] seed exists to run and backfill it. Per-lane actionable-backlog tally + live survey of candidate menu + wall-clock estimate + shortfall notice, and on approval record into NEXT_PLAN. Use on "overnight seed", "밤샘 준비", "seed 판단", "백로그 충전".
---

# /overnight-seed — Pre-arm seed judgment & backfill for the unattended loop

Before arming the overnight unattended loop (`scripts/overnight/run.sh`, `docs/engineering/mythos/LOOP.md`),
**judge how much `[auto]` seed exists to run overnight and fill the shortfall**. Morning review is `/overnight-report`'s job.

> **Reality to correct first (tell the user every time):** this loop is not a "run N hours continuously" thing.
> One iteration = one `[auto]` = one commit, **measured ~3.5 min/iteration** (`make check`, including 30s pause). When backlog
> drains, it does not spin to fill time — it **stops** (`MAX_NO_PROGRESS`→`DONE`). So to fill a target duration you need
> that much seed — the binding constraint is **seed supply, not time**.

## Procedure

1. **Confirm target window·lanes:**
   - Take the run~review window (e.g. midnight~06:00 ≈ 6h) and lanes as args, or ask the user.
   - Lanes: **claude solo** (recent operation) vs **3-lane parallel** (claude+codex+agy, worktree isolation for ~3x throughput).

2. **Tally current backlog:**
   - In `docs/NEXT_PLAN.md`, count per-lane actionable items — `[auto]`/`[auto:claude|codex|agy]` that are
     **non-`[blocked]`·non-`[manual]`**. State whether drained (0).
   - For newly `[blocked]` items, note the **precondition** (revives as a seed candidate when cleared).

3. **Live-survey the candidate menu** (no hardcoding — re-gather each run to prevent staleness). Sweep by source:
   - **Existing invariant test patterns** → data properties not yet enforced (dangling ref / set equality / numeric bounds /
     enum closure). Read `tests/test_content_integrity.py`·`test_route_integrity.py`·`test_progression.py`·
     `test_encounter_balance.py` and find unguaranteed properties in `resources/<scenario>/{scenario.json,story_bible/}` (loot_table↔items,
     npc_agenda targets, arena coordinate bounds, item.kind enum, route node-type↔pool, bible entry flags/related_npcs/unlocks etc.).
     → `[auto:claude]` (new test) / `[auto:codex]` (data validation).
   - **lint/type debt·deprecated API·codemod**: `rg 'type: ignore|TODO|FIXME|XXX|HACK'`, `xfail`/`skip`,
     FastAPI `on_event` (`src/mythos_api/app.py`), dotenv `type:ignore` centralization, `_map` removal (if precondition met). → `[auto:claude]`.
   - **doc compression** (`docs/DOCS_POLICY.md` line-budget overruns·completed checklists): `NEXT_PLAN.md`/`COMPLETED_SUMMARY.md`/
     `docs/plans/*`. → `[auto:codex]`.
   - **agy image backlog**: `outputs/agy/*/VERDICT.md` (rejections), `NEXT_PLAN.md` agy items. → `[auto:agy]`.
   - Each candidate = {lane, **one-line completion criterion**, verification gate (`make check` / `make smoke-local` / image integrity)}.

4. **Estimate volume:**
   - Assume **~3.5 min/iteration** (`make check`; ~2 min if `make check-auto`). Single lane = `N × 3.5 min`,
     3-lane parallel ≈ `max(per-lane time)`.
   - Compare to the target window and state in one line: **"currently ~X min worth · ~Y short of target <window>"**.
   - **Must notice**: ① draining stops the loop (won't fill time — normal), ② raise `MAX_ITER` (default 20) **above the seed count**.

5. **Output proposal + record on approval:**
   - Present per-lane candidates as a table (lane · completion criterion · gate · impact/priority).
   - Append **only what the user picks** to the `## Overnight QA Seed` section of `NEXT_PLAN.md`, one line each:
     `- [ ] [auto:<lane>] <description>. Completion criterion: <one line>.`
   - **Don't touch** unapproved candidates · untagged lines · other lanes' lines.

6. **Output the arming command:**
   - Single: `MAX_ITER=<seed count+slack> make overnight` (observe `make overnight-logs`, stop `make overnight-stop`).
   - Parallel: `make overnight-worktrees` → in each worktree `make overnight` / `make overnight-codex` / `make overnight-agy`.
   - Morning review: `/overnight-report`.

## Rules

- Candidates must be **deterministic·offline**, verifiable via `make check`/`make smoke-local` only. feel·content authoring·
  balance·prompt tuning go to `[manual]` and are barred from `[auto]` (un-verifiable unattended is the biggest risk).
- **No arbitrary promotion of untagged → `[auto]`.** Record only user-approved items.
- Don't hardcode the menu — live-survey each run (candidates change as code/data change).
- Base estimates on measured iteration time (~3.5 min), no optimism. Always notice that **drain = normal exit (target unmet)**.
- This skill **must not edit code/docs or commit beyond the NEXT_PLAN seed record** (the overnight loop does the actual implementation).
- No guessing. If it's not in the backlog/source, write "none".
