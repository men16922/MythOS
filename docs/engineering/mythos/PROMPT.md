# MythOS interpretation — PROMPT_ENGINEERING

> Maps the bible [`../PROMPT_ENGINEERING.md`](../PROMPT_ENGINEERING.md) concepts **onto this repo's implementation**.
> Authority: narrative design `docs/DESIGN.md` · design invariants `harness/CORE_MANDATES.md`.

## 1. Harness iteration prompt — `scripts/overnight/PROMPT.*.md`
| File | Engine | Notes |
| --- | --- | --- |
| `PROMPT.md` | claude | Calls Skills (`/sync` · `/checkpoint`), standard procedure |
| `PROMPT.codex.md` | codex | No Skills → reads/performs `.agents/skills/*/SKILL.md` procedures. `§0` forbids local-destruction · fabricate |
| `PROMPT.agy.md` | agy | Image-draft lane. No sandbox → boundary via guardrails + domain ownership |
| `PROMPT.review.md` | codex (reviewer) | Read-only audit of the integration diff, no code/NEXT_PLAN edits, findings only |
- Procedure authority is [`LOOP.md`](LOOP.md) · [`AGENTIC.md`](AGENTIC.md). Promote constraints to gates where possible (`test_image_assets.py` blocks fabricate).

## 2. Runtime narrative prompt — `src/mythos_narrative/`
- `prompts.py` — message builder. **dual-model**: storyteller (`gemma4:latest` 8B free text) → parser
  (`qwen2.5:3b-instruct` JSON). The streaming path runs a regex parser in parallel.
- `schemas.py` — `ScenePayload`/`WorldDelta`/`NarrativeContext` + limits (`MAX_NARRATION_CHARS=2200`,
  `MAX_VISUAL_BRIEF_CHARS=700`, `MAX_CHOICES=4`, allowed world-delta keys).
- **repair→fallback**: on parse failure, one LLM repair → on repeated failure, a deterministic fallback scene (`CORE_MANDATES §3`).
- **context selection**: no full Story Bible/scenario/shard injection — only phase/location/flags snippets + a rolled-up `causality_summary`.

## 3. Narrative register (feel)
Not a ban on abstract SF terms but **repetition is the problem** + per-scene register (general=screenplay action-line, esoteric=abstract OK; memory
`narrative-register-rule`). Repetition suppression is reinforced by `build_session_synopsis` guidance. Final call is human QA (`docs/test/neo_seoul_live_qa.md`).

## Sibling interpretations
harness [`HARNESS.md`](HARNESS.md) · loop [`LOOP.md`](LOOP.md) · multi-agent [`AGENTIC.md`](AGENTIC.md) · context [`CONTEXT.md`](CONTEXT.md)
