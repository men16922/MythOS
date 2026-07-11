# Agent Brief

Last updated: 2026-07-11

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **2026-07-11 owner-playtest marathon — 3 deploys, latest rev `mythos-api-00045-pr6` (smoke 200, tile serving 200, unit suite 981 green). Live: portrait dialogue gate + dialogue callouts · save confirm dialog · stat-voice line-form styling · map-legend chips · EMP "-0"/effect copy · unheralded-ally HOLD (C3 join signal → hold until prose names them) · grant_items few-shot neutralized · combat A/V sync A+B · Codex glossary (11 terms) + invented-system-noun guard · Vertex Imagen retry (root cause: 1/min quota — owner raised to 30/min) · **combat P0** (full telegraph ⚔+dice, 10×7 arenas, terrain-sprite layer w/ fallback; plan `docs/plans/2026-07-11-combat-p0-terrain-grid-telegraph.md`). CONTINUE HERE: (1) owner combat-P0 play verdict on 00045 (telegraph "no change" was a real stale-radar bug — FIXED+live `055fa9d`; terrain tiles now served live) → **P1 GO/NO-GO** (no-miss determinism / push-pull / immovable objectives, research `docs/plans/2026-07-11-combat-redesign-research.md`); (2) DONE this session (undeployed, on main, `make check` 980): `[auto:agy]` terrain tile art ×3 (alpha-processed to the canvas transparent-corner contract) · A/V sync C (roster/inspector HP mirrors the cinema replay) · EN opening-card parity (person-first + ARK restored); (3) open triage: track-4 balance playtest · real-device mobile pass. Live-QA guide rewritten as a play guide (`docs/test/neo_seoul_live_qa.md`); AGY prod QA now possible via `LIVE_QA_TARGET_URL` (first probe PASS). `! git push` pending (owner-run; ahead ~23).** Traps: `make api-cloud` is billable AND points at PROD Neon — stop after use; prod DB reads are auto-mode-blocked (hand the owner a `!` command); production deploys need the owner to name them (or owner-run `! make deploy`).

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

1. **Combat overhaul (A안, research-backed)**: P0 live (`00044-mtz`) — owner play verdict gates **P1** (no-miss determinism / push-pull / immovable objectives). Plans: `docs/plans/2026-07-11-combat-redesign-research.md` + `…-combat-p0-terrain-grid-telegraph.md`. Parallel: `[auto:agy]` terrain tile art ×3.
2. **Live sign-off lane (`[manual]`)**: play guide `docs/test/neo_seoul_live_qa.md` — Se-rin guard long-run · dialogue-scene portraits · track-4 balance 2-loop · real-device mobile pass · Audrey EN retest. Then key-beat hybrid A/B (`GEMINI_MODEL_KEYBEAT`, ~$1.0→$0.5/loop).
3. **Maintenance/hold**: WS4 content pipeline plan-only; `glass-library` held until Neo-Seoul satisfaction (`docs/COMPLETED_SUMMARY.md` M35-M40).

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
