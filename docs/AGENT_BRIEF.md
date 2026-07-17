# Agent Brief

Last updated: 2026-07-17

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **Owner QA is the gate; agent lanes are clear.** Live = `00073-zx2`: full-3.5 narrative (A/B ROLLBACK verdict, source-pinned) + **portrait combat hierarchy rework** (board dominates 389px/height-fit, dock 30dvh, cinema cards vw-scaled, sim skips boons — `docs/plans/2026-07-17-portrait-combat-hierarchy.md`) + term-gloss UI + image 2.5. Owner checklist = `docs/test/neo_seoul_live_qa.md`: **§2 재검 (portrait rework)** · **§3 two-style playtest** (+§5 image recovery). Eval bank ready — hand loop ids after play.

## Snapshot

Project MythOS is a single-player SF loop-based TRPG/CRPG on a Python 3.11+ local runtime. An AI GM (Ollama) drives scenes; tactical combat is adjudicated by a separate deterministic combat engine.

Current baseline:
- `RuntimeSessionService` handles shared orchestration for CLI/Streamlit/FastAPI.
- React+TS SPA + FastAPI `/api/v1` REST/WS adapter, and Streamlit demo all call the same runtime service.
- PostgreSQL/MinIO/OTel/Jaeger local infra (Redis removed 2026-07-04; images generate synchronously in-request).
- Neo-Seoul 01 is the primary scenario, `glass-library` is an extension sample.
- Story Bible, Codex, Run History, Meta Progression, Save/Load, Ending Resolver implemented.
- Tactical combat (full-body action pose, role/tags skill animations, icon action bar, direct party control, 3 new allies and 4 enemy types with 35 new combat sprites mapped into scenario.json), Tactical Board legend/tile inspector/learning-goal banner, Playwright E2E implemented.
- Operation map route-node-ified (deterministic DAG + multi-perspective anchors `route_map.py`/`route_runtime.py`) + session memory (`session_memory.py` beat ledger + rolling synopsis, not RAG).
- Progression unlock (archetype gates, insight investment tree, rank pips/upgrade banner, epiphany banner, Run History + Echo/Shard dashboard, cross-scenario unlock, data-driven grant).
- Persistent objective/stakes display and choice value-axis/expected-result/actual-result summary UX.
- mflux/FLUX (local) / Vertex Gemini Image (cloud, `gemini-2.5-flash-image`) generate sync in-request; Redux character consistency; MinIO/GCS asset paths verified.
- Narrative is dual-model: storyteller `OLLAMA_MODEL_STORY`=`gemma4:latest` (8B, free text) → parser `OLLAMA_MODEL_PARSER`=`qwen2.5:3b-instruct` (JSON structuring). Streaming path runs a regex parser in parallel.
- Opening sequence consistency (5 cuts: awakening→se_rin appears→approaching hand→first contact→pursuit+combat). Prompt-layer separation in progress (authored directives→`resources/<scenario>/directives/*.md`, `docs/PROMPT_LAYER.md`). Detailed state in `STATUS.md`.

## Active Work

`docs/NEXT_PLAN.md` is authoritative for next priorities.

1. **Owner live QA gate on `00072-pw9`** — the only open Priority 0 work (§1 A/B DECIDED: rollback, `DECISIONS.md` 07-17): §2 real-device portrait combat pass · §3 two-style balance playtest (+§5 image recovery, §8 term-gloss). Combat overhaul arc + teaser V2 closed (M59-M60).
2. **Manual content residuals**: S4 copy tone, variant intro feel, G2 twist tone, EN fresh-loop retest (CBT P1; see `NEXT_PLAN.md`).
3. **Maintenance/hold**: WS4 closed (design `docs/plans/2026-07-17-ws4-authored-content-pipeline.md`, impl on-demand); WS5 residual = Model-B demo (owner-armed); `glass-library` held until Neo-Seoul satisfaction.

## Read Order

1. Current state: `docs/STATUS.md`
2. Next work: `docs/NEXT_PLAN.md`
3. Latest log: `docs/PROGRESS_LOG.md`
4. Before structural changes: `docs/DESIGN.md`
5. Before game-rule changes: `docs/GAMEPLAY.md`
6. Before scenario changes: `docs/scenarios/*` or `resources/<scenario>/story_bible/*`

## Commands

- Basic verify: `make test`
- Python quality: `make lint`, `make typecheck`
- React quality: `make frontend-lint`, `make frontend-build`
- Browser E2E: `make test-e2e`
- Runtime smoke: `make smoke-local`
- Persistence/MinIO: `make smoke`, `make test-db`
- Full local dev: `make dev-up` / `make dev-down`

## Guardrails

- Keep runtime orchestration in `RuntimeSessionService`; do not duplicate it into UI/API.
- Keep pure unit tests Docker-free. DB tests go through `MYTHOS_RUN_DB_TESTS=1`.
- Do not treat generated outputs, `.env`, tokens, `.docker/` data as source artifacts.
- Keep current docs short; move detailed records to `bin/docs/archive/` or dated plans.
