# Agent Brief

Last updated: 2026-07-05

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **CBT P1-C density/continuity** per `docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md` — order: C3 ally-join foreshadow rule → C1 no-op turn guard → G3 cinematic cues (absorbs C4 SFX) → D3 board full-width layout → D4 cover legibility. **P1-A AND P1-B are DONE** (`9226005..4a100cd`, `make check` 802; telegraph/tutorial/disclosure/skill-badges/status-chips + meet-arc slot/6 opening variants/loop modifiers) but NOT deployed; AGY live-QA screen on a fresh account pending; curated variant-opening art = agy follow-up. Cloud rev `00025-856` live (pre-P1). Queued for humans: **voice-id pinning** (`outputs/voice-auditions/{ko,en}/` → `resources/neo-seoul/audio/voice/voices.json`), sign-off full run (`docs/test/neo_seoul_live_qa.md`), `git push` (ahead 41), ally-writeback triage, Audrey reply, balance calls. Teaser #2 deferred. Rollback = `MODEL=gemini-2.5-flash` env.

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
- mflux/FLUX (local) / Vertex Imagen (cloud) images generate sync in-request; Redux character consistency; MinIO/GCS asset paths verified.
- Narrative is dual-model: storyteller `OLLAMA_MODEL_STORY`=`gemma4:latest` (8B, free text) → parser `OLLAMA_MODEL_PARSER`=`qwen2.5:3b-instruct` (JSON structuring). Streaming path runs a regex parser in parallel.
- Opening sequence consistency (5 cuts: awakening→se_rin appears→approaching hand→first contact→pursuit+combat). Prompt-layer separation in progress (authored directives→`resources/<scenario>/directives/*.md`, `docs/PROMPT_LAYER.md`). Detailed state in `STATUS.md`.

## Active Work

`docs/NEXT_PLAN.md` is authoritative for next priorities.

1. **CBT P1 implementation** (`docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md`): **P1-A + P1-B done** (telegraph/tutorial/disclosure/skill legibility/status chips + meet-arc slot/opening variants/loop modifiers). Next: P1-C density/continuity (C3 foreshadow → C1 no-op guard → G3 cues → D3-D4 board), then P1-D signature+boss skills, P1-E narrative arc/cinematic (dialogue markup + ElevenLabs voice). Parallel human lane: sign-off run on rev `00025-856`, voice-id pinning, `git push`, Audrey reply. Cost levers env-only: `GEMINI_MODEL_KEYBEAT` hybrid ($0.5) / full-2.5 ($0.2).
2. **Engineering maintenance track (WS0-3 done)**: 6-layer agent ops bible↔MythOS interpretation (including mechanical→semantic→creative verification), slim entry points, structured logging/dashboard, and Resume Pointer continuity. Only WS4 content pipeline remains plan-only (`docs/plans/2026-06-14-engineering-plan.md`).
3. `glass-library` extension: hold (parity + Story Bible 17 entries done; further extension after Neo-Seoul completion). Completed tracks (combat/progression/party/grant/route-node) → `docs/COMPLETED_SUMMARY.md` M35-M40.

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
