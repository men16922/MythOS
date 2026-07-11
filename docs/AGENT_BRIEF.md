# Agent Brief

Last updated: 2026-07-12

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **2026-07-12 session #12 (UNDEPLOYED; `make check` 993 green; main ahead of origin ~26): cover-pose renderer wiring (`d361069`: pose `"cover"` + `<char>-cover.png` derived convention, guard-sprite fallback) · overnight `classify_outcome` false-limit fix (`695b25e` + plugin `3751178`) · PROMPT.codex/agy now invoke `$sync`/`$checkpoint` and `/sync`/`/checkpoint` · **A2A runner relays** (`6077a92`, design `docs/plans/2026-07-12-a2a-relays.md`): image-judge gate (claude vision vs canon, FAIL=auto-revert; live-validated — correctly FAILs the rejected cover batch) + same-night blocker escalation (cap 2/run). **Cover art: batch 1 `4d5b3be` owner-REJECTED wholesale** (one crouch template + shuffled identities: se-rin=player design, kai=human, lin-yue=kai's android body, tae-o=female) — **regen COMPLETE 2026-07-12 AM (4 codex rounds, owner-in-the-loop)**: 5 confirmed (`df8d1e6`/`2942a74`) → owner canon rule (**cover props must exist in the char's own guard sprite**) → player-noise unarmed approved (`cac23f9`), su-ah style-drift rejected → round 4 reproduced attempt-1 style w/ knife-only swap (`8114937`, image-judge PASS). Owner APPROVED the comparison sheet 2026-07-12 — cover-art blocker lifted; `make deploy` pins `IMAGEN_MODEL=gemini-3.1-flash-image` by default (Makefile `--update-env-vars`). **DEPLOYED 2026-07-12: `mythos-api-00052-fcx` (owner-run; smoke health/root 200; IMAGEN_MODEL verified on the revision) — the session #8-#12 bundle is LIVE.** CONTINUE HERE: (1) `! git push` (ahead ~11); (2) owner live verify: image character consistency (the win) · push/pull feel + cover badge/pose · hot-path choices fix · portrait combat real-device. — PRIOR: sessions #8–#11 (tab/도감/companion-join → playtest batch → push/pull + cloud image model migration → cover-pose wiring) all ride the same UNDEPLOYED bundle and the same owner verify list. Traps: `make deploy`/`make api-cloud` billable+PROD (owner `!`); prod DB reads auto-blocked.**

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
