# Agent Brief

Last updated: 2026-07-11

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **2026-07-11 session #8 (UNDEPLOYED, git ahead 16, 2 commits `b9a5b63`+`dddd3e2`; `make test` 983 green): tab reorder 이야기·인물·스킬·도감 + collapsible/intuitive 도감 (`CodexSection` accordion, desktop-open/mobile-collapsed) + **companion party-join bug fixed** — lin_yue/han/su_ah/tae_o meet arcs set `met_` but never `party_add` (dead `ally_` flags) → could only AI-ally, never join; each meet side-arc now sets `ally_`+`party_add` (mirrors kai). CONTINUE HERE: (1) `! git push` (owner-run, ahead 16) + owner `make deploy` (billable/PROD) → new rev; (2) owner verify: 도감 접이식 real-device + each of the 4 companions actually joins as a controllable party member (visit their optional side anchor on the map → next combat) + party-size balance (max_side_anchors=2/loop); (3) then the still-open combat-P0 re-verdict → P1 GO/NO-GO. Traps: `make deploy`/`make api-cloud` billable+PROD (owner-run `!`); prod DB reads auto-blocked. — PRIOR: owner-playtest marathon — 7 deploys `00044`→latest `mythos-api-00050-q66` (smoke 200 each; `make check` 983 green; git ahead ~13, `! git push` owner-run). Live this session: combat P0 (full telegraph ⚔+dice · 10×7 arenas · terrain tiles + dark floor + board declutter [▲/🛡 badges focus-only]) · **P0 telegraph "안 바뀜" root-caused = stale radar, FIXED** (`055fa9d`: `_build_result` snapshotted radar before the intent planner) · heal-skill fix (echo_collector seeds ×2 nanopatch → patch_protocol works turn 1; item-gated skills disable + "나노패치 필요") · A/V sync A+B+C · mobile UX (tab-swipe w/ wrap-around · market dock dismissible/collapsed · inline story-history collapsed) · dialogue (possessive "린위에의 부하"≠린위에 · quoted speech ALWAYS set apart as `.dialogue-line`, portrait+name only when the speaker is named) · EN opening-card parity · Codex glossary · Imagen quota 1→30/min. CONTINUE HERE: (1) **owner combat-P0 re-verdict on 00050** — A0-#5 "아직 구경인가?" in `docs/test/neo_seoul_live_qa.md` → **P1 GO/NO-GO** (no-miss determinism / push-pull / immovable objectives; research `docs/plans/2026-07-11-combat-redesign-research.md` + P0 plan `…-combat-p0-terrain-grid-telegraph.md`); (2) open triage: track-4 balance playtest · real-device mobile pass (swipe/market/dialogue) · optional dialogue continuity-fallback (owner deferred); (3) `! git push` (owner-run, ahead ~13). Traps: `make deploy`/`make api-cloud` are billable + PROD (owner-run `!`); prod DB reads auto-blocked (hand the owner a `!` command).**

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
