# Agent Brief

Last updated: 2026-07-12

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **2026-07-12 session #13 (combat feedback marathon; `make check` 1019 green; ahead of origin ~9; all UNDEPLOYED on top of live `mythos-api-00052-fcx`)**: owner played 00052 live and directed a combat overhaul, all shipped same-day — **batch 1** `1d26a20` (system_hack→stun+💫 badge · overload_strike→melee splash · new push skill 자기 반발 · guaranteed-damage riders on utility skills · EMP grenade→XCOM cell-targeted AoE w/ blast preview · yank VFX for push/pull) · **responsiveness** `5aa65d8` (measured: 1 click = 7-10.5s serial cinema reel → cinema only for commanded blows+kills = 3.6s, plus tap-to-skip) · **two-tier control slices 2-3** `a164f81`/`de00355` (shot forecast 🎯%/⚔dmg on target chips · enemy-intent hover lens; design `docs/plans/2026-07-12-two-tier-combat-control.md`) · **status effects slice 1** `b55b37b` (burn 🔥/corrode 🧪 framework + `applies` riders + board badges; design `docs/plans/2026-07-12-status-effects-design.md`). **DEPLOYED same-day: `mythos-api-00053-hj4`** (owner-directed; smoke 200; IMAGEN_MODEL pin verified). CONTINUE HERE: (1) `[manual]` **owner feel pass — `docs/test/neo_seoul_live_qa.md` 플레이 A-0** (6 items: 해킹 스턴 · 낚아채기 · EMP 셀 투척 · 스플래시 · 반응성/탭스킵 · 명중% 칩+인텐트 렌즈) — verdict gates status-effects slices 2-3; (2) loop-consumable seeds: `[auto:claude]` status slice 2 (acid/freeze/shock) + two-tier slice 1-ext (skill board-targeting preview); (3) `[manual]` gates: status slice 3 content-mapping balance pass · two-tier slice 4 verdict. Also pending from 00052: image character consistency · cover badge/pose · portrait combat real-device. Traps: `make deploy` billable+PROD (owner `!`); **do not edit the repo while an overnight runner is live** (two NEEDS_HUMAN stops today were concurrent-edit artifacts; runner commit `86e8ffb` swept in-flight responsiveness edits — content green, history note in PROGRESS_LOG).

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

1. **Combat feedback bundle (2026-07-12, UNDEPLOYED)**: skill rework + XCOM targeting + responsiveness + two-tier control + status effects slice 1 — deploy then owner feel pass gates the remaining slices (status content mapping, skill board-targeting, turn-order strip). Designs: `docs/plans/2026-07-12-{two-tier-combat-control,status-effects-design}.md`.
2. **Live sign-off lane (`[manual]`)**: play guide `docs/test/neo_seoul_live_qa.md` — combat-batch feel pass · image consistency · track-4 balance 2-loop · real-device mobile pass · Audrey EN retest. Then key-beat hybrid A/B (`GEMINI_MODEL_KEYBEAT`, ~$1.0→$0.5/loop).
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
