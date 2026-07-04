# Engineering Interpretation — <PROJECT>

This document maps the **general concepts (Bibles)** defined in `docs/engineering/*_ENGINEERING.md` to the **actual files, commands, and mechanisms of this repository**.
The Bibles define "What/Why" (portable), and this document defines "How in this repository" (repo-specific). Fill out each section.

## HARNESS — Maturity/Verification/Permissions (Bible `HARNESS_ENGINEERING.md`)
- gate (verification): `<e.g. make check — harness-config.gate>`
- permission boundary: `scripts/overnight/overnight-settings.json` (allow=this repo's gate targets, deny=destructive/online actions)
- current maturity / next investment: <...>

## LOOP — Unattended Loop (Bible `LOOP_ENGINEERING.md`)
- runner: `scripts/overnight/run.sh` (defaults to claude engine). env: `GATE_CMD`/`MAX_ITER`/`PAUSE`/...
- backlog tags: `[auto]`/`[manual]`/`[blocked]` in `<NEXT_PLAN path>`
- iteration prompt: `scripts/overnight/PROMPT.md`
- skills: `/sync` `/checkpoint` `/overnight-report` `/overnight-seed` (provided by plugin)

## VERIFICATION — 3 Layers (Bible `VERIFICATION_ENGINEERING.md`)
Declare all three layers in one place. Push each check as far DOWN this list as it can go (mechanical > semantic > creative).
- mechanical (gate): `<gate cmd>` — proves: `<lint/type/build/test — what it actually verifies>`
- semantic (critic): `OVERNIGHT_CRITIC=<0|auto|1>` · prompt: `scripts/overnight/CRITIC_PROMPT.md` (copy from `.example.md`)
  - this repo's domain invariants ("green but wrong"): `<e.g. balance constants / API contract / generated files — or "none yet, generic critic">`
- creative (human): `[manual]` criteria = `<what here needs taste/balance/UX feel and can't be auto-verified>` · morning-review focus = `<what /overnight-report should scrutinize>`

## AGENTIC — Multi-Agent (Bible `AGENTIC_ENGINEERING.md`)
- currently single engine. (If introducing multi-agent) Map lane/domain splitting, worktree isolation, and builder≠reviewer patterns here.

## CONTEXT — Context/Doc Discipline (Bible `CONTEXT_ENGINEERING.md`)
- entry point/Read Path: `<AGENT_BRIEF>` → `<STATUS>` → `<NEXT_PLAN>` → `<PROGRESS_LOG>`
- line budget: brief ≤60 · status/plan/log ≤120 (harness-config.budgets)
- Resume Pointer: `▶ NEXT SESSION` line at the very top of `<AGENT_BRIEF>`
- archive: `<docs/archive/...>`

## PROMPT — Prompt Layer (Bible `PROMPT_ENGINEERING.md`)
- harness prompt: `scripts/overnight/PROMPT.md`
- runtime/domain prompt: `<path if this repo uses LLM; N/A otherwise>`
