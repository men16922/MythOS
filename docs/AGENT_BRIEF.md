# Agent Brief

Last updated: 2026-07-12

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **2026-07-12 session #16 CBT-day (`make check` 1060; DEPLOYED `mythos-api-00056-z77` = sessions #14-#15 live; castability fix `d70ff86` + round-2 promo UNDEPLOYED-but-pushed-pending)**: CBT round 2 opens today — CONTINUE HERE: (1) **codex art batch** on worktree `art/codex-0713` (14 assets: backdrops×4 · flat glyphs×7 · floor/cover_full · grenade icons×2; generation was IN FLIGHT at handoff — check `git -C ../MythOS-loop-codex log`, image-judge review, cherry-pick, rebuild bundle, make check, redeploy); (2) owner publishes `docs/cbt/CBT_RECRUIT_POST(.ko).md` round-2 posts + feel pass on 00056 (`docs/test/neo_seoul_live_qa.md` 갱신본); (3) cap survey said no DB cleanup needed (report in PROGRESS_LOG). Prior context (session #15): owner-requested batch shipped — **status stacking** (reapply ACCUMULATES turns, cap `STATUS_EFFECT_TURNS_CAP=6` tunable; stun included; multi-status tick/expire coherence + upkeep-DoT-death fix) · **collision slam** (밀기/당기기 into board edge / full-cover structure / another unit = flat 1d4 armor-bypass + amber burst + 💥 충돌! float; full cover now blocks FORCED movement only; 🎯 preview mirrors it) · **냉각 수류탄 1d4 blast** · **BGM env** (`DEFAULT_BGM_ON` → open `/api/v1/client-config`, hostname heuristic + opening force-start removed; `make api`/`api-cloud` export false) · **codex 병렬 레인** (린위에 victory-lineup `.slice(0,3)` 절단 수정 + loot pill KO/EN 표시명 11종, cherry-picked `0066319`/`89d05d8`). 자기 반발 컷인은 HEAD에서 정상 발화 확인(시뮬) — "안 보임"의 실체는 0칸 밀림(이제 슬램으로 가시화) + 스테일 탭 추정. Evidence `outputs/qa-slam/`. CONTINUE HERE: (1) push done (owner, 07-12 night) → owner `make deploy` → **owner feel pass** on the refreshed guide (`docs/test/neo_seoul_live_qa.md` — 17 confirmed items dropped, slam/cryo/stacking checks added); (2) verdict gates **agy art seeds** (backdrop plates ×4 · flat badge glyphs ×7 · floor tile · cover_full prop · 소이/냉각 수류탄 아이콘); (3) **한 시스템 침투 ◆4 > max FOCUS 3 = uncastable — owner balance call** (cost 3 vs max_focus 4); (4) `[manual]` 밸런스 튜닝 (상태 부여 턴수/빈도 · 슬램/스택 cap · 2-티어 slice 4). Traps: `make deploy` billable+PROD (owner `!`); fallback = static combat by design; local API left running with the new bundle; don't edit the repo while an overnight runner is live.

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

1. **Combat batch #14-#15 (2026-07-12, UNDEPLOYED, origin+11)**: visual overhaul V1-V6 + status stacking/slam/cryo/BGM-env/lineup·loot fixes — deploy then owner feel pass (A-1/A-3/A-4) gates the agy art seeds. Open balance call: 한 시스템 침투 ◆4 vs max FOCUS 3. Design: `docs/plans/2026-07-12-combat-visual-overhaul.md`.
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
