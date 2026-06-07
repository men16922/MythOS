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

## Priority 1 — Neo-Seoul Playability Upgrade

상태: `[/]` Phase 1 문서 확정 + Phase 2 데이터 보강 + Phase 3 데이터 기준선 완료. 다음은 combat/progression 수치·보상 적용.

목표: `neo-seoul`을 기술 데모가 아니라 일반 유저가 30-60분 동안 만족스럽게 플레이할 수 있는 주력
시나리오로 끌어올린다. 게임성, 스토리 몰입, 선택 결과, 전투 페이스, 진행도 보상을 한 번의 플레이 경험
기준으로 재정렬한다.

권위 설계: `docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`
라이브 피드백 액션 플랜: `docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`

핵심 기준:

- 첫 5분 안에 목표/위험/세린을 따라갈 이유가 명확해야 한다.
- 매 장면 선택지는 `사람 / 증거 / 안전 / 통제` 중 무엇을 택하는지 드러내야 한다.
- 전투는 서사를 끊지 않고 추적, 작전 실패, 동료 보호, 보상의 결과로 느껴져야 한다.
- Codex/Run History/진행도는 다음 루프를 더 잘하게 만드는 정보와 보상을 줘야 한다.
- 엔딩은 무엇을 구했고, 무엇을 잃었고, 다음 루프에 무엇이 남는지 선명해야 한다.

다음:

- `[x]` Phase 1: Neo-Seoul Golden Path 45분 흐름과 실패/우회 Path 정의.
- `[x]` Phase 1: 플레이 만족도 QA rubric을 `docs/scenarios/01-neo-seoul-connect.md`에 반영.
- `[x]` Phase 2: Story Bible/scenario choice density pass — 세린 불신, 린위에 부채, 카이 미각성, 고 tension 충돌, 증거 우선, 관리자 IX 거울 유혹, 엔딩 Echo 보강. `scenario.json` playability 메타 추가.
- `[/]` Phase 3: combat/progression fun pass — 조우별 학습 목표/서사 트리거/보상 의도 메타, insight 보상 반영 완료. 남은 작업: 난이도 수치, tension/stability 보상 체감 검증.
- `[ ]` Phase 4: objective/choice result/Codex feedback UX 정리.
- `[ ]` Phase 5: Neo-Seoul RC 수동 QA + 자동 검증.

작업 체크리스트:

- `[x]` P0 — `encounter_reward.insight` 처리: 전투 보상 insight를 meta progression 통찰 포인트로 즉시 반영하고, 전투 결과 패널/Codex 설명/테스트를 갱신했다.
- `[/]` P0 — 세션 10장면 이후 진행 멈춤 재현/원인 분리: fallback 12선택 진행은 통과. 초반 멈춤처럼 보이던 원인은 ambient encounter 강제 전투였고, 기본 ambient spawn을 끄고 고위험 상태에서만 켜도록 완화했다. live LLM 장기 세션은 추가 QA 필요.
- `[x]` P0 — BGM Live QA: 사용자 확인 완료(부팅/오프닝/메인/전투 전환 정상).
- `[x]` P0 — 세린 표기 고정: 사용자 확인 완료(`scenario_context` 표기 규칙 적용 후 정상).
- `[/]` P0 — Neo-Seoul 조우 보상 재조정: 첫 전투/야시장 검문/스파이어 봉쇄/폐기층 글리치의 `tension`·`stability`·`insight` 기준값을 갱신했다. 실제 체감은 Live QA 필요.
- `[/]` P1 — 작전 지도 노드 루트화: Step 1~2b-4 완료 — 결정적 절차 생성 DAG(`route_map.py`, anchor 다중 관점+동적 pool) + 라이브 진행/관점·엔딩 누계(`route_runtime.py`) + director 주입·edge=선택지 분기·combat 노드 전투 트리거(`session.py`/`scenario_context.py`) + 노드 그래프 뷰 + anchor 큐레이트 이미지 + 세션 메모리(`session_memory.py`). 노드 보상/관점 effect를 게이지·HP에 통합(`_apply_route_node_reward`, rest/market HP 회복). 동적 노드 title 유형별 다양화(`node_types[].titles`). **트랙 사실상 완료.** `_map` 제거는 보류 — engine이 매 장면 기록하고 encounter_map(좌표)·story_bible(위치)·glass-library 폴백 미니맵이 의존(route_map엔 x,y 없음). 전 시나리오 route_map 전환 후 별도 정리. 설계 `docs/plans/2026-06-07-route-node-procedural-map.md`, 상세 로그 archive.
- `[/]` P1 — Tactical Board 의미 강화: 범례(`TacticalLegend` — 보드에 존재하는 cover/hazard/elevation/intent만 동적 설명) 완료. 남은 것: tile hover/click inspector(좌표/지형/효과/점유/위험), 전투 시작 학습 목표 배너(`encounter.learning_goal` 노출), 보드 확대/반응형.
- `[ ]` P1 — 조우 난이도 튜닝: `patrol_ambush`는 튜토리얼, `sentinel_checkpoint`는 target priority, `wraith_glitch`는 기동/미스터리, `enforcer_standoff`는 후반 armor_pen/방어 timing을 요구하도록 HP/방어/속도/수량을 조정한다.
- `[/]` P1 — 전투 보상 가시화: 전투 종료 패널에 통찰/안정도/추적도/전리품 요약을 추가했다. Run History/Codex 연동은 후속.
- `[/]` P1 — 회복/소모품/전리품 루프 가시화: 전투 후 HP 지속은 기존, route rest/market 노드 진입 시 `_party` HP + stability 회복(`_apply_route_node_reward`/`_heal_party`) 구현. 남은 것: loot 획득·소모품·인벤토리 효과 UI 가시화.
- `[ ]` P2 — 기억의 별자리 재구성: 개요/캐릭터/스킬 트리/파티/인벤토리/런 히스토리 탭으로 분리하고 개발 로그는 일반 플레이 메뉴에서 분리한다.
- `[ ]` P2 — 아키타입 의미 강화: 해금 조건을 명시 milestone으로 제한하고, 오프닝/시작 위치/기본 스킬/시작 아이템/NPC 반응을 다르게 만든다.
- `[ ]` P2 — objective 피드백 정리: 현재 장면 objective가 Golden Path의 현재 막 목표와 어긋나지 않게 노출하고, 막 전환 gate가 충족됐을 때만 다음 단계로 넘어가게 점검한다.
- `[ ]` P2 — 선택 결과 요약 강화: 선택 후 `stability/tension`, 관계, flag성 사건, Codex/Shard 중 무엇이 변했는지 장면 기록에서 읽히게 한다.
- `[ ]` P2 — Codex Skill UX 정리: 해금됨/습득 가능/통찰 부족/선행 필요 상태가 첫 플레이어도 이해할 수 있게 문구와 버튼 상태를 점검한다.
- `[/]` P2 — AI GM 진행 강화: route-node 트랙으로 상당 부분 충족 — 노드/관점/crosses/향하는 결말을 컨텍스트에 주입(`_route_director_notes`), 세션 메모리(beat 원장+롤링 시놉시스+직전 장면 창)로 장면 반복 억제. 남은 것은 막 gate 기반 필수 비트 강제와 visual prompt에 현재 노드/유니크 비트 주입.
- `[ ]` P3 — Neo-Seoul Golden Path 검증: 자동 회귀는 별도 테스트로 확인하고, 실제 플레이 감각은 `docs/neo_seoul_live_qa.md`에 기록한다.
- `[ ]` P3 — 완료 후 문서 정리: 결과는 `PROGRESS_LOG.md`에 짧게 남기고, 긴 테스트 기록은 archive로 보낸다.

