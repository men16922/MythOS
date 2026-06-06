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
- Phase 4 `CombatControls` 스킬 아이콘 액션바: data-driven 아이콘 타일 + cost/range 배지 + cooldown 오버레이 + FOCUS 게이팅 + tooltip.
- Drone enemies(`maintenance-drone`, `sentinel-drone`) promoted with full combat action sheets — 4 combat-art enemies total.

Repo hygiene (2026-06-07):

- 정크 제거(`.playwright-mcp`/`.antigravitycli`/`report.md`), historical 문서/완료 plan은 `bin/`으로 이관(활성 plan만 `docs/plans/`).
- `session.py` 1878→1349줄: `narrative_rollup.py`/`loop_scoring.py`/`combat_session_helpers.py`/`constants.py`로 책임 분리(공개 API·import 경로 호환 유지). `scratch/`는 재사용 에셋 파이프라인이라 root 유지.
- 문서 정리: `ADULT_VISUAL_POLICY.md`→`IMAGE_POLICY.md`(이미지 파이프라인 실무 가이드), `bin/reference.md`→`docs/REFERENCES.md`(디자인 레퍼런스).

Recent verified baseline recorded in docs:

- `make test`: 203 tests, 2 skipped (전투 연출/아트/리팩토링 일체 커밋 완료).
- frontend lint/build clean, `tests/playwright/test_e2e_play_checklist.py` green (refactored 서버 기동 포함).
- Redux worker live path: Redis queue -> mflux Redux -> MinIO -> presigned PNG GET 200.
- Combat assets: party 3인 + 적 4종(`enforcer-unit`/`glitch-wraith`/`maintenance-drone`/`sentinel-drone`) `idle/attack/guard/skill/hit` 35종 `RGBA 512x768`, skill icon 5종.

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
- Long logs/design: `bin/docs/archive/`
