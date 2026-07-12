# Agent Brief

Last updated: 2026-07-12

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **2026-07-12 session #13 (combat overhaul marathon; `make check` 1041 green; origin+19; UNDEPLOYED on top of live `mythos-api-00055-46x`)**: a full combat overhaul shipped across the day — skill rework · responsiveness (cinema diet + tap-skip) · two-tier control (shot-forecast chips 🎯%, intent hover lens, 🎯 aimed skills w/ board preview) · **status effects 5종 (burn🔥/corrode🧪/acid💧/freeze❄/shock⚡)** with enemy-weapon riders + 소이/냉각 수류탄 · **board-impact overhaul** (yank shockwave+"밀려남!"+shake, status-apply bursts, grenade detonation VFX, 🕹 betrayal cinema, icon-image status badges) · **hack_control** implemented (was a phantom skill) · lin_yue/su_ah signature split · **sim test kit** (all skills+grenades unlocked). Late session: **combat-completeness batch found by DIRECT local chrome-devtools sim testing** (`abe2d6a`/`84210e3`) — all skill cards (registry had 5/~20), EMP-family damage riders, overload half-splash + per-attacker cinema dedup, EMP/cryo detonation VFX, aim-range tint. Designs `docs/plans/2026-07-12-{two-tier-combat-control,status-effects-design,a2a-relays}.md`; play guide `docs/test/neo_seoul_live_qa.md` A-0/A-1/A-3. CONTINUE HERE: (1) `! git push` (origin+19) → owner `make deploy` (IMAGEN_MODEL auto-pinned) → **owner feel pass A-1/A-3**; (2) ⚠ **resolve the vague "시각적으로 별로임"** — ask which element (status badge icons / aim+blast rings / cinema cards / board look) before touching art; (3) `[manual]` balance tuning (status turn counts/frequency) · two-tier slice 4 (turn-order strip) verdict. Traps: `make deploy` billable+PROD (owner `!`); **fallback (`?fallback=1`) shows STATIC combat by design — open the sim without it to see VFX**; **don't edit the repo while an overnight runner is live** (concurrent-edit NEEDS_HUMAN stops today).

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
