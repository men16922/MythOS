# Overnight Iteration Prompt — Codex engine (Project MythOS)

You are one iteration of an unattended overnight loop (engine: **codex exec**). Execute the steps below **in order**.
One iteration = **1** `[auto]` task + **1 local commit** if the gate passes. Stopping at any point loses at most one iteration.

> This prompt is the same LOOP as Claude's `PROMPT.md`. The sync/checkpoint skills are installed as Codex
> plugin custom prompts — invoke them as **`$sync`** and **`$checkpoint`** (no manual SKILL.md walkthrough).

## 0. Role / Invariants (non-negotiable)

- **Enforced sandbox boundary**: this iteration runs with `--sandbox workspace-write` + network blocked.
  So `git push`, external network (`curl`/`wget`), Docker/Ollama/FLUX, and online `make` **fail physically**.
  Don't work around a failure — that command is forbidden in this loop.
- **Forbidden actions the sandbox can't block (avoid them yourself)**: in-workspace destructive commands are allowed by the sandbox, so
  **never run them** — `rm -rf`, `git reset --hard`, `git clean -fdx`, mass deletion. Don't do hard-to-reverse local destruction.
- **Forbidden task classes** (can't be verified unattended → never start):
  human-play feel QA (all of `docs/test/neo_seoul_live_qa.md`), content/Story-Bible authoring,
  balance tuning, LLM prompt-feel tuning.
- **If an integrity test finds a missing asset/content, never "create" it to force green**
  (e.g. generating a placeholder PNG for a missing skill icon, filling missing data with a dummy = content authoring = forbidden).
  Add invariants, but **surface the actual gap as a Blocker** (if the test goes red, revert per §4 and record the Blocker).
  When "green or Blocker" and something is missing, the answer is Blocker — committing fake assets is the biggest risk.
- **If you need an image**, make it with **your own Imagen 3/Gemini Image (in-session)**, not FLUX/mflux
  (prior example `outputs/combat-sprite-compare/`). But image drafting is mostly the agy lane's job.
- Follow `harness/CORE_MANDATES.md` §4-5 (measure before fix, docs-first, confirm structural moves, read-back verify before claiming done).
- Run the gate via env var `$GATE_CMD` (default `make check`; faster variants `make check-auto`/`make smoke-local`) verbatim.

## 1. Restore state

Run `$sync` (plugin custom prompt; Read Path: AGENT_BRIEF → STATUS → NEXT_PLAN → newest few
PROGRESS_LOG entries + `git status -sb`/`git log --oneline -8`). No other `docs/` bulk-read.
For symbol/structure search, use grep.

## 2. Residual recovery

Inspect `git status --porcelain`.

- **clean** → go to step 3.
- **dirty** = residue from an interrupted prior iteration. **This iteration's work is "recovery"** (no new task mixed in):
  - `$GATE_CMD` green → commit immediately with a `[recovered]`-prefixed message and end this iteration.
  - `$GATE_CMD` red → **do not touch it.** Record the Blocker (step 5), then create
    `scripts/overnight/STOP` (1-line reason) and end. (Needs human review — graceful stop.)

## 3. Task selection

From `docs/NEXT_PLAN.md`, pick **only the top unfinished item in the codex lane (`[auto:codex]`)**.

- Skip `[auto]`/`[auto:claude]`/`[auto:agy]` (other engines' lanes), `[manual]`/`[blocked]`, and **untagged** (no lane intrusion).
  Exception: only when the runner signals **claude failover mode** (via env/instruction) may you also consume the claude lane (`[auto]`/`[auto:claude]`).
- If a Blocker accumulates twice on the same item, append `[blocked]` to it and move to the next `[auto:codex]` candidate.
- If no candidate remains or all are blocked, create `scripts/overnight/DONE` (reason: `drained` vs `all-blocked`) and end.

## 4. Implement + gate

Change code+tests only per the item's **1-line completion criterion** (no scope expansion).

- Run `$GATE_CMD` (default `make check` = ruff + eslint + mypy + tsc/vite-build + unittest) until **fully green**.
- Gate failure → revert via `git restore` / `git checkout -- <path>` and record the Blocker.
  Second failure on the same item → mark `[blocked]` and move to the next candidate (or DONE if none).

## 5. Record

Run `$checkpoint` (plugin custom prompt), observing the **parallel-conflict-avoidance rules**:
- `PROGRESS_LOG.md`: **append** newest entry only (union-merge — safe), respect the line budget.
- `NEXT_PLAN.md`: mark **only the one line for your lane's item (`[auto:codex]`)**. Don't touch other lines/sections/lanes (conflict source).
- `STATUS.md`/`AGENT_BRIEF.md`: **don't edit this iteration** (orchestrator updates them in bulk after merge).

## 6. Commit (local only)

1. `git status` to confirm the writes actually landed, and re-read the key files you changed to confirm the changes went in (write-loss defense).
2. `git add -A && git commit` — **local commit only** (push forbidden/impossible). Include this trailer line:
   `Co-Authored-By: Codex <codex@openai.com>`

**When near the limit**: finish steps 5–6 (checkpoint + commit) first, then end.

---

> **Core**: MythOS is a narrative game. The `[auto]` backlog is thin.
> Suitable only for hygiene / regression / refactor / codemod / deterministic-bugfix.
> When in doubt, don't — leave a Blocker. **Making a change an unattended agent can't verify is the biggest risk.**
