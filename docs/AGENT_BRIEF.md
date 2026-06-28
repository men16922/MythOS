# Agent Brief

Last updated: 2026-06-28

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **GCP closed-beta ALL autonomous code DONE (`f744d40`..`caf6304`) + EN/KO now end-to-end English through the live SPA (`c6075e7`..`465c2f1`), 2026-06-28. Cloud: Vertex Gemini/Imagen/GCS providers + lean Cloud Run container + Cloud Trace + invite gating + loop cap; env `MYTHOS_NARRATIVE_PROVIDER`/`MYTHOS_VISUAL_PROVIDER`/`MYTHOS_STORAGE_BACKEND`/`MYTHOS_INVITE_KEYS`/`MYTHOS_MAX_LOOPS_PER_PLAYER`/`MYTHOS_TRACE_BACKEND`. LIVE-validated vs real Vertex (Gemini 3/3 ~5s thinking-off, Imagen 1024²). Local cloud play: `make api-cloud` + `make visual-worker-cloud-bg`. Runbook+cost `docs/cloud/DEPLOY.md`. EN/KO: fixed API never setting `RuntimeOptions.language` + S4 data sweep (`mythos_api/localize.py` glossary 332 + phrases at all player-facing endpoints → combat/skill-tree/character/status/map English). `make check` green **599**. NEXT = HUMAN/INFRA ONLY: `gcloud run deploy` + DB(Neon) + GCS bucket + billing alert + env values + feedback Google Form (CLOSED_BETA §5). Parallel human gate: neo-seoul KO live-QA A·F → EN default flip. EN follow-ups: glass-library glossary, `현재 지점: <route title>` embedded, session `_outcome`. App.tsx decomp `[blocked]`. Agent can't push (private) — user pushes (`f744d40`..`465c2f1`).**

## Snapshot

Project MythOS is a single-player SF loop-based TRPG/CRPG on a Python 3.11+ local runtime. An AI GM (Ollama) drives scenes; tactical combat is adjudicated by a separate deterministic combat engine.

Current baseline:
- `RuntimeSessionService` handles shared orchestration for CLI/Streamlit/FastAPI.
- React+TS SPA + FastAPI `/api/v1` REST/WS adapter, and Streamlit demo all call the same runtime service.
- PostgreSQL/MinIO/Redis/OTel/Jaeger local infra.
- Neo-Seoul 01 is the primary scenario, `glass-library` is an extension sample.
- Story Bible, Codex, Run History, Meta Progression, Save/Load, Ending Resolver implemented.
- Tactical combat (full-body action pose, role/tags skill animations, icon action bar, direct party control, 3 new allies and 4 enemy types with 35 new combat sprites mapped into scenario.json), Tactical Board legend/tile inspector/learning-goal banner, Playwright E2E implemented.
- Operation map route-node-ified (deterministic DAG + multi-perspective anchors `route_map.py`/`route_runtime.py`) + session memory (`session_memory.py` beat ledger + rolling synopsis, not RAG).
- Progression unlock (archetype gates, insight investment tree, rank pips/upgrade banner, epiphany banner, Run History + Echo/Shard dashboard, cross-scenario unlock, data-driven grant).
- Persistent objective/stakes display and choice value-axis/expected-result/actual-result summary UX.
- mflux/FLUX image worker, Redux character consistency, MinIO asset path verified.
- Narrative is dual-model: storyteller `OLLAMA_MODEL_STORY`=`gemma4:latest` (8B, free text) → parser `OLLAMA_MODEL_PARSER`=`qwen2.5:3b-instruct` (JSON structuring). Streaming path runs a regex parser in parallel.
- Opening sequence consistency (5 cuts: awakening→se_rin appears→approaching hand→first contact→pursuit+combat). Prompt-layer separation in progress (authored directives→`resources/<scenario>/directives/*.md`, `docs/PROMPT_LAYER.md`). Detailed state in `STATUS.md`.

## Active Work

`docs/NEXT_PLAN.md` is authoritative for next priorities.

1. **Automatic AGY QA inside existing overnight (WS-A..F DONE)**: `make overnight*` stays the sole operator flow; after gate+critic a candidate filter + AGY 2-stage decision drive browser QA, plus a DONE-time A/F drain sweep. Now **default-on** (`OVERNIGHT_BROWSER_QA=auto`; `=0` kill-switch). 502 tests + 1 real run (Chrome DevTools, PASS) verified. `docs/plans/2026-06-21-overnight-auto-agy-qa.md` §20-21.
2. **Engineering maintenance track (WS0-3 done)**: 6-layer agent ops bible↔MythOS interpretation (including mechanical→semantic→creative verification), slim entry points, structured logging/dashboard, and Resume Pointer continuity. Only WS4 content pipeline remains plan-only (`docs/plans/2026-06-14-engineering-plan.md`).
3. Completed tracks (follow-ups handled in the Neo-Seoul track): combat presentation overhaul, progression unlock, direct party control, data-driven grant, route-node — `docs/COMPLETED_SUMMARY.md` M35-M39.
4. `glass-library` extension: hold (parity + Story Bible 17 entries done; further extension after Neo-Seoul completion).

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
