# Agent Brief

Last updated: 2026-07-03

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **CBT CONSOLIDATION merged locally to `main` (2026-07-03, `cf7f57f`, `make check` 657 green; NOT pushed/redeployed):** overnight 3-lane merged — IX **boss-fire fix** + **side-anchor mechanism** + per-loop variation/invariants; character scenes regenerated for portrait consistency; 9 side arcs + 7 KO/EN Story Bible branches. **Side-arc producer lifecycle is CLOSED:** route effects produce `help_citizen`/`optimization_list_seen`/`kai_found` before each `min_layer`; Han/Su-ah/Tae-o meet nodes set canonical `met_*` + affection; gate fallback leaks and side→side dependencies are invariant-blocked (500-seed before/after: missing producers 6→0, leaks→0, chains 32→0). **Prompt lifecycle is CLOSED:** context-only route-target preview makes the selected node title/image/flags reach its first generated scene; typed KO/EN `side_arcs*.md` locks cover all 9 beats in the full-render channel. **Dynamic variety is CLOSED:** growth mirrors full-builder non-replacement layer sampling (200-seed duplicate titles 21→0; type diversity 5.04→5.61). **NEXT = human: push/redeploy + live play-QA** (`docs/test/neo_seoul_live_qa.md` 🔴: IX boss fires · companion/side scenes vary · 30–60min feel). — **🚀 GCP CLOSED BETA IS LIVE (2026-06-29)** at `https://mythos-api-1004528040791.us-central1.run.app` on Neon + Vertex + GCS, with invite gate, tester loop cap, and scale-to-zero. Recruitment assets are ready in `docs/cbt/`. Human follow-ups: push/redeploy, Discord/r/playtesters distribution, monitor sign-ups, K9 natural-ending screenshot. App.tsx slice-14 remains `[blocked]`; Korean-on-resume is persisted legacy prose only. Runbook `docs/cloud/DEPLOY.md` §10.**

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
