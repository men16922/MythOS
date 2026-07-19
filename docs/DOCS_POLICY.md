# Documentation Policy

Last updated: 2026-06-14

This doc is the operating rule for keeping Project MythOS docs current. The goal is to read current state fast while not losing dated plans and completion history. A separate compressed entry point is kept for agents to reduce token use.

## Language

Agent-facing operational docs (`CLAUDE.md`, `harness/*`, `docs/engineering/**`, the `$overnight-harness:sync` entry docs, repo-skill bodies, and WorkContract policy) are authored in English; user-facing and narrative content (scenarios, `story_bible`, directives, `docs/test` live-QA) stays Korean.

## Core Principle

Docs fall into three kinds.

1. **Current docs**: what you must read now.
2. **Dated records**: plan/progress/verification records for a specific date.
3. **Archive/retired docs**: past docs no longer updated directly.

## Context Budget

Even with many docs, an agent's starting context must stay small. The default read budget follows this order:

1. `AGENT_BRIEF.md`
2. `STATUS.md`
3. `NEXT_PLAN.md`
4. the newest top entry of `PROGRESS_LOG.md` when needed

Rules:

- Do not auto bulk-read all of `docs/`.
- Treat `plans/`, `bin/docs/archive/`, and `feedback/` as on-demand docs.
- Open `DESIGN.md`, `GAMEPLAY.md`, and scenario docs only when actually changing the related code/content.
- `AGENT_BRIEF.md` ≤ 60 lines; `STATUS.md` and `NEXT_PLAN.md` ≤ 120 lines each. These budgets are ENFORCED by a `make check` gate (`harness/check-doc-budget.sh`), not merely a target.
- Keep `DESIGN.md` a compressed architecture summary. Preserve long-form design source in `bin/docs/archive/`.
- When `PROGRESS_LOG.md` exceeds 120 lines, keep only the newest 3-5 entries and split the rest into `bin/docs/archive/progress-YYYY-MM.md`.
- When a completed task checklist lingers in current docs, compress it into `COMPLETED_SUMMARY.md` and keep only a link in the current docs.

## Current Docs

Always kept up to date.

- `STATUS.md`: current implementation state, verification baseline, active focus, open risks.
- `AGENT_BRIEF.md`: the compressed context an agent reads first — current focus, read order.
- `NEXT_PLAN.md`: open work from now on, not completed items.
- `README.md`: run/usage guidance and the main docs index.
- `docs/README.md`: full docs navigation.

Rules:

- Update `AGENT_BRIEF.md` and `STATUS.md` when a work bundle finishes.
- Update `NEXT_PLAN.md` when the next direction changes.
- Keep README link-only, not long detailed plans.

## Dated Plans

Each task may produce a new plan, so keep dated plan snapshots.

Location:

- `docs/plans/YYYY-MM-DD-<topic>.md`

Examples:

- `docs/plans/2026-05-30-post-mvp.md`
- `docs/plans/2026-06-01-streamlit-polish.md`

Rules:

- Before a large task, record the plan at that point as a dated plan.
- Keep `NEXT_PLAN.md` as the latest rolling plan.
- Do not delete a completed dated plan; check off its completion or summarize it in `COMPLETED_SUMMARY.md`.
- When a plan changes substantially, make a new dated plan rather than overwriting the old one.
- **Keep plans inside the repo (`docs/plans/`) only.** Do not record the scratch files that plan-mode creates under `~/.claude/plans/*` (random names, machine-local, outside the repo) as authoritative pointers in `NEXT_PLAN.md`/`AGENT_BRIEF.md` — the next session / another agent cannot find them. If needed, copy that content into `docs/plans/YYYY-MM-DD-<topic>.md` and point at that path.
- **Session continuity (Resume Pointer):** when a session ends plan-only/incomplete and the next session must continue, update the single `▶ NEXT SESSION:` line at the top of `AGENT_BRIEF.md` (in-repo plan path + first action), and promote that work to the authoritative active focus (AGENT_BRIEF/STATUS/NEXT_PLAN aligned). `$overnight-harness:sync` echoes this pointer first.

## Incremental Progress

Append the newest entry on top of `PROGRESS_LOG.md`. Keep the current log short and move long detailed history to a monthly archive.

Entry format:

```text
YYYY-MM-DD
- Status:
- Changed:
- Verified:
- Blockers:
- Next:
```

Rules:

- Do not log every tiny edit.
- Log when a user-meaningful unit of work finishes.
- Record verification commands or browser checks under `Verified`.
- When `PROGRESS_LOG.md` grows, split it into a monthly archive and keep only the archive link and newest entries in the current log.
- Do not copy detailed change history into current docs. Current docs hold only the "compressed state needed to judge now."

Monthly archive examples:

- `bin/docs/archive/progress-2026-05.md`
- `bin/docs/archive/progress-2026-06.md`

## Completed Summary

Summarize completed milestones briefly in `COMPLETED_SUMMARY.md`.

Rules:

- Compress detailed checklists into a summary once there's no need to keep them after completion.
- Keep only the purpose, deliverables, and verification of the completed milestone.
- Keep it so a new worker can understand the completed scope within 5 minutes.

## Decisions

Record hard-to-reverse choices in `DECISIONS.md`.

What to record:

- provider choices
- infra changes
- data-model changes
- doc operating policy
- public workflow changes

Record format:

- Decision
- Reason
- Impact

## Retiring Or Deleting Docs

Do not delete a no-longer-needed doc outright.

Procedure:

1. Summarize the doc's core content into the right place among `COMPLETED_SUMMARY.md`, `DECISIONS.md`, `DESIGN.md`, or `STATUS.md`.
2. Mark the doc's status as `Retired` or `Archive` in `docs/README.md`.
3. Check for leftover links with `rg "<doc name>"`.
4. Move it to `bin/docs/archive/` if it has preservation value.
5. Delete it if it is a duplicate, the summary is done, and nothing references it.

Deletion criteria:

- The same content is summarized in another current doc.
- It will not be updated directly going forward.
- It is not referenced by code or README.
- Maintenance cost exceeds the value of preserving the source.

Preservation criteria:

- It retains design rationale.
- Its decision context is important.
- It is useful as detailed record of a past milestone.

## Recommended Update Sequence

Starting work:

1. Check `AGENT_BRIEF.md`.
2. Check `STATUS.md`.
3. Check `NEXT_PLAN.md`.
4. Write `docs/plans/YYYY-MM-DD-<topic>.md` if needed.

Finishing work:

1. Add a short incremental log to `PROGRESS_LOG.md`.
2. Update `AGENT_BRIEF.md` and `STATUS.md`.
3. Update `COMPLETED_SUMMARY.md` on milestone completion.
4. Update `DECISIONS.md` if a decision was made.
5. When old plans/docs become duplicates, summarize and judge whether to archive in bin/docs/ or delete.
