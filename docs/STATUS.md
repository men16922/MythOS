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

Progression Phase 2·3 (2026-06-07):

- Phase 2: 통찰 포인트 적립(run+2/clue+1/win+1), `GET/POST /api/v1/players/{id}/skills` 트리/투자 API, Codex 습득/강화 버튼, tier(requires) 선행 게이팅. 전투 가용 스킬은 archetype base + learned만.
- Phase 3: 깨달음 알림 배너(최근 런 신규 해금 스킬, localStorage 1회 dismiss), 시나리오 간 해금 게이팅(`scenario.unlock`; Neo-Seoul 기본 해금, glass-library는 튜토리얼 완료 시).

Scenario Expansion / 데이터 주도 진행도 (2026-06-07):

- 진행도 grant를 scenario.json 데이터 주도로 전환(`archetypes[].unlock`·`combat.skills[].epiphany`+`combat.epiphanies`). 깨달음은 해금만(자동 습득 제거)→통찰 습득과 일관. 시나리오 교차 오염 + `load_scenario` lru_cache 오염 버그 수정. glass-library를 progression/presentation 패리티(base_skills/archetype_base_skills/epiphanies/ui_copy)로 보강.

Controllable Party Allies (2026-06-07):

- 전투 턴 루프를 controllable-actor stop으로 일반화. `_party.members` 소속 동료는 플레이어가 직접 조작(턴에서 정지, active actor 기준 행동), flag 해금 비파티 동맹은 AI 유지. 패배 판정 = 조작 가능 유닛 전멸. UI는 현재 차례(플레이어/동료) 표시.

Recent verified baseline recorded in docs:

- `make test`: 223 tests, 2 skipped.
- frontend lint/build clean, `tests/playwright/test_e2e_play_checklist.py` green (refactored 서버 기동 포함).
- Redux worker live path: Redis queue -> mflux Redux -> MinIO -> presigned PNG GET 200.
- Combat assets: party 3인 + 적 4종(`enforcer-unit`/`glitch-wraith`/`maintenance-drone`/`sentinel-drone`) `idle/attack/guard/skill/hit` 35종 `RGBA 512x768`, skill icon 5종.

## Active Focus

권위 계획: `docs/NEXT_PLAN.md`.

1. **Combat presentation upgrade**: 기본 지도 섬네일은 유지하고, CombatCinema 전신 action pose 파이프라인을 기준으로 표시 위치/스케일/타이밍 polish.
2. **Progression skills/archetypes**: Phase 1·2·3 완료(아키타입 게이트, base/learned 필터, Codex 통찰 투자 트리, 깨달음 배너, 시나리오 간 해금). 다음 신규 트랙은 Priority 3.
3. ~~**Controllable party allies**~~: 완료(파티원 직접 조작, 비파티 동맹 AI 유지).
4. **Scenario expansion**: glass-library 진행도/프레젠테이션 패리티 완료. 남은 것은 서사(arcs/endings/Story Bible) 깊이 + 전투 아트 확장.

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
