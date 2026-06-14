# Project MythOS Next Plan

최종 갱신: 2026-06-14

이 파일은 앞으로 할 일(열린 작업)만 유지하는 rolling plan이다. 완료 트랙은
`docs/COMPLETED_SUMMARY.md`, 상세 로그는 `bin/docs/archive/progress-2026-06.md`, 개별 설계는
`docs/plans/`를 본다.

## 엔지니어링 정비 트랙 — WS0-3 완료 (active focus 는 P1 Neo-Seoul 로 복귀)

`[x]` WS0 연속성(Resume Pointer)·WS1/2 바이블↔해석(`docs/engineering/` + `mythos/`)·진입점 슬림화·WS3 로깅(`status.tsv`)
+tmux 대시보드 완료. 권위 플랜 `docs/plans/2026-06-14-engineering-plan.md`. 결정은 `DECISIONS.md`(engineering/ 디렉터리·바이블↔해석·연구 개념만 흡수).
- `[ ]` **WS4(plan-only)**: agy 이미지 초안 → codex 적합도 검토 → NEXT_PLAN 콘텐츠 항목 추가 → codex 최종 이미지 생성 파이프라인. 구현은 다음 기회.

## Rules

- 작업 시작 전 `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> 이 파일 순서로 읽는다.
- 큰 작업은 `docs/plans/YYYY-MM-DD-<topic>.md`에 설계 스냅샷을 남긴다.
- 완료 후 `docs/PROGRESS_LOG.md`에는 최신 요약만, 완료 트랙은 `COMPLETED_SUMMARY.md`로 압축한다.
- 되돌리기 어려운 선택은 `docs/DECISIONS.md`에 기록한다.

### 자동화 태그 (overnight 루프용)

상태 박스(`[x]`/`[/]`/`[ ]`/`[~]`)와 **별개 축**으로, 무인 overnight 루프(`bin/overnight/`,
`docs/engineering/mythos/LOOP.md`)가 소비할 수 있는지를 inline 태그로 표시한다.

- `[auto]` — 로컬·결정론·offline(`make check` 또는 `make smoke-local`)으로 검증 가능한 항목에만.
  **반드시 완료 기준 1줄**을 붙인다(scope 폭주 방지).
- `[manual]` — 사람 플레이 체감 QA·콘텐츠/Story-Bible 저작·밸런스/프롬프트-feel 튜닝 등 무인 검증 불가.
- `[blocked]` — 같은 항목 Blocker 2회 누적(러너가 자동으로 덧붙임). 사람 검수 후 제거. 선행 조건 미충족도 포함.
- **무태그 = 무인 대상 아님**(안전 기본값). 러너는 `[auto*]`만 소비하고, 무태그를 임의로 승격하지 않는다.

**엔진 레인 (3엔진 병렬 — 충돌 방지, 설계: `docs/engineering/mythos/AGENTIC.md`):** `[auto]` 에 엔진 접미사를 붙여
어느 엔진이 소비할지 지정한다. 각 엔진은 **자기 레인만** 소비 → 같은 항목을 둘이 집지 않는다.
- `[auto]` / `[auto:claude]` — claude 레인(src/tests/하네스/복잡 리팩터·invariant). claude 가 둘 다 소비.
- `[auto:codex]` — codex 레인(결정론 docs/scenario/story_bible 리팩터·검증; make check 게이트).
- `[auto:agy]` — agy 레인(이미지 초안 + 간단 검증; resources/ 이미지 디렉터리만, 무결성 게이트).
- claude 한도 소진 시 codex 가 claude 레인을 대신 소비(러너 자동 failover, `run.sh`).

## Overnight QA Seed (2026-06-14) — 자동 콘텐츠/밸런스 무결성

> "안 깨지는가"(봇, 결정론) 콘텐츠/밸런스 invariant. green=박제, red=Blocker surface. offline·`make check`.

- `[x]` 완료 4종: 루트·엔딩 도달성(`tests/test_route_integrity.py`) + 플래그 참조·조우 무결성(`tests/test_content_integrity.py`). 상세는 PROGRESS archive(`bin/docs/archive/progress-2026-06.md`).
- `[ ]` `[auto:agy]` 스킬 아이콘 6종 초안: `emp_pulse`·`glitch_blink`·`memory_resonance`·`nanoshield_projector`·`signal_overdrive`·`system_intrusion` 의 `resources/neo-seoul/skills/<id>.png` 를 IMAGE_POLICY + 기존 스킬 아이콘 스타일을 바이블로 초안 생성(placeholder fabricate 금지). 완료 기준: 6 PNG 실존·비어있지 않음·규격 일치. (2026-06-14 1차 생성분은 미적 반려 — `outputs/agy/skills/VERDICT.md`. 엄격 카드 템플릿으로 재생성 필요.)
- `[blocked]` `[auto:claude]` 스킬/아이콘 무결성 invariant: 모든 `combat.skills[].id`에 `resources/neo-seoul/skills/<id>.png` 존재 + 아키타입 base/learnable + `epiphany` unlock이 실재 스킬 참조. 완료 기준: `test_assets.py`에 추가, green 또는 Blocker. **선행 미충족**: 위 `[auto:agy]` 아이콘 6종 채택·머지 후 해제.
- `[x]` `[auto:claude]` 조우 승률 밴드(시뮬) — `tests/test_encounter_balance.py`(2026-06-14). 고정 시드 그리디 시뮬(기본공격=보수적 하한). **단일 55~98% 밴드는 실측상 불성립**(skill-less 그리디+가변 파티 → 0.00~1.00)이라 **양면 invariant**로 설계: ① 대표 파티(player+se_rin+kai, `controllable=True`) 승률 ≥ 0.50(불가능 가드, 관측 0.96~1.00) ② 솔로 승률 ≤ 0.95(공짜 가드, 관측 0.00~0.79) + 결정론 검증. 리뷰 findings 2건 반영. green(320). 정밀 난이도 곡선은 `[manual]` feel-QA.
- `[ ]` `[auto:codex]` 진행도 경제 invariant(`test_progression.py`에 추가): 스킬 learn/rankup 비용이 tier별 단조 + 모든 tier가 합리적 통찰 수입으로 도달 가능(영구 불가 tier 0). 완료 기준: 테스트 추가, green 또는 Blocker.

## Priority 1 — Neo-Seoul Playability Upgrade

상태: `[/]` 진행 중(현재 최우선 트랙. 잔여는 주로 `[manual]` 사람 플레이 QA + 일부 `[auto]` QA seed).

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

### 작전 지도 동적 라우팅 — 완료(토대, 상세는 COMPLETED_SUMMARY/archive)

- `[/]` 후속: 동적 노드 title 다양화·중복 억제 완료. 남은 것: visual prompt에 현재 노드 주입, 정적 시나리오도 점진 전환 검토.

### 오프닝 시퀀스 정합 (live_qa §1.1) — 완료(토대), montage 후속

- `[ ]` 프리게임 montage 재배치: 추격 컷을 후반 비트로 옮겨 montage가 인게임 각성보다 앞서가는 시점 스포일 완화.
- `[ ]` 풀 4턴 사람 플레이 체감(각성→도착→접촉→추격, 이미지 전환·세린 포트레이트 동기화).
- `[ ]` 경미: turn1 "회랑" 단어 1회 누수·제목 "Changed " 접두 아티팩트, 인트로 불릿 칩(`·`) CSS 다듬기.

### 사람 플레이 QA 발견 (live_qa §0/§1-6) — A/B/C/E/G 완료, F·D 잔여

- `[/]` **F 스트리밍 속도**: 근본 원인 RAM 부족 규명 + 이원화 서사(8B 스토리 → 3b 파서) 배선·context 8192 캡 적용. 남은 것: 사용자 RAM 확보로 ~13초 근접, 실제 멀티턴 라이브 체감. 설계 `docs/plans/2026-06-10-dual-model-narrative-orchestration.md`.
- `[/]` **D 내러티브 반복**: 시놉시스 truncation 드롭 수정(`session_synopsis` 전용 필드 전량 렌더) + 장면 길이/prefill 캐시 수정. 남은 것: 실제 멀티턴 라이브 체감.

- `[/]` P0 — live LLM 장기 세션 QA: fallback 12선택 + 실제 gemma4 14턴(in-process 드라이버, 2026-06-08) 통과.
  기술 파이프라인 양호(파싱 예외 0·선택지 상존·전투 후 재개·멈춤 없음). **F1 반복 완화 적용**(시놉시스
  반복 억제 지침 강화 → 14턴 재검증서 반복 0·이야기 전진 확인). 남은 것: **F2 전투 빈도**(빈도/연속 튜닝
  검토 — 변동성 있어 추가 관찰). phase explore 정체는 수정(2026-06-14, route 노드 anti-stickiness). 주관 항목은 사람 플레이(`docs/test/neo_seoul_live_qa.md`).
- `[/]` P1 — Tactical Board 잔여: 보드 확대/줌(dataset.boardZoom, 100~250%) + 줌 버튼 전파 보정 + 지형 배지 완료. 남은 것: 터치 환경 click 핀 고정(인스펙터는 현재 desktop hover 기반).
- `[/]` P1 — 회복/소모품/전리품 루프: route rest/market 회복 + 전리품 인벤토리 표시 + 전투 중 소모품 사용 버튼 + 장비 착용(M40) 완료. 남은 것: 소모품/장비 밸런스 튜닝.
- `[/]` P2 — AI GM 진행 강화: route-node 주입(`_route_director_notes`)+세션 메모리로 반복 억제, **노드 anti-stickiness(첫 장면=확립/이후=전진 지침)로 explore 정체·위치 고착 수정**(2026-06-14, 멀티턴 검증). 남은 것: 막 gate 기반 필수 비트 강제, visual prompt에 현재 노드/유니크 비트 주입.
- `[/]` P2 — 기억의 별자리 재구성: 캐릭터(스탯/장비/인벤토리) 섹션 통합 + 루트 흐름(현재 시점/향하는 결말) 이동 완료. 남은 것: 개요/파티/런 히스토리 탭 세분화, 개발 로그 분리.
- `[ ]` P2 — 아키타입 의미 강화: 해금 조건을 명시 milestone으로 제한, 오프닝/시작 위치/기본 스킬/시작 아이템/NPC 반응 차별화.
- `[/]` P2 — objective 피드백 정리: 현재 장면 objective/stakes 상시 표시 + Golden Path 막 목표 정합 완료(2026-06-14). 남은 것: 막 전환 gate 충족 시에만 다음 단계 진행.
- `[/]` P2 — 선택 결과 요약 강화: 선택 후 `stability/tension`·flag성 사건·route 이동은 장면 기록에서 읽힘. 남은 것: 관계·Codex/Shard 변화까지 동일 포맷으로 확장.
- `[/]` P2 — Codex Skill UX 정리: 해금됨/습득 가능/통찰 부족/선행 필요 상태를 첫 플레이어도 이해하도록 문구·버튼 상태 점검. 분리:
  - `[x]` `[auto]` 버튼 disabled/상태 로직 완료(2026-06-14): 상태를 순수 함수 `deriveSkillAction`(`skillState.ts`)로 추출 — prereq>insight 우선순위로 결정론화. **버그 픽스**: 기존엔 통찰 충분하면 선행 미충족이어도 버튼이 활성→클릭→백엔드 거부였는데, 이제 선행 미충족 시 비활성+"선행 스킬 필요" 안내. **공백 보완**: 통찰 부족 시 "통찰 부족 · 보유/필요" 안내 추가(기존엔 이유 없이 회색 버튼). `make check`(tsc/eslint+mypy+test) green. (JS 유닛테스트는 러너(vitest) 부재로 보류 — 순수 함수 추출로 회귀 안전성 확보, vitest 도입은 별도 `[manual]` 인프라 결정.)
  - `[manual]` 상태 문구 wording(첫 플레이어 이해도 — feel 판단).
- `[ ]` Phase 4 — objective/choice result/Codex feedback UX 정리(위 P2 묶음의 통합 마감).
- `[ ]` Phase 5 — Neo-Seoul RC: 수동 QA(`docs/test/neo_seoul_live_qa.md`) + 자동 회귀, 결과는 `PROGRESS_LOG.md` 짧게/긴 기록은 archive.

## Hold — Scenario Expansion / Glass Library

상태: `[~]` 진행도/프레젠테이션 패리티 + Story Bible 17 entries 완료(M38). 추가 확장은 Neo-Seoul 만족도 개선 이후로 홀드.

- `[ ]` `glass-library` main_arcs/endings 분기·보상 메타 확장(현재 main_arcs 4 / endings 4).
- `[ ]` glass-library 전투 아트/스킬 깊이(현재 스킬 5종, 적 4종; 신규 combat action sheet는 후속).

## Maintenance

- `[ ]` `[manual]` 장기 플레이에서 Flux1 + Flux1Redux 동시 적재 메모리 모니터.
- `[ ]` `[blocked]` `_map` 제거 정리(route-node 트랙 완료 후 보류; engine 매 장면 기록 + encounter_map 좌표·story_bible 위치·glass-library 폴백 미니맵 의존). 선행 조건: 전 시나리오 route_map 전환. 충족 시 `[auto]`(codemod + `make check` green)로 승격.
- `[ ]` `[manual]` 프론트엔드 god-component 분해(App.tsx·CombatCinema): custom hook/모듈 추출. E2E 민감하므로 live QA 동반 점진 진행.
