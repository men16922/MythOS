# Project MythOS Design

최종 갱신: 2026-07-19

이 파일은 현재 아키텍처를 빠르게 파악하기 위한 압축본이다. 장문 설계 원문은
`bin/docs/archive/DESIGN_FULL_2026-06-06.md`, 실제 DB 스키마 권위는 `migrations/`를 따른다.

## System Shape

Project MythOS는 Python 3.11+ 로컬 런타임 기반 1인용 SF 루프형 TRPG/CRPG다.

- Core orchestration: `src/mythos_runtime/session.py`의 `RuntimeSessionService` (장기기억 롤업/루프 점수/전투 글루 헬퍼는 `narrative_rollup.py`/`loop_scoring.py`/`combat_session_helpers.py`로 분리, 공유 상수는 `constants.py`).
- Domain: `src/mythos_core`.
- Memory/persistence: `src/mythos_memory` + PostgreSQL.
- Narrative: `src/mythos_narrative` + local Ollama / cloud Vertex Gemini.
- Loop/state validation: `src/mythos_loop`.
- Tactical combat: `src/mythos_combat` + `src/mythos_runtime/combat_service.py`.
- API: `src/mythos_api` FastAPI `/api/v1` REST + WebSocket.
- React UI: `src/mythos_ui` Vite + React + TypeScript, FastAPI 루트에서 서빙.
- Streamlit demo: `streamlit_app.py`, 같은 runtime service를 호출.
- Visual generation: `src/mythos_runtime/visual_*` — 요청 내 동기 생성 (로컬 mflux/FLUX 또는 Vertex Gemini Image), MinIO/GCS asset storage. Redis queue/worker는 2026-07-04 제거됐다.

## Runtime Boundaries

`RuntimeSessionService`가 player/loop/scene/combat/save/archive orchestration의 권위 계층이다.
CLI, Streamlit, FastAPI, React UI에 같은 로직을 복제하지 않는다.

Authoritative state는 PostgreSQL에 저장한다. UI state는 view/cache 수준만 보관한다.
이미지 파일은 MinIO 또는 로컬 output 경로에 저장하고, DB에는 asset metadata를 기록한다.

## Local Stack

- Docker: PostgreSQL, MinIO, OpenTelemetry Collector, Jaeger, Adminer.
- Host process: Ollama, API/Streamlit, mflux/FLUX(요청 내 동기 생성).
- 권장 실행: `make dev-up` / 정리: `make dev-down`.
- 개별 실행: `make infra-up`, `make db-migrate`, `make api`, `make streamlit`.

## Data Model Summary

주요 persistent concepts:

- `PlayerProfile`: 플레이어 id, display name, archetype, stats.
- `LoopState`: phase, stability, tension, flags, scenario state, combat state.
- `Scene`: narration, choices, visual brief, turn metadata.
- `Event`: player/system/combat events.
- `PlayerMemory`: save slots, meta progression, causality summaries.
- `WorldMemory`: run summaries, narrative metrics, campaign memory.
- `AssetRecord`: generated/static asset metadata and storage URI.

JSONB를 적극 사용한다. 조회/필터 요구가 커지는 데이터만 별도 migration 후보로 본다.

## Narrative Flow

1. Player starts/resumes a loop.
2. Runtime builds `NarrativeContext` from scenario, state, recent events, story bible snippets, memories.
3. `NarrativeDirector` calls local Ollama or cloud Vertex Gemini, with a deterministic fallback.
4. Parser/validator repairs or rejects malformed output.
5. Runtime commits scene, event, memory/metric changes.
6. Visual generation runs synchronously in-request and stores the resulting asset metadata.

Long-session control:

- Old `narrative_shards` are rolled up into `PlayerMemory(kind="causality_summary")`.
- Narrative generation outcomes are aggregated in `WorldMemory(kind="narrative_metrics")`.

## Combat Flow

Combat is engine-authoritative, not LLM-authoritative.

- Scenario data defines weapons, skills, allies, bestiary, loot, encounters.
- `CombatService.begin` builds combatants from scenario + loop state.
- `CombatEngine` resolves initiative, movement, range, hit, damage, crit, skills, items, AI, flee, outcome.
- React renders the tactical board with canvas, drag/drop movement, rosters, controls, combat log, visual effects.
- Streamlit combat uses a localhost JSON bridge to keep the iframe mounted during per-turn actions.

Current combat surfaces:

- `available.skills` exposes `role/tags/name/cost/range` for data-driven UI/effects.
- Direct party control, enemy intents, skills/items, status effects, combat cinema, rewards, and companion equipment are engine-backed.
- The React tactical board owns touch/desktop layouts, portrait sprites, image action/skill controls, and rendered combat evidence.

## Scenario / Story Bible

Scenario runtime data lives under `resources/<scenario>/scenario.json`.
Story bible snippets live under `resources/<scenario>/story_bible/bible.json`.

Principles:

- Scenario-owned directives define world-specific GM policy; the engine assembles them with structured scenario state.
- Story bible is selected by phase/location/flags/NPC context; never dump the whole bible every turn.
- Neo-Seoul 01 is the primary content target.
- `glass-library` is the sample multi-scenario expansion target.

## Verification

Use the blast-radius command matrix in `../AGENTS.md`; runtime-flow changes require at least `make smoke-local`,
and persistence/MinIO changes require `make smoke` or `make test-db`.

## Design Decisions

Current decision source: `docs/DECISIONS.md`.

Important standing decisions:

- `RuntimeSessionService` is the orchestration boundary.
- Scenario-specific authored prompt directives belong in `resources/<scenario>/directives/*.md`; structured scenario data stays in `scenario.json`.
- Combat state/result authority belongs to `mythos_combat`, not the LLM.
- mflux is the default local image backend; Redux is used for character identity steering.
- Current docs should stay short; long records move to `bin/docs/archive/`.
