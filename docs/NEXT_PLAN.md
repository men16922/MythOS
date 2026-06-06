# Project MythOS Next Plan

최종 갱신: 2026-06-07

이 파일은 앞으로 할 일만 유지하는 rolling plan이다. 완료된 긴 체크리스트는
`docs/COMPLETED_SUMMARY.md`, 상세 로그는 `docs/archive/progress-2026-06.md`, 개별 설계는
`docs/plans/`를 본다.

## Rules

- 작업 시작 전 `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> 이 파일 순서로 읽는다.
- 큰 작업은 `docs/plans/YYYY-MM-DD-<topic>.md`에 설계 스냅샷을 남긴다.
- 완료 후 `docs/PROGRESS_LOG.md`에는 최신 요약만, 긴 내용은 archive로 이동한다.
- 되돌리기 어려운 선택은 `docs/DECISIONS.md`에 기록한다.

## Priority 1 — Combat Presentation Upgrade

상태: `[/]` Phase 0 완료, action pose 배선 1차 완료, party 3인 + humanoid enemy action sheet 파이프라인 검증 완료.

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

다음:

- `[ ]` Phase 2: action art 표시 위치/스케일/지속시간/가독성 polish (live QA 필요).
- `[ ]` Phase 3 마감: role/tags 별 고유 모션 다양화 + reduced-motion 대응.
- `[ ]` Phase 5: E2E/live QA 회귀 + 전체 `make test` 통과 후 커밋/PR.

## Priority 2 — Progression Skills / Archetypes

상태: `[ ]` 설계 완료, 구현 미착수.

목표: 루프형 보상 구조를 강화한다. 처음엔 Ghost만 선택 가능하고, 스킬은 깨달음 이벤트로 unlock 가능 상태가 된 뒤 Codex Skill 탭에서 통찰 포인트로 습득/강화한다.

권위 설계: `docs/plans/2026-06-06-progression-skills-archetypes.md`

다음:

- `[ ]` Phase 1: `MetaProgression`에 `unlocked_archetypes/unlocked_skills/learned_skills` 추가.
- `[ ]` Onboarding archetype/scenario gate 표시.
- `[ ]` `CombatService`에서 전체 스킬 부여 대신 base/learned skills만 사용.
- `[ ]` Codex Skill 탭 read-only 표시.
- `[ ]` 회귀 테스트 및 E2E archetype 선택 흐름 갱신.

후속:

- `[ ]` Phase 2: insight points, learn/rank-up endpoints, tree gating.
- `[ ]` Phase 3: epiphany narrative presentation and cross-scenario unlock UX.

## Priority 3 — Controllable Party Allies

상태: `[ ]` 설계 승인 대기/구현 미착수.

목표: `_party.members` 소속 동료는 플레이어가 직접 조작하고, 우호적 비파티 동맹은 기존 AI를 유지한다.

권위 설계: `docs/plans/2026-06-06-party-controllable-allies.md`

다음:

- `[ ]` `Combatant.controllable` / `active_actor` / `living_controllables` 추가.
- `[ ]` engine turn loop를 player-only stop에서 controllable actor stop으로 일반화.
- `[ ]` available actions, movement, attack, skill, item execution을 active actor 기준으로 범용화.
- `[ ]` party member만 `controllable=True`로 생성.
- `[ ]` React UI가 active actor name/skills/focus/portrait를 반영.
- `[ ]` tests: single-player regression, controllable ally wait, AI ally auto-turn.

## Priority 4 — Scenario Expansion

상태: `[ ]` 후속.

목표: `glass-library`를 Neo-Seoul 이후 멀티 시나리오 검증 대상으로 확장한다.

다음:

- `[ ]` `resources/glass-library/scenario.json` arcs/endings/combat pool 보강.
- `[ ]` Story Bible snippets를 phase/location/flags 기준으로 확장.
- `[ ]` Neo-Seoul과 multi-scenario onboarding/load/E2E 회귀 확인.

## Maintenance

- `[ ]` 장기 플레이에서 Flux1 + Flux1Redux 동시 적재 메모리 모니터.
- `[ ]` 필요 시 stale dated plan status header 정리.
- `[ ]` 완료 milestone은 current docs에 길게 남기지 않고 `COMPLETED_SUMMARY.md`로 압축.
