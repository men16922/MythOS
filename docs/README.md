# Project MythOS Docs

Last updated: 2026-07-17

This directory separates current docs from archive to keep the working context small.
Agents do not read all of `docs/`; follow only the order below.

## Read Path

1. `AGENT_BRIEF.md` — 1-minute compressed context.
2. `STATUS.md` — current baseline, active focus, risks.
3. `NEXT_PLAN.md` — rolling plan with open work only.
4. `PROGRESS_LOG.md` — latest incremental summary; long logs go to archive.
5. Only when needed: `DESIGN.md`, `GAMEPLAY.md`, scenario/story bible, dated plans.

## Current Docs

| File | Role |
| --- | --- |
| `AGENT_BRIEF.md` | Agent entry point |
| `STATUS.md` | Current state and verification baseline |
| `NEXT_PLAN.md` | Next implementation priorities |
| `PROGRESS_LOG.md` | Latest short work log |
| `DESIGN.md` | Compressed summary of current architecture |
| `GAMEPLAY.md` | Gameplay/TRPG design |
| `API.md` | FastAPI REST/WS contract |
| `COMPLETED_SUMMARY.md` | Compressed record of completed milestones |
| `DECISIONS.md` | Hard-to-reverse decisions |
| `DOCS_POLICY.md` | Doc operating rules |
| `IMAGE_POLICY.md` | Image-generation rules · local pipeline |
| `PROMPT_LAYER.md` | Narrative prompt architecture (code↔prompt layer split, directives/*.md) |
| `NARRATIVE_ARCHITECTURE.md` | End-to-end narrative/storybook/bible composition (data→assembly→LLM→parse→route/memory→persistence) |
| `REFERENCES.md` | Design-reference games and application points |

## On-Demand Docs

- `docs/engineering/`: **the 5 agent-operations harness concepts** (HARNESS/LOOP/AGENTIC/CONTEXT/PROMPT). Start from `docs/engineering/README.md` for unattended-loop · multi-agent · context · prompt work. (`LOOP_ENGINEERING.md` · `AGENTIC_ENGINEERING.md` moved from the old `docs/LOOP_ENGINEERING.md` · `docs/MULTI_AGENT.md`.)
- `docs/test/`: **checklists humans run by hand** (not default agent context — the user opens them).
  - `neo_seoul_live_qa.md`: Neo-Seoul human play-QA checklist.
  - `bible/overnight-review-checklist.md`: the human review-checklist **bible (static template)** after an overnight loop ends.
  - `history/<MMDD-HHMM>-overnight-review-checklist.md`: the **per-run instance** `/overnight-report` generates each run (fills bible B~E with that run's facts). gitignore — a regenerable artifact.
- `docs/plans/`: dated design snapshots of active work (e.g. variant-routed-opening, cbt-feedback3-clarity, the WS4/WS5 engineering plans). Completed/retired plans move to `bin/docs/plans/`. May be stale, so prefer `NEXT_PLAN.md`.
- `docs/scenarios/`: scenario design docs. Read only when changing content.
- `bin/docs/archive/`: store for long-form design/logs/past planning. Not in default context.
- `bin/docs/feedback/`: past feedback source.

## Update Rules

- Keep only decisions/state currently needed in current docs.
- Compress completed checklists into `COMPLETED_SUMMARY.md`.
- Keep only the newest 3-5 entries in `PROGRESS_LOG.md` and move the rest to a monthly archive.
- `DESIGN.md` is a summary of current structure, not a detailed design spec. Long-form source stays in archive.
- `plans/` files are historical snapshots and may be stale. Confirm with `STATUS.md` and `NEXT_PLAN.md` before implementing.

## Status Tags

- `[ ]` Not started
- `[/]` In progress
- `[x]` Done
- `[!]` Blocked
- `[~]` Deferred
