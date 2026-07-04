# Overnight Iteration Prompt (Project MythOS)

You are one iteration of an unattended overnight loop. Execute the steps below **in order**.
One iteration = **1** `[auto]` task + **1 local commit** if the gate passes. Stopping at any point loses at most one iteration.

## 0. Role / Invariants (non-negotiable)

- **Forbidden actions**: `git push`, external network (`curl`/`wget`), Docker/Ollama/FLUX calls,
  destructive/online `make` targets (`infra-*`, `db-*`, `smoke`, `test-db`, `test-e2e*`,
  `narrative-smoke` (non-fallback), `visual-smoke-minio-db`, `dev-*`, `streamlit`, `api`, `connect-demo`).
- **Forbidden task classes** (can't be verified unattended → never start):
  human-play feel QA (all of `docs/test/neo_seoul_live_qa.md`), content/Story-Bible authoring,
  balance tuning, LLM prompt-feel tuning.
- Follow `harness/CORE_MANDATES.md` §4-5 (diagnose before fix = `/diagnose`, docs-first, confirm structural moves, verify before claiming done).
- Run the gate via env var `$GATE_CMD` (default `make check`; faster variants `make check-auto`/`make smoke-local`) verbatim.

## 1. Restore state

Call Skill `sync` (Read Path: AGENT_BRIEF → STATUS → NEXT_PLAN → newest few PROGRESS_LOG entries).
No other `docs/` bulk-read.
For symbol/structure search, use the LSP tool if available (def/refs/hover/symbols); otherwise use grep.

## 2. Residual recovery

Inspect `git status --porcelain`.

- **clean** → go to step 3.
- **dirty** = residue from an interrupted prior iteration. **This iteration's work is "recovery"** (no new task mixed in):
  - `$GATE_CMD` green → commit immediately with a `[recovered]`-prefixed message and end this iteration.
  - `$GATE_CMD` red → **do not touch it.** Isolate which phase broke (run `make python-lint`/`typecheck`/`frontend-build`/`test` individually) and record **phase + evidence** in the Blocker (`/checkpoint`; no opaque "failure"), then create `scripts/overnight/STOP` (1-line reason) and end. (Needs human review — graceful stop.)

## 3. Task selection

From `docs/NEXT_PLAN.md`, pick **only the top unfinished item in the claude lane (`[auto]` or `[auto:claude]`)**.

- Skip `[auto:codex]`/`[auto:agy]` (other engines' lanes), `[manual]`/`[blocked]`, and **untagged**. Do not promote untagged items (scope defense).
- If a Blocker accumulates twice on the same item, append `[blocked]` to it and move to the next `[auto]` candidate.
- If no `[auto]` remains or all are blocked, create `scripts/overnight/DONE` (reason: `drained` vs `all-blocked`) and end.

## 4. Implement + gate

Change code+tests only per the item's **1-line completion criterion** (no scope expansion).

- Run `$GATE_CMD` (default `make check` = ruff + eslint + mypy + tsc/vite-build + unittest) until **fully green**.
- Gate failure → first **isolate which phase broke**: run `make python-lint`/`make typecheck`/`make frontend-build`/`make test` individually to pin the failing phase, and use `/diagnose` step 1 (reproduce + evidence) to record the root cause **in the Blocker as phase + evidence** (no opaque "failure"). Then revert via `git restore`/`git checkout -- <path>` (unattended iterations are conservative — don't fix unless it's an obvious in-scope change; revert instead).
  Second failure on the same item → mark `[blocked]` and move to the next candidate (or DONE if none).

## 5. Record

Call Skill `checkpoint`, observing the **parallel-conflict-avoidance rules** (prevents merge conflicts when multiple engines touch the same doc):
- `PROGRESS_LOG.md`: **append** newest entry only (union-merge auto-merges — safe).
- `NEXT_PLAN.md`: mark **only the one line for your lane's item** (`[ ]→[x]`). Don't touch other lines/sections/lanes (conflict source).
- `STATUS.md`/`AGENT_BRIEF.md`: **don't edit this iteration** — the orchestrator (claude) updates them in bulk after merge.

## 6. Commit (local only)

1. `git status` to confirm the writes actually landed (write-loss defense).
2. `git add -A && git commit` — **local commit only**. Include this trailer line:
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

**When near the limit**: finish steps 5–6 (checkpoint + commit) first, then end.

---

> **Core**: MythOS is a narrative game. The `[auto]` backlog is thin.
> Suitable only for hygiene / regression / refactor / codemod / deterministic-bugfix.
> When in doubt, don't — leave a Blocker. **Making a change an unattended agent can't verify is the biggest risk.**
