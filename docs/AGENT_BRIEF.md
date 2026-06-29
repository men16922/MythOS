# Agent Brief

Last updated: 2026-06-29

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **All autonomous closed-beta code DONE incl. CBT onboarding UX (2026-06-29, `daa5438`+`fce5874`, `make check` 608 green, UNPUSHED — private repo, user pushes `feat/en-ko-s0-language-plumbing`).** This session added: EN route-choice label localization; **Option B stable identity** (`stablePlayerId()` from invite key → saves follow key cross-device, no OAuth); **game-style Save/Load modal** (`SaveLoadModal.tsx` — scene·character·date·thumbnail, paging 6/page over latest 60); **invite-gate screen** (`InviteGate.tsx` + `GET /auth/verify-invite`, key→localStorage one-time/browser). Cloud stack (Vertex Gemini/Imagen/GCS, lean Cloud Run container, Cloud Trace, invite/loop-cap gating) already DONE + Vertex-live-validated; local cloud play `make api-cloud` + `make visual-worker-cloud-bg`; runbook `docs/cloud/DEPLOY.md`. **NEXT (priority order):** (1) **K6 combat + K9 ending EN verification** (last EN gaps — agent-doable live play); (2) **deploy = HUMAN/INFRA**: `gcloud run deploy` + DB(Neon) + GCS bucket + billing alert + env (incl. `MYTHOS_INVITE_KEYS` + per-tester `?invite=` URLs) + feedback Google Form (CLOSED_BETA §5) → r/playtesters; add invite-gate note to DEPLOY.md; (3) EN tails: glass-library glossary, session `_outcome`. EN default flip = one-liner gated on KO live-QA A·F human sign-off. App.tsx slice-14 decomp `[blocked]`.**

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
