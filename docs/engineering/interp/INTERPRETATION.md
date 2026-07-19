# Engineering Interpretation — Project MythOS

This document maps the **general concepts (Bibles)** defined in `docs/engineering/*_ENGINEERING.md` to the **actual files, commands, and mechanisms of this repository**.
The Bibles define "What/Why" (portable), and this document defines "How in this repository" (repo-specific). Fill out each section.

## HARNESS — Maturity/Verification/Permissions (Bible `HARNESS_ENGINEERING.md`)
- gate (verification): `make check` (`.claude/harness-config.json`)
- permission boundary: `scripts/overnight/overnight-settings.json` (allow=this repo's gate targets, deny=destructive/online actions)
- current maturity / next investment: L3 with plugin-owned V2 control plane; next investment is measured evaluator calibration and continuation, not another controller fork.

## LOOP — Unattended Loop (Bible `LOOP_ENGINEERING.md`)
- runner: resolved plugin `templates/scripts/overnight/run.sh`; `make overnight-where` proves the selected root.
- repo adapters: `scripts/overnight/compile-contract.sh` + `verifiers.d/*.sh`
- backlog tags: lane-specific `[auto:<engine>]`/`[manual]`/`[blocked]` in `docs/NEXT_PLAN.md`
- actor prompt: plugin renders a required typed WorkContract; no repo-local procedure prompt.
- skills: `$overnight-harness:sync`, `$overnight-harness:checkpoint`, `$overnight-harness:overnight-report`, and `$overnight-harness:overnight-seed` (plugin-owned); repo-local skills are only domain-specific.

## VERIFICATION — 3 Layers (Bible `VERIFICATION_ENGINEERING.md`)
Declare all three layers in one place. Push each check as far DOWN this list as it can go (mechanical > semantic > creative).
- mechanical: `make check` — lint/type/build/unit/content/doc/skill sync.
- semantic: `OVERNIGHT_CRITIC=auto` + `CRITIC_PROMPT.md`; fail-closed.
- domain: scope, gameplay, browser, and image-identity verifiers; uncertainty becomes `needs_human`.
- creative: narrative/play/balance/aesthetic/product decisions stay human.

## AGENTIC — Multi-Agent (Bible `AGENTIC_ENGINEERING.md`)
- plugin instances remain single-runner; MythOS isolates Claude/Codex/AGY lanes in worktrees and integrates serially. Builder and read-only reviewer are separate roles.

## CONTEXT — Context/Doc Discipline (Bible `CONTEXT_ENGINEERING.md`)
- entry point/Read Path: `AGENT_BRIEF` → `STATUS` → `NEXT_PLAN` → recent `PROGRESS_LOG`
- line budget: brief ≤60 · status/plan/log ≤120 (harness-config.budgets)
- Resume Pointer: `▶ NEXT SESSION` in `docs/AGENT_BRIEF.md`
- archive: `bin/docs/archive/`

## PROMPT — Prompt Layer (Bible `PROMPT_ENGINEERING.md`)
- harness prompt: required WorkContract compiled by MythOS and rendered by the plugin.
- runtime/domain prompt: `src/mythos_narrative/` (separate product surface).
