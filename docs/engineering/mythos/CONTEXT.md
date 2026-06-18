# MythOS interpretation — CONTEXT_ENGINEERING

> Maps the bible [`../CONTEXT_ENGINEERING.md`](../CONTEXT_ENGINEERING.md) concepts **onto this repo's implementation**.
> Authority: `docs/DOCS_POLICY.md` (Context Budget · Read Path) · `docs/README.md` (index).

## Read Path & budget
Automated by the `/sync` skill: 1. `docs/AGENT_BRIEF.md` (≤60) → 2. `docs/STATUS.md` (≤120) → 3. `docs/NEXT_PLAN.md` (≤120)
→ 4. top of `docs/PROGRESS_LOG.md` (≤120). No bulk-read of all of `docs/`. On overflow, `/tidy-docs` splits into `bin/docs/archive/progress-YYYY-MM.md`.

## Knowledge Pyramid → actual files
- L0: `AGENT_BRIEF`/`STATUS`/`NEXT_PLAN` + entry points (CLAUDE/AGENTS/GEMINI).
- L1: `DESIGN` · `GAMEPLAY` · `DOCS_POLICY` · `harness/CORE_MANDATES`.
- L2: `docs/plans/*` · scenario · story_bible.
- L3: `bin/docs/archive/*` · `scripts/overnight/logs/*` · generated reports (not default context).

## Triple State Storage → actual
git per-iteration commits · structured ledger `scripts/overnight/logs/status.tsv` (WS3) · natural language `STATUS`/`PROGRESS_LOG`/`AGENT_BRIEF`.

## Resume Pointer (continuity)
- The `▶ NEXT SESSION:` line at the top of `AGENT_BRIEF.md` = in-repo plan (`docs/plans/*`) + first action.
- Authoritative active focus aligned across 3 docs (AGENT_BRIEF Active Work #1 + STATUS Active Focus + NEXT_PLAN priority).
- `/sync` echoes it first (`.claude/skills/sync/SKILL.md`). The rule is `docs/DOCS_POLICY.md` "Dated Plans".
- **Forbidden**: a `~/.claude/plans/*` scratch path as the authoritative pointer. **Regression case (2026-06-14)**: a reserved task left only as a preamble note + scratch
  path meant `/sync` couldn't take it over → fixed with this convention (`docs/plans/2026-06-14-engineering-plan.md` WS0).

## Preventing entry-point divergence
`CLAUDE.md` (canonical body) + `AGENTS.md`/`GEMINI.md` (thin wrappers, shared read-path + `docs/engineering/README` link).
The shared body lives in CLAUDE.md alone; the rest are links.

## memory
Agent persistent memory (`~/.claude/.../memory/`) holds only **non-obvious user/feedback/project context**, not what code already records.

## Code-search index (Quarkify)
This repo's implementation of bible §2 (the structure index is conditional). `.quarkify/src` (Quarkify decomposes `src/**/*.py` by folder topology, a gitignore artifact).
- Operation: `make quarkify-setup` (one-time tool clone) · `make quarkify` (rebuild, idempotent ~4s) · `make quarkify-check` (non-blocking freshness).
- Policy: large packages · high-frequency symbols use the index first (measured 80~92% token reduction), rare literals use grep (−5% counter-effect). **Authority is the source** — leaves are empty folders (location only).
- Freshness: not in `make check` (optional accelerator). `harness/check-quarkify.sh` provides self-heal/`--check`.
- Authoritative policy/rationale: `CLAUDE.md` "## Quarkify" · `harness/CORE_MANDATES.md §5` · `docs/plans/2026-06-18-quarkify-poc.md`.

## Sibling interpretations
harness [`HARNESS.md`](HARNESS.md) · loop [`LOOP.md`](LOOP.md) · multi-agent [`AGENTIC.md`](AGENTIC.md) · prompt [`PROMPT.md`](PROMPT.md)