## Priority 2 — Combat Presentation Upgrade

상태: `[x]` 현재 플레이 기준 완료 처리. 전투 연출/스킬 액션바/오디오/결과 이미지/Live QA까지 1차 목표 충족.

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
- [x] Live QA 완료(사용자 확인): 전투 연출, 파티 조작, 미드런 깨달음, `glass-library` 시나리오/자산 점검.

다음:

- `[x]` 다음 신규 기능 우선순위는 Priority 2 — Progression Skills / Archetypes.
- `[x]` 낮은 우선순위 후속 polish: role/tags 별 모션 다양화(defense 동료 부여 펄스, melee burst 충격파), reduced-motion 세부 대응(전역 CSS 미디어쿼리 + 타자기/켄번/글리치 JS 게이팅).

## Priority 3 — Progression Skills / Archetypes

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
- `[x]` 후속 polish: 깨달음 인-루프 즉시 연출 (완료 - App.tsx 내 슬라이드인 알림 배너 연출 및 progression.py 미드런 평가 연동 완료), [ ] 통찰 적립/비용 밸런스 실측 조정.

## Priority 4 — Controllable Party Allies

상태: `[x]` 구현 및 폴리싱 완료. 파티원 직접 조작 / 비파티 동맹 AI 유지 및 턴 지시기 피드백 추가.

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

- `[x]` active actor portrait/보드 하이라이트 강화, 파티원 이동 드래그 UX 수동 QA (CombatRoster 펄스 테두리 효과 및 combatCanvas 민트색 지시 화살표 추가 완료).

## Hold — Scenario Expansion / Glass Library

상태: `[~]` 진행도/프레젠테이션 패리티, 데이터 주도 진행도 및 glass-library 서사/아트 자산 보강 완료. 추가 확장은 Neo-Seoul 플레이 만족도 개선이 끝날 때까지 홀드.

목표: `glass-library`를 Neo-Seoul 이후 멀티 시나리오 검증 대상으로 확장한다.

완료:

- `[x]` 진행도 grant를 scenario.json 데이터 주도로 전환(`archetypes[].unlock`·`combat.skills[].epiphany`+`combat.epiphanies`). 시나리오 교차 오염 버그 + lru_cache 오염 버그 수정.
- `[x]` `glass-library/scenario.json` combat pool 보강: archetype `base_skills`/`unlock`, `archetype_base_skills`, 스킬 tier/epiphany/requires/insight 비용, `combat.epiphanies`, `ui_copy`.
- `[x]` multi-scenario 진행도 스코프 분리 + onboarding/E2E 회귀 확인.

다음:

- `[x]` `glass-library` Story Bible snippets를 phase/location/flags 기준으로 확장(10→17 entries): 무음 열람실, 반납되지 않은 복도, 금서 색인, 이오 신뢰 분기, 검열 전투, 최초 기록 보관고, 엔딩 잔향.
- `[ ]` `glass-library` main_arcs/endings 데이터 자체의 분기·보상 메타 확장(현재 main_arcs 4 / endings 4).
- `[ ]` glass-library 전투 아트/스킬 깊이(현재 스킬 5종, 적 4종; 신규 전투 action sheet는 후속).

## Maintenance

- `[ ]` 장기 플레이에서 Flux1 + Flux1Redux 동시 적재 메모리 모니터.
- `[ ]` 필요 시 stale dated plan status header 정리.
- `[ ]` 완료 milestone은 current docs에 길게 남기지 않고 `COMPLETED_SUMMARY.md`로 압축.
- `[ ]` 프론트엔드 god-component 분해(App.tsx 1199·CombatCinema 1066): custom hook/모듈 추출. E2E 민감하므로 live QA 동반 점진 진행.
- `[ ]` `bin/` 보관소 검토 후 불필요 항목 삭제(historical archive/plans/scratch).
