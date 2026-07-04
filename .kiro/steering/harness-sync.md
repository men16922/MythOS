---
inclusion: always
---


# /sync — doc-based context restore

Read the entry-point docs in order and reconstruct current context with **minimal tokens**.
Do NOT bulk-read all of `docs/`.

## Config

First, read `.claude/harness-config.json` for doc filenames, gate command, and budgets.
If absent, use these defaults:
`brief=docs/AGENT_BRIEF.md`, `status=docs/STATUS.md`, `plan=docs/NEXT_PLAN.md`,
`log=docs/PROGRESS_LOG.md`, `gate=make check`. (Referred to below as `<brief>`/`<status>`/`<plan>`/`<log>`.)

## Procedure

1. **Read the 4 entry points (this order, parallel Read OK):**
   1. `<brief>` — 1-minute compressed context, snapshot, active work, guardrails.
   2. `<status>` — current implementation state, verification baseline, active focus, open risks.
   3. `<plan>` — open work to do now (not completed items).
   4. `<log>` — only the newest 3-5 increments (top). Ignore long history.

2. **Check work-tree signals:** `git status -sb` and `git log --oneline -8` for branch / uncommitted
   changes / recent commits. If uncommitted changes are in-progress work, cross-check against `<plan>`.

3. **On-demand docs only when needed** (do not auto-open now): design/architecture before structural
   change, the engineering bibles (`docs/engineering/`) for harness/loop/context work, dated plans
   (`docs/plans/*`) for active-work detail.

4. **Output a 5-10 line summary:**
   - **▶ NEXT SESSION (if present)**: echo the `▶ NEXT SESSION:` line at the top of `<brief>` verbatim —
     it's the "continue here" pointer from last session. If it conflicts with Active focus, this wins.
   - **Current baseline**: what works (from `<brief>` snapshot).
   - **Active focus**: the top 1-2 tasks (`<plan>` is authoritative).
   - **Recent increment**: top 1-2 from `<log>`.
   - **Work tree**: branch + uncommitted-change gist.
   - **Next candidates**: items ready to start.
   - **Open risks/blockers**: relevant items from `<status>`.

## Rules

- Authority order: `<brief>`'s `▶ NEXT SESSION` pointer > `<plan>` > `docs/plans/*` (may be stale).
- Plan pointers must be **in-repo paths** (`docs/plans/*`), never `~/.claude/plans/*` scratch paths.
- If entry-point docs contradict each other, say so in the summary.
- Don't re-derive structure by reading code — trust what the docs already compress.
