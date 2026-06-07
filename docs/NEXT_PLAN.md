# Project MythOS Next Plan

최종 갱신: 2026-06-07

이 파일은 앞으로 할 일만 유지하는 rolling plan이다. 완료된 긴 체크리스트는
`docs/COMPLETED_SUMMARY.md`, 상세 로그는 `bin/docs/archive/progress-2026-06.md`, 개별 설계는
`docs/plans/`를 본다.

## Rules

- 작업 시작 전 `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> 이 파일 순서로 읽는다.
- 큰 작업은 `docs/plans/YYYY-MM-DD-<topic>.md`에 설계 스냅샷을 남긴다.
- 완료 후 `docs/PROGRESS_LOG.md`에는 최신 요약만, 긴 내용은 archive로 이동한다.
- 되돌리기 어려운 선택은 `docs/DECISIONS.md`에 기록한다.

## Priority 1 — Combat Presentation Upgrade

상태: `[x]` 현재 플레이 기준 완료 처리. 전투 연출/스킬 액션바/오디오/결과 이미지까지 1차 목표 충족.

목표: 현재 추상 무기 컷인 중심 전투를 **캐릭터 아트 + 보드 스프라이트 + role/tags 기반 스킬 애니메이션 + 아이콘 액션바**로 개편한다. 전술 그리드 엔진은 유지하고 presentation/UI/serialization만 확장한다.

권위 설계: `docs/plans/2026-06-06-combat-darkest-dungeon-presentation.md`
아트 파이프라인: `docs/plans/2026-06-07-combat-portrait-pipeline.md`

완료:

- `[x]` 전투 빈 화면 수정: combat snapshot에 `log/elevations/covers/hazards` 직렬화.
- `[x]` `available.skills`에 `role/tags/name/cost/range` 노출.
- `[x]` 전투 VFX Phase 1: snapshot diff 기반 이동/데미지/힐/사망/스킬 커넥터, SFX 동기.
- `[x]` Neo-Seoul combat pose assets 1차: idle/attack/skill/hit 이미지 생성, `combat_images` 직렬화, 전투 지도 기본 섬네일 유지 + action frame pose swap.
- `[x]` `CombatCinema` 풀바디 포즈 전환: idle 시작 후 attack/guard/skill/hit pose 교체, 방어 로그 시네마 큐 포함.
- `[x]` Party 3인 기준 검증: Se-rin/player-noise/Kai 배경 없는 전신 idle + 동일 캐릭터 action sheet(`attack/guard/skill/hit`) 생성/분할/실사용 교체.
- `[x]` Humanoid enemy 2종 검증: `enforcer-unit`/`glitch-wraith` 전신 idle + 동일 캐릭터 action sheet(`attack/guard/skill/hit`) 생성/분할/실사용 교체.
- `[x]` Drone enemy 2종 추가: `maintenance-drone`/`sentinel-drone` 전투 action sheet 생성/분할/scenario 배선 (combat-art 적 4종).
- `[x]` Phase 3 1차: `combatAnim.ts` role/tags 스킬 애니메이션 레지스트리 구현 + `combatEffects.ts` 배선.
- `[x]` 스킬 아이콘 컷인: `resources/neo-seoul/skills/<skill_id>.png` 5종 생성 + `CombatCinema` 표시.

완료(추가):

- `[x]` Phase 4: `CombatControls` 스킬 아이콘 액션바 — `available.skills`의 name/role/tags/cost/range/cooldown 기반 data-driven 아이콘 타일, cost/range 배지, cooldown 오버레이, FOCUS 부족 비활성, role 색상, tooltip. 스킬명 텍스트 유지로 E2E 셀렉터 호환.
- `[x]` frontend lint 부채 정리: `CombatLogDetail`에 target_id/skill_id/skill 추가해 `combatEffects.ts` any 캐스트 제거, `CombatCinema` setState-in-effect를 render-time 조정 패턴으로 교체.
- `[x]` CombatCinema skill SFX cues: windup/impact 타임라인 cue, MusicGen 기반 스킬별 SFX 5종, 중복 보드 타격음 억제, E2E SFX 리소스 검증.
- `[x]` 전투 종료 결과 이미지 패널: 승리/도주/패배 종료 시 combat art 합성 결과 이미지 + 기존 continue/return 액션 유지.
- `[x]` BGM 재생 복구: 실패/차단 상태가 같은 경로 재시도를 막지 않도록 retry-safe 처리, E2E에서 실제 BGM wav 요청 검증.
- `[x]` 전투 SFX 타격감 강화: MusicGen 전투 impact 모드로 attack/defend/move/glitch 및 스킬 SFX 재생성, 프론트 cue 볼륨 보강.
- `[x]` `docs/play-checklist.md` 전투 연출 수동 QA 완료 처리.

다음:

- `[x]` 다음 신규 기능 우선순위는 Priority 2 — Progression Skills / Archetypes.
- `[x]` 낮은 우선순위 후속 polish: role/tags 별 모션 다양화(defense 동료 부여 펄스, melee burst 충격파), reduced-motion 세부 대응(전역 CSS 미디어쿼리 + 타자기/켄번/글리치 JS 게이팅).

## Priority 2 — Progression Skills / Archetypes

상태: `[x]` Phase 1·2·3 완료. 후속 polish(깨달음 인-루프 즉시 연출, 통찰 밸런스 곡선)는 실플레이 로그 후 조정.

목표: 루프형 보상 구조를 강화한다. 처음엔 Ghost만 선택 가능하고, 스킬은 깨달음 이벤트로 unlock 가능 상태가 된 뒤 Codex Skill 탭에서 통찰 포인트로 습득/강화한다.

권위 설계: `docs/plans/2026-06-06-progression-skills-archetypes.md`

다음:

- `[x]` Phase 1: `MetaProgression`에 `unlocked_archetypes/unlocked_skills/learned_skills/skill_ranks/insight_points/epiphanies_seen` 추가.
- `[x]` Onboarding archetype gate 표시: Ghost 기본 선택, 잠긴 아키타입 disabled + unlock hint/base skills 표시.
- `[x]` `CombatService`에서 전체 스킬 부여 대신 archetype base + learned skills만 사용.
- `[x]` Codex Skill 트리 read-only 표시: 스킬 상태(learned/unlocked/locked), rank, role/tier/range/cooldown/tags/hint.
- `[x]` 회귀 테스트: progression/combat/API 단위 테스트 갱신.
- `[x]` Playwright E2E archetype 선택/전투 흐름 최종 재확인.

후속:

- `[x]` Phase 2: insight points 적립 규칙 확정(run+2/clue+1/win+1), learn/rank-up endpoints(`GET/POST /players/{id}/skills`), Codex 습득/강화 버튼, tier(requires) gating.
- `[x]` Phase 3: 깨달음 알림 배너(최근 런 신규 해금 스킬), 시나리오 간 해금 게이팅(`scenario.unlock`, 튜토리얼=Neo-Seoul 기본 해금, glass-library는 튜토리얼 완료 시 해금).
- `[ ]` 후속 polish: 깨달음 인-루프 즉시 연출(현재는 런 종료 후 메인 배너), 통찰 적립/비용 밸런스 실측 조정.

## Priority 3 — Controllable Party Allies

상태: `[x]` 구현 완료. 파티원 직접 조작 / 비파티 동맹 AI 유지.

목표: `_party.members` 소속 동료는 플레이어가 직접 조작하고, 우호적 비파티 동맹은 기존 AI를 유지한다.

권위 설계: `docs/plans/2026-06-06-party-controllable-allies.md`

완료:

- `[x]` `Combatant.controllable`/`is_controllable`, `CombatState.active_actor()`/`living_controllables()` 추가.
- `[x]` engine turn loop를 controllable actor stop으로 일반화(`_run_opening`/`_run_until_controllable`).
- `[x]` available actions/movement/attack/skill/defend을 active actor 기준으로 범용화(도주는 PLAYER만).
- `[x]` party member만 `controllable=True`로 생성(`combat_service._build_allies`).
- `[x]` React UI가 active actor name/skills/focus를 반영(`CombatControls` 차례 표시, 파티원 도주 버튼 숨김).
- `[x]` tests: single-player regression, controllable ally wait, AI ally auto-turn.

후속:

- `[ ]` active actor portrait/보드 하이라이트 강화, 파티원 이동 드래그 UX 수동 QA(현재 player drag 흐름 재사용).

## Priority 4 — Scenario Expansion

상태: `[/]` 진행도/프레젠테이션 패리티 + 데이터 주도 진행도 완료. Story Bible 깊이는 후속.

목표: `glass-library`를 Neo-Seoul 이후 멀티 시나리오 검증 대상으로 확장한다.

완료:

- `[x]` 진행도 grant를 scenario.json 데이터 주도로 전환(`archetypes[].unlock`·`combat.skills[].epiphany`+`combat.epiphanies`). 시나리오 교차 오염 버그 + lru_cache 오염 버그 수정.
- `[x]` `glass-library/scenario.json` combat pool 보강: archetype `base_skills`/`unlock`, `archetype_base_skills`, 스킬 tier/epiphany/requires/insight 비용, `combat.epiphanies`, `ui_copy`.
- `[x]` multi-scenario 진행도 스코프 분리 + onboarding/E2E 회귀 확인.

다음:

- `[ ]` `glass-library` arcs/endings 서사 깊이 확장(현재 main_arcs 4 / endings 4), Story Bible snippets를 phase/location/flags 기준으로 확장.
- `[ ]` glass-library 전투 아트/스킬 깊이(현재 스킬 3종, 신규 스킬·적 아트 후속).

## Maintenance

- `[ ]` 장기 플레이에서 Flux1 + Flux1Redux 동시 적재 메모리 모니터.
- `[ ]` 필요 시 stale dated plan status header 정리.
- `[ ]` 완료 milestone은 current docs에 길게 남기지 않고 `COMPLETED_SUMMARY.md`로 압축.
- `[ ]` 프론트엔드 god-component 분해(App.tsx 1199·CombatCinema 1066): custom hook/모듈 추출. E2E 민감하므로 live QA 동반 점진 진행.
- `[ ]` `bin/` 보관소 검토 후 불필요 항목 삭제(historical archive/plans/scratch).
