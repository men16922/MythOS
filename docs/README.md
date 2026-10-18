# Mythos 2.0 Docs

Last updated: 2026-10-18

Current docs only; 1.x history (design, CBT ops, cloud, scenarios, reports) lives on branch `1.0`.
Agents do not read all of `docs/`; follow the order below.

## Read Path

1. `AGENT_BRIEF.md` — 1-minute compressed context.
2. `STATUS.md` — current baseline, active focus, risks.
3. `NEXT_PLAN.md` — rolling plan with open work only.
4. `PROGRESS_LOG.md` — latest increments (newest on top).
5. Only when needed: `GAMEPLAY.md` (rules), `plans/2026-10-10-mythos-2.0.md` (design/build contract), `android.md`, `online.md`, `play-store.md`.

## Current Docs

| File | Role |
| --- | --- |
| `AGENT_BRIEF.md` | Agent entry point |
| `STATUS.md` | Current state and verification baseline |
| `NEXT_PLAN.md` | Open work |
| `PROGRESS_LOG.md` | Latest short work log |
| `GAMEPLAY.md` | Game rules (Korean) |
| `android.md` | Android app (Capacitor + Firebase) build/release |
| `online.md` | Google sign-in, daily leaderboard, daily push, account deletion, AI line reports, policy pages |
| `play-store.md` | Google Play submission sheet: listing text, graphics, content rating, Data safety, owner steps |
| `contest/pitch-en.md` | Judge-facing English write-up (what it is, where the AI is and is not, evidence) |
| `OWNER_TODO.md` | Owner-only checklist (Korean): Play account, Signal+ product, listen/watch reviews, voice pins, push |
| `COMPLETED_SUMMARY.md` | Compressed record of completed milestones |
| `DECISIONS.md` | Hard-to-reverse decisions |
| `LESSONS.md` | Repo-specific traps for future (unattended) iterations |
| `DOCS_POLICY.md` | Doc operating rules |
| `REFERENCES.md` | Design-reference games |

## On-Demand Docs

- `engineering/`: the agent-operations harness concepts (HARNESS/LOOP/AGENTIC/CONTEXT/PROMPT/VERIFICATION) and this repo's interpretation (`engineering/mythos/`).
- `plans/`: dated design snapshots of active work (may be stale — prefer `NEXT_PLAN.md`).
- `test/`: checklists the owner runs by hand (`mythos2_first_play.md`).
- `../bin/docs/archive/`: retired long-form docs from the 2.0 era (pre-2.0 material is on branch `1.0`).

## Update Rules

- Keep only decisions/state currently needed in current docs; compress finished work into `COMPLETED_SUMMARY.md`.
- Keep `PROGRESS_LOG.md` to the newest entries; move older ones to `bin/docs/archive/progress-YYYY-MM.md`.
- Entry-doc budgets are enforced by `make check-doc-budget`.

## Status Tags

- `[ ]` Not started · `[/]` In progress · `[x]` Done · `[!]` Blocked · `[~]` Deferred · `[manual]` needs the owner · `[auto:<engine>]` unattended-loop seed
