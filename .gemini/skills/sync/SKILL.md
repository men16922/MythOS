---
name: sync
description: Restore the current working context (state·next work·recent increments·guardrails) by reading Project MythOS's current docs along the defined read path. Use at session start, when resuming work, or on "지금 상황 파악", "sync", "컨텍스트 동기화".
---

# /sync — Doc-based context restoration

Restore the current working context **with minimal tokens**, following the Context Budget in
`docs/DOCS_POLICY.md` and the Read Path in `docs/README.md`. Don't bulk-read all of `docs/`.

## Procedure

1. **Read the 4 entry points (this order, parallel Read OK):**
   1. `docs/AGENT_BRIEF.md` — 1-minute compressed context, snapshot, active work, guardrails.
   2. `docs/STATUS.md` — current implementation state, verification baseline, active focus, open risks.
   3. `docs/NEXT_PLAN.md` — open work to proceed from now (not completed items).
   4. `docs/PROGRESS_LOG.md` — only the newest 3-5 increment entries (top). Ignore the long past log.

2. **Check working-tree signals:**
   - `git status -sb` and `git log --oneline -8` for current branch/uncommitted changes/recent commits.
   - If uncommitted changes are work-in-progress, cross-check against NEXT_PLAN for the matching task.

3. **Open on-demand docs only when needed (don't auto-open now):**
   - before structural change → `docs/DESIGN.md`
   - before game-rule change → `docs/GAMEPLAY.md`
   - API contract work → `docs/API.md`
   - scenario/content change → `docs/scenarios/*`, `resources/<scenario>/story_bible/*`
   - active-work detail → `docs/plans/YYYY-MM-DD-*.md` (but STATUS/NEXT_PLAN are more authoritative)
   - decision rationale → `docs/DECISIONS.md`, completed scope → `docs/COMPLETED_SUMMARY.md`
   - agent operations harness (loop/multi-agent/context/prompts) → `docs/engineering/README.md` (bible) + `docs/engineering/mythos/` (interpretation)

4. **Output a summary (5-10 lines, English):**
   - **▶ NEXT SESSION (top priority if present)**: echo verbatim the `▶ NEXT SESSION:` line at the top of `AGENT_BRIEF.md`.
     This is the "continue here" pointer the last session left — if it conflicts with Active focus, this pointer wins. Omit if absent.
   - **Current baseline**: what works (from AGENT_BRIEF snapshot).
   - **Active focus**: the 1-2 top-priority tasks now (NEXT_PLAN authoritative).
   - **Recent increments**: top 1-2 from PROGRESS_LOG.
   - **Working tree**: branch + gist of uncommitted changes.
   - **Next-up candidates**: items ready to start immediately.
   - **Open risks/blockers**: relevant items from STATUS's open risks.

## Rules

- Authority order: the `▶ NEXT SESSION` pointer in `AGENT_BRIEF.md` (continue here) > `NEXT_PLAN.md` (next work) > `plans/` (historical snapshot, may be stale).
- The plan pointer must always be an **in-repo path** (`docs/plans/*`). Don't trust `~/.claude/plans/*` scratch paths as the authoritative pointer (repo canon wins).
- If entry docs contradict each other, state that fact in the summary.
- Don't fill gaps by guessing. If it's not in the docs, write "not in docs".
- Don't re-derive structure by reading code — trust what the docs already compressed.
