# Project MythOS Status

최종 갱신: 2026-06-07

## Current Baseline

Project MythOS는 로컬 플레이어블 MVP를 넘어 React SPA + FastAPI API + Streamlit demo가 공존하는 상태다. 핵심 runtime은 `RuntimeSessionService` 하나로 공유된다.

구현 완료된 주요 축:

- Neo-Seoul 01 long-form scenario, Story Bible snippet injection, Codex.
- PostgreSQL persistence, MinIO assets, Redis visual queue/worker, OTel/Jaeger.
- Ollama narrative generation with repair/fallback and persisted outcome metrics.
- mflux/FLUX image generation, Redux character identity steering, async worker cleanup.
- Tactical combat engine, encounters, allies, skills/items, enemy intents, combat VFX Phase 1, CombatCinema full-body action pose swap.
- Run History, Meta Progression MVP, Save/Load UX, Ending Resolver.
- FastAPI `/api/v1` REST/WS adapter and Vite React TypeScript SPA.
- Playwright E2E regression gate with updated timeline synchronizations.
- Combat presentation overhaul: basic action signal cards, self-targeting 2-poster layouts, and standalone utility skill cinematic zoom triggers.
- `combatAnim.ts` role/tags skill animation registry wired into `combatEffects.ts`; per-skill icon cut-ins (`skills/<skill_id>.png`) in `CombatCinema`.
- Drone enemies(`maintenance-drone`, `sentinel-drone`) promoted with full combat action sheets — 4 combat-art enemies total.

Recent verified baseline recorded in docs:

- `make test`: 202 tests, 2 skipped.
- Python typecheck, frontend lint/build, `make test-e2e`: clean.
- Redux worker live path: Redis queue -> mflux Redux -> MinIO -> presigned PNG GET 200.
- CombatCinema action sheet path: party 3인 and humanoid enemies(`enforcer-unit`, `glitch-wraith`) have `idle/attack/guard/skill/hit` runtime assets.
- Latest full regression (working tree, 2026-06-07): `make test` 203 tests / 2 skipped OK, combat sprite 35개 모두 `RGBA + 512x768`, skill icon 5종, `make frontend-build` clean.
- 주의: 위 전투 연출/아트 작업 일체는 아직 미커밋 상태(`feat/poc-ux-visual-combat-batch` 작업 트리). 커밋/PR 정리만 남음.

## Active Focus

권위 계획: `docs/NEXT_PLAN.md`.

1. **Combat presentation upgrade**: 기본 지도 섬네일은 유지하고, CombatCinema 전신 action pose 파이프라인을 기준으로 표시 위치/스케일/타이밍 polish.
2. **Progression skills/archetypes**: Ghost-only start, archetype unlock gates, base/learned skill filtering, Codex Skill tab.
3. **Controllable party allies**: party members become player-controllable; friendly non-party allies remain AI-driven.
4. **Scenario expansion**: `glass-library` Story Bible and script depth.

## Open Risks

- txt2img `Flux1` + Redux `Flux1Redux` 동시 적재는 장기 플레이에서 메모리/스왑 모니터가 필요하다.
- `narrative_shards` raw rows are retained even after rollup; future pruning/status migration may be needed if DB size matters.
- Run summaries, meta progression, save slots, narrative metrics are JSONB memory records; heavy querying may justify dedicated tables later.
- Some detailed plan files may have stale status headers. Prefer `STATUS.md`, `NEXT_PLAN.md`, and `PROGRESS_LOG.md` for current truth.
- Combat image 품질은 캐릭터별 편차가 크다. 독립 pose 생성 대신 action sheet 기반 파이프라인을 우선 적용한다.

## Source Of Truth

- Agent entry: `docs/AGENT_BRIEF.md`
- Architecture summary: `docs/DESIGN.md`
- Rolling plan: `docs/NEXT_PLAN.md`
- Latest short log: `docs/PROGRESS_LOG.md`
- Completed milestones: `docs/COMPLETED_SUMMARY.md`
- Decisions: `docs/DECISIONS.md`
- Long logs/design: `docs/archive/`
