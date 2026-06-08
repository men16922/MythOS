# Project MythOS Next Plan

최종 갱신: 2026-06-07

이 파일은 앞으로 할 일(열린 작업)만 유지하는 rolling plan이다. 완료 트랙은
`docs/COMPLETED_SUMMARY.md`, 상세 로그는 `bin/docs/archive/progress-2026-06.md`, 개별 설계는
`docs/plans/`를 본다.

## Rules

- 작업 시작 전 `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> 이 파일 순서로 읽는다.
- 큰 작업은 `docs/plans/YYYY-MM-DD-<topic>.md`에 설계 스냅샷을 남긴다.
- 완료 후 `docs/PROGRESS_LOG.md`에는 최신 요약만, 완료 트랙은 `COMPLETED_SUMMARY.md`로 압축한다.
- 되돌리기 어려운 선택은 `docs/DECISIONS.md`에 기록한다.

## Priority 1 — Neo-Seoul Playability Upgrade

상태: `[/]` 진행 중(최우선 트랙).

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

완료(요약): Phase 1(Golden Path 45분 + 실패/우회 Path + QA rubric → `docs/scenarios/01-neo-seoul-connect.md`),
Phase 2(Story Bible/choice density + `scenario.json` playability 메타), Phase 3 데이터 기준선(조우 learning_goal/reward_intent).
P0(`encounter_reward.insight` meta 반영, 전투 결과 패널 보상 표시, 초반 forced ambient combat 완화, BGM/세린 표기 Live QA, 조우 보상 기준값 갱신).
P1 작전 지도 route-node화 + 세션 메모리(→ COMPLETED_SUMMARY M39), Tactical Board 범례/타일 인스펙터/학습 목표 배너, 조우 난이도 튜닝(per-spawn `overrides` + 학습 목표별 수치).

열린 작업:

- `[/]` P0 — live LLM 장기 세션 QA: fallback 12선택 + 실제 gemma4 14턴(in-process 드라이버, 2026-06-08) 통과.
  기술 파이프라인 양호(파싱 예외 0·선택지 상존·전투 후 재개·멈춤 없음). **F1 반복 완화 적용**(시놉시스
  반복 억제 지침 강화 → 14턴 재검증서 반복 0·이야기 전진 확인). 남은 것: **F2 전투 빈도**(빈도/연속 튜닝
  검토 — 변동성 있어 추가 관찰), phase explore 정체 점검. 주관 항목은 사람 플레이(`docs/neo_seoul_live_qa.md`).
- `[ ]` P1 — Tactical Board 잔여: 보드 확대/반응형(zoom/pan), 터치 환경 click 핀 고정(인스펙터는 현재 desktop hover 기반).
- `[/]` P1 — 전투 보상 가시화: 종료 패널 통찰/안정/추적/전리품 요약 완료. 남은 것: Run History/Codex 연동.
- `[/]` P1 — 회복/소모품/전리품 루프: route rest/market HP+stability 회복 완료. 남은 것: loot 획득·소모품·인벤토리 효과 UI 가시화.
- `[/]` P2 — AI GM 진행 강화: route-node 주입(`_route_director_notes`)+세션 메모리로 반복 억제 완료. 남은 것: 막 gate 기반 필수 비트 강제, visual prompt에 현재 노드/유니크 비트 주입.
- `[ ]` P2 — 기억의 별자리 재구성: 개요/캐릭터/스킬 트리/파티/인벤토리/런 히스토리 탭 분리, 개발 로그를 일반 플레이 메뉴에서 분리.
- `[ ]` P2 — 아키타입 의미 강화: 해금 조건을 명시 milestone으로 제한, 오프닝/시작 위치/기본 스킬/시작 아이템/NPC 반응 차별화.
- `[ ]` P2 — objective 피드백 정리: 현재 장면 objective를 Golden Path 현재 막 목표와 정합, 막 전환 gate 충족 시에만 다음 단계 진행.
- `[ ]` P2 — 선택 결과 요약 강화: 선택 후 `stability/tension`·관계·flag성 사건·Codex/Shard 변화가 장면 기록에서 읽히게.
- `[ ]` P2 — Codex Skill UX 정리: 해금됨/습득 가능/통찰 부족/선행 필요 상태를 첫 플레이어도 이해하도록 문구·버튼 상태 점검.
- `[ ]` Phase 4 — objective/choice result/Codex feedback UX 정리(위 P2 묶음의 통합 마감).
- `[ ]` Phase 5 — Neo-Seoul RC: 수동 QA(`docs/neo_seoul_live_qa.md`) + 자동 회귀, 결과는 `PROGRESS_LOG.md` 짧게/긴 기록은 archive.

## 완료 트랙 (참조)

요약은 `docs/COMPLETED_SUMMARY.md`, 설계는 `docs/plans/`를 본다. 후속은 모두 Priority 1 트랙에서 다룬다.

- Combat Presentation Upgrade — `[x]` 완료(M35): 전신 action pose·스킬 애니메이션 레지스트리·아이콘 액션바·결과 이미지·BGM/SFX·모션 다양화·reduced-motion·Live QA.
- Progression Skills / Archetypes — `[x]` 완료(M36): 아키타입 게이트, base/learned 필터, Codex 통찰 투자 트리 + learn/rank-up API, 깨달음 배너, 시나리오 간 해금.
- Controllable Party Allies — `[x]` 완료(M37): 파티원 직접 조작, 비파티 동맹 AI 유지, 턴 지시기.
- Data-driven Progression Grant — `[x]` 완료(M38): `scenario.json` 데이터 주도 unlock/epiphany, glass-library 패리티, 교차 오염/lru_cache 버그 픽스.
- Procedural Route Map & Session Memory — `[x]` 완료(M39): 결정적 DAG + 다중 관점 anchor, 라이브 진행/엔딩 누계, 세션 메모리.

## Hold — Scenario Expansion / Glass Library

상태: `[~]` 진행도/프레젠테이션 패리티 + Story Bible 17 entries 완료(M38). 추가 확장은 Neo-Seoul 만족도 개선 이후로 홀드.

- `[ ]` `glass-library` main_arcs/endings 분기·보상 메타 확장(현재 main_arcs 4 / endings 4).
- `[ ]` glass-library 전투 아트/스킬 깊이(현재 스킬 5종, 적 4종; 신규 combat action sheet는 후속).

## Maintenance

- `[ ]` 장기 플레이에서 Flux1 + Flux1Redux 동시 적재 메모리 모니터.
- `[ ]` `_map` 제거 정리(route-node 트랙 완료 후 보류; engine 매 장면 기록 + encounter_map 좌표·story_bible 위치·glass-library 폴백 미니맵 의존). 전 시나리오 route_map 전환 후 진행.
- `[ ]` 필요 시 stale dated plan status header 정리.
- `[ ]` 프론트엔드 god-component 분해(App.tsx·CombatCinema): custom hook/모듈 추출. E2E 민감하므로 live QA 동반 점진 진행.
- `[ ]` `bin/` 보관소 검토 후 불필요 항목 삭제(historical archive/plans/scratch).
