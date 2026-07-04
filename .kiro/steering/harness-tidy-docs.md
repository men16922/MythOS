---
inclusion: always
---


# /tidy-docs — context budget optimization

Keep the agent's start context small while not losing dated records or decision history.

## Config

Read `.claude/harness-config.json` for doc filenames, budgets, and `archive_dir`. Defaults:
`brief=docs/AGENT_BRIEF.md`, `status=docs/STATUS.md`, `plan=docs/NEXT_PLAN.md`,
`log=docs/PROGRESS_LOG.md`, `completed=docs/COMPLETED_SUMMARY.md`, `decisions=docs/DECISIONS.md`,
`archive_dir=docs/archive`, budgets `brief≤60`, `status/plan/log≤120`.

## Safety first

- **Deletion is the last resort.** Move to archive or summarize + link before deleting.
- Before overwriting/deleting a doc you didn't create, open it and confirm it matches its description.
- Before destructive moves, **present a plan of what moves where** and get approval; verify references
  after moving.

## Procedure

1. **Diagnose:** `wc -l <brief> <status> <plan> <log>` vs budgets. List which docs exceed and what's
   duplicate/stale. Report to the user.

2. **Split `<log>`** when over budget: keep the newest 3-5 entries; **move (append)** the rest to
   `<archive_dir>/progress-YYYY-MM.md` (merge into an existing month file). Ensure `<log>` has the
   archive-link note at top.

3. **Compress completed checklists:** if completed task checklists linger in current docs, compress
   purpose/output/verification into `<completed>` and leave only a link.

4. **Dated plans:** don't delete completed `docs/plans/*` — confirm the gist is in `<completed>`, then
   move to an archive dir and update any index.

5. **Consolidate/retire duplicate/stale docs:** if the same content lives in two current docs, keep one
   authority and link the other. Retire: summarize the gist into the right home → mark archive in any
   index → `rg "<doc name>"` to confirm no live references → move valuable ones to archive → delete only
   if duplicated + summarized + unreferenced.

6. **Reference integrity:** after moves, `rg -l "<moved file>"` for broken refs; reconcile any index
   with actual files; update "최종 갱신" dates.

7. **Output** a table of moved/compressed/retired files, before→after line counts, remaining overflow.

## Rules

- Preserve: design rationale, decision context, past milestone detail.
- Current docs hold only the compressed state needed for current judgment; detail goes to archive links.
- This skill only tidies. New work goes in `/checkpoint`; context restore is `/sync`.
- `docs/engineering/` is on-demand (not a line-budget target) — don't break bible↔interpretation links.
