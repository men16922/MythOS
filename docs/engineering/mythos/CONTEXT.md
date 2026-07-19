# MythOS interpretation — CONTEXT_ENGINEERING

> Maps the bible [`../CONTEXT_ENGINEERING.md`](../CONTEXT_ENGINEERING.md) concepts **onto this repo's implementation**.
> Authority: `docs/DOCS_POLICY.md` (Context Budget · Read Path) · `docs/README.md` (index).

## Read Path & budget
Automated by `$overnight-harness:sync`: 1. `docs/AGENT_BRIEF.md` (≤60) → 2. `docs/STATUS.md` (≤120) → 3. `docs/NEXT_PLAN.md` (≤120)
→ 4. top of `docs/PROGRESS_LOG.md` (≤120). No bulk-read of all of `docs/`. On overflow, `$overnight-harness:tidy-docs` splits into `bin/docs/archive/progress-YYYY-MM.md`.

## Knowledge Pyramid → actual files
- L0: `AGENT_BRIEF`/`STATUS`/`NEXT_PLAN` + entry points (CLAUDE/AGENTS/GEMINI).
- L1: `DESIGN` · `GAMEPLAY` · `DOCS_POLICY` · `harness/CORE_MANDATES`.
- L2: `docs/plans/*` · scenario · story_bible.
- L3: `bin/docs/archive/*` · `scripts/overnight/logs/*` · generated reports (not default context).

## Triple State Storage → actual
git per-iteration commits · structured ledger `scripts/overnight/logs/status.tsv` (WS3) · natural language `STATUS`/`PROGRESS_LOG`/`AGENT_BRIEF`.

## Long-horizon mission checkpoint (V2 target)

V1 restores a fresh process every iteration. V2 keeps that recovery property but may continue a capable engine across
bounded turns while the mission is stable. At each commit/milestone it writes a machine-readable checkpoint containing:

- mission state + current layer (`research|design|implementation|review|external`);
- completed evidence and verifier versions;
- HEAD, dirty/clean status, lease owner, next action, unresolved hypotheses;
- turns/time/tokens/retries consumed and remaining.

Continuation turns receive the checkpoint delta, not the full original prompt. Context pressure, drift, layer change,
timeout, or engine failure forces a fresh session restored from disk. The external controller owns that decision.

## Resume Pointer (continuity)
- The `▶ NEXT SESSION:` line at the top of `AGENT_BRIEF.md` = in-repo plan (`docs/plans/*`) + first action.
- Authoritative active focus aligned across 3 docs (AGENT_BRIEF Active Work #1 + STATUS Active Focus + NEXT_PLAN priority).
- `$overnight-harness:sync` echoes it first after loading `.claude/harness-config.json`. The rule is `docs/DOCS_POLICY.md` "Dated Plans".
- **Forbidden**: a `~/.claude/plans/*` scratch path as the authoritative pointer. **Regression case (2026-06-14)**: a reserved task left only as a preamble note + scratch
  path meant sync couldn't take it over → fixed with this convention (`bin/docs/plans/2026-06-14-engineering-plan.md` WS0).

## Preventing entry-point divergence
`CLAUDE.md` (canonical body) + `AGENTS.md`/`GEMINI.md` (thin wrappers, shared read-path + `docs/engineering/README` link).
The shared body lives in CLAUDE.md alone; the rest are links.

## memory
Agent persistent memory (`~/.claude/.../memory/`) holds only **non-obvious user/feedback/project context**, not what code already records.

## Code navigation (LSP)
This repo's implementation of bible §2 (the structure index is conditional). Symbol/structure search defaults to **LSP** in Claude Code — pyright (Python) + vtsls (TS/TSX) cover the whole `src/`. Semantic, returns exact `file:line:char`, always live; **authority is the source**. Engines without an LSP tool (Codex/agy/Gemini lanes) use grep. Reserve grep for rare literals / non-symbol text.
- Authoritative policy/rationale: `CLAUDE.md` "## Code navigation (LSP-first)" · `harness/CORE_MANDATES.md §5`.

## Sibling interpretations
harness [`HARNESS.md`](HARNESS.md) · loop [`LOOP.md`](LOOP.md) · multi-agent [`AGENTIC.md`](AGENTIC.md) · prompt [`PROMPT.md`](PROMPT.md)
