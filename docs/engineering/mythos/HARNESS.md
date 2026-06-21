# MythOS interpretation — HARNESS_ENGINEERING

> Maps the bible [`../HARNESS_ENGINEERING.md`](../HARNESS_ENGINEERING.md) concepts **onto this repo's implementation**.
> Design-invariant authority: `harness/CORE_MANDATES.md`. Raw research: `bin/docs/archive/HARNESS_RESEARCH.md` · `bin/docs/archive/AI_REARCH.md`.

## Maturity self-diagnosis: **L3**
- L1 ✅ CLAUDE/AGENTS/GEMINI.md · `make check` · worktree/branch · `docs/plans/`.
- L2 ✅ `make check` gate · codex independent reviewer · overnight per-iteration commits · `/checkpoint`.
- L3 ✅ 3-engine · worktree · creator≠reviewer · `status.tsv` structured ledger · risk-gated critic.
- **Remaining L3 gap**: entropy gardener automation (currently `/tidy-docs` is docs-only and manual; extend only after measured code/architecture drift justifies it).

## Feedback Ladder examples
Once = codex `logs/review-latest.md` finding · twice = `CORE_MANDATES §5` · memory `narrative-register-rule` ·
3×+ = QA seed→invariant test (`tests/test_route_integrity.py` · `test_content_integrity.py`) · hard gate = `overnight-settings.json` deny · `make check` block.

## Verification layers

The authoritative three-layer mapping is [`VERIFICATION.md`](VERIFICATION.md). The lower-level harness ladder maps as follows:
| Bible layer | MythOS |
| --- | --- |
| L1 file change | (no dedicated hook) ruff `F` + conflict caught by `make check` |
| L2 turn end | ruff + eslint + `mypy src tests` + tsc/vite-build |
| L3 before done | unittest (+`test_*_integrity`) — `make smoke`/`test-db`/`test-e2e` are opt-in |
| L4 review | codex read-only (`make overnight-review` → `logs/review-latest.md`) |
| L5 PR/merge | `.github/workflows/ci.yml` + human QA (`docs/test/*`) |
> This repo bundles L1-L3 into a **single `make check`** (darwin/Make). No separate PowerShell gate.

## Tier boundary → actual implementation
- Tier 1/2: `overnight-settings.json` (claude allow) / codex `workspace-write`.
- Tier 3 block: claude deny (push · net · destructive make · rm-rf · Web · MCP) / codex `network_access=false` + sandbox / agy no-sandbox → prompt guardrails + worktree.
- Remaining gap: local destruction within the codex/agy workspace isn't blockable by the sandbox, so it's blocked only by the `PROMPT.*.md §0` prohibition (blast radius ≤1 iteration).

## Progressive Deletability examples
`NEXT_PLAN` `[blocked]` item preconditions · "remove `_map` once all scenarios switch to route_map" etc. Attach a removal condition to every new rule.

## Sibling interpretations
loop [`LOOP.md`](LOOP.md) · verification [`VERIFICATION.md`](VERIFICATION.md) · multi-agent [`AGENTIC.md`](AGENTIC.md) · context [`CONTEXT.md`](CONTEXT.md) · prompt [`PROMPT.md`](PROMPT.md)
