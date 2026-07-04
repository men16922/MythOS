---
inclusion: always
---


# /checkpoint — record work into the docs

Record only when a **meaningful unit of work** is done (not every tiny edit).

## Config

Read `.claude/harness-config.json` for doc filenames + line budgets. Defaults:
`brief=docs/AGENT_BRIEF.md`, `status=docs/STATUS.md`, `plan=docs/NEXT_PLAN.md`,
`log=docs/PROGRESS_LOG.md`, `completed=docs/COMPLETED_SUMMARY.md`, `decisions=docs/DECISIONS.md`,
budgets `brief≤60`, `status≤120`, `plan≤120`, `log≤120`.

## Procedure

1. **Collect this session's changes:** `git status -sb`, `git diff --stat`, session commits
   (`git log --oneline`). Summarize Changed / Verified / Blockers / Next. Record only verification
   commands you actually ran — if not run, write "unverified".

2. **Append a newest entry at the top of `<log>`** (`## YYYY-MM-DD — <one-line title>`):
   ```text
   ## YYYY-MM-DD — <title>
   - Status:
   - Changed:
   - Verified:
   - Blockers:
   - Next:
   ```
   Today's date (no relative dates). 5-15 lines, compressed — do not paste diffs.

3. **Update `<status>`** — if baseline / active focus / verification state / open risks changed.
   Drop resolved risks, add new ones. Update the "최종 갱신" date.

4. **Update `<brief>`** — only if the snapshot or active-work priority changed. Keep ≤ budget.

5. **Update `<plan>`** — check off / remove completed tasks; reflect any change in next direction.
   `<plan>` holds only **open** work.
   **★ On plan-only / unfinished exit (continuity):** update the `▶ NEXT SESSION:` line at the top of
   `<brief>` to point at the **in-repo plan path** (`docs/plans/*`) + the first concrete action, so the
   next `/sync` echoes it first.

6. **Conditional:** milestone done → compress purpose/output/verification into `<completed>`.
   Hard-to-reverse choice (provider/infra/data-model/doc-policy/public workflow) → record
   Decision/Reason/Impact in `<decisions>`.

7. **Output a summary** — one line per file updated, and whether to commit.
   Commit/push only when the user explicitly asks.

## Rules

- Keep current docs short — don't copy detailed change history into status/brief; detail goes in `<log>`,
  and overflow goes to archive (delegate to `/tidy-docs`).
- If `<log>` exceeds its budget, record here and suggest the user run `/tidy-docs`.
- Concurrency-safe writes (so parallel agents don't conflict): `<log>` = append newest only;
  `<plan>` = mark only your one item's line; `<status>`/`<brief>` = leave for the periodic pass
  unless the work demands it.
