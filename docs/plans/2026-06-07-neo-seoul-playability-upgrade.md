# Neo-Seoul Playability Upgrade Plan

작성일: 2026-06-07
상태: Phase 1 문서 확정 + Phase 2 데이터 보강 + Phase 3 데이터 기준선 완료. 구현 보류.

## 목표

`neo-seoul`을 Project MythOS의 주력 플레이어블 시나리오로 완성한다. 기준은 기술 데모가 아니라
일반 유저가 30-60분 동안 읽고, 선택하고, 전투하고, 다시 플레이할 이유를 느끼는 수준이다.

이번 트랙에서는 `glass-library` 확장을 홀드한다. 멀티 시나리오 확장보다 Neo-Seoul 한 편의 완성도,
게임성, 스토리 몰입, UX 피드백을 우선한다.

## 플레이 만족도 기준

성공 기준:

- 첫 5분 안에 플레이어가 "나는 누구고, 무엇을 해야 하며, 왜 세린을 따라가야 하는가"를 이해한다.
- 매 장면 선택지가 단순 진행 버튼이 아니라 `사람 / 증거 / 안전 / 통제` 중 무엇을 택하는지 보여준다.
- 10-15분마다 새로운 플레이 감각이 나온다: 추격, 조사, 거래, 구출, 전투, 동료 조작, 최종 대면.
- 전투는 서사를 끊는 미니게임이 아니라 작전 실패, 추적 상승, 동료 보호, 보상 획득의 결과로 느껴진다.
- Codex/Run History/진행도는 장식이 아니라 다음 루프를 더 잘하게 만드는 정보와 보상을 준다.
- 엔딩은 승패보다 "무엇을 구했고, 무엇을 잃었고, 다음 루프에 무엇이 남는가"가 선명하다.

## 현재 자산

이미 있는 강점:

- 6막 구조, 4엔딩, 6개 side arc.
- Neo-Seoul Story Bible 17 entries.
- 정세린/린위에/카이/관리자 IX 캐릭터 축.
- 전투 엔진, 파티 조작, 스킬 액션바, CombatCinema, SFX/BGM, 전투 결과 이미지.
- 진행도 시스템: 아키타입, 스킬 해금, 통찰 투자, 미드런 깨달음.
- 오프닝 cinematic shots 3장과 전용 UI copy.

주요 공백:

- 장면별 목표와 gate가 런타임 플레이에서 항상 명확하게 드러나는지 불확실하다.
- 선택지의 결과가 플레이어에게 충분히 구체적으로 피드백되는지 더 검증해야 한다.
- 전투 발생 빈도/난이도/보상이 "스토리 압박"과 "게임적 재미" 사이에서 조정되지 않았다.
- Codex와 진행도 보상이 실제 플레이 전략으로 이어지는 튜닝이 부족하다.
- 엔딩 조건과 루프 잔향이 플레이어 선택의 결과로 충분히 예측 가능하고 납득되는지 검증 필요.

## 작업 흐름

### Phase 1 — Playability Spec & Golden Path

목표: 구현 전에 "재미있는 한 판"의 기준선을 고정한다.

- Golden Path 45분 플레이 흐름 정의:
  - 오프닝 탈출
  - 복지 블록/야시장 조사
  - 최적화 명단 단서 확보
  - 구출 또는 증거 작전
  - 카이 각성
  - 스파이어 접근
  - 관리자 IX 대면과 엔딩
- 실패/우회 Path 정의:
  - 세린 불신 또는 관계 악화
  - 린위에에게 큰 부채를 지는 루트
  - 카이를 깨우지 못한 루트
  - tension 과다로 강제 충돌하는 루트
- 장면 품질 체크리스트 확정:
  - 현재 목표가 보이는가
  - 선택지별 대가가 다른가
  - 상태 변화가 읽히는가
  - 다음 장면 이유가 자연스러운가
  - Codex/진행도 보상이 있는가

산출물:

- `[x]` `docs/scenarios/01-neo-seoul-connect.md`에 golden path와 QA rubric 반영.
- `[x]` 별도 수동 QA 문서 없이 `docs/scenarios/01-neo-seoul-connect.md` §5.5를 플레이 만족도 QA 기준으로 사용.

### Phase 2 — Story & Choice Density Pass

목표: Neo-Seoul 장면의 선택 밀도와 감정선을 강화한다.

- Story Bible 보강:
  - `[x]` 세린 신뢰/불신 분기
  - `[x]` 린위에 거래와 부채 후폭풍
  - `[x]` 카이 꿈 단서와 MythOS 연결 및 미각성 루트
  - `[x]` 관리자 IX의 유혹/협박 대사 패턴
  - `[x]` 엔딩별 Echo/Shard 잔향
- `scenario.json` 보강:
  - `[x]` Golden Path, choice axes, route branches, ending echo targets 메타 추가.
  - `[ ]` side arc가 실제 엔딩/보상/관계에 영향을 주도록 데이터 정리.
  - `[ ]` 엔딩 조건을 플레이어가 체감 가능한 지표와 flag 중심으로 다듬기.
- 선택지 설계 원칙:
  - 같은 정보라도 `위험하게 빠르게 / 안전하게 느리게 / 사람을 돕고 비싸게 / 시스템을 속이고 차갑게`로 갈라지게 한다.
  - 선택지 텍스트에 결과를 노골적으로 수치화하지 않되, 위험과 의도를 읽을 수 있게 한다.

검증:

- fallback narrative smoke.
- Story Bible selector 단위 테스트.
- E2E golden path에서 장면 전환과 Codex 보상 확인.

### Phase 3 — Combat & Progression Fun Pass

목표: 전투와 진행도가 실제 게임성을 만들게 한다.

- 전투 페이스:
  - 오프닝 추격은 짧고 강하게.
  - 중반 전투는 동료 보호/위치 선택/스킬 사용 이유가 있게.
  - 후반 전투는 tension이 높을수록 더 위험하게.
- 조우 튜닝:
  - `[x]` 드론/집행 유닛/글리치 레이스/센티넬의 역할 구분 강화(각 encounter에 `learning_goal`/`narrative_trigger`/`reward_intent` 추가).
  - `[x]` 각 조우가 다른 학습 목표를 갖도록 기준선 작성: 이동, 엄호, 집중 공격, 회복, 도주.
  - `[ ]` 실제 난이도 수치와 encounter weight 조정.
- 보상 튜닝:
  - `[x]` 통찰 포인트와 스킬 비용이 "한 판 더" 동기를 주도록 `progression_reward_tuning` 기준 작성.
  - `[x]` 첫 런에서 최소 1개 의미 있는 해금이 보이게 하는 목표 명시.
  - `[x]` `encounter_reward.insight`를 실제 meta progression에 반영.
  - `[ ]` learned skill이 다음 전투에서 체감되도록 encounter 난이도와 배치 조정.

검증:

- combat unit tests.
- Playwright combat flow.
- QA 기준: 첫 전투, 중반 전투, 후반 전투 각각 1회를 `docs/scenarios/01-neo-seoul-connect.md` §5.5 rubric으로 평가.

### Phase 4 — UX Feedback & Player Clarity

목표: 플레이어가 헤매지 않고 선택의 의미를 이해하게 한다.

- 현재 objective/next step 표시 강화.
- 선택 결과 요약을 장면 기록과 Run History에서 더 잘 보이게 정리.
- Codex Skill 탭이 "지금 무엇을 얻었고 무엇을 살 수 있는지" 즉시 이해되게 정리.
- Save/Load/Resume 문구와 상태가 실제 플레이 흐름을 방해하지 않게 점검.
- BGM/SFX/CombatCinema가 과하지 않고 중요한 순간을 받쳐주는지 확인.

검증:

- `make frontend-lint`
- `make frontend-build`
- `make test-e2e`
- QA 기준: 첫 15분 플레이에서 목표/보상/위험 인지를 `docs/scenarios/01-neo-seoul-connect.md` §5.5 rubric으로 확인.

### Phase 5 — Release Candidate Pass

목표: Neo-Seoul을 "추천 플레이 가능" 상태로 고정한다.

- Golden Path 1회 완주.
- 실패/도주/고 tension 루트 1회.
- Codex/진행도/스킬 투자 후 2회차 전투 1회.
- 엔딩 2종 이상 확인.
- 문서와 실제 데이터 차이 정리.

완료 기준:

- `make test`
- `make frontend-lint`
- `make frontend-build`
- `make test-e2e`
- `make test-e2e-full`
- Neo-Seoul QA rubric(`docs/scenarios/01-neo-seoul-connect.md` §5.5) 기준 통과.

## 우선순위

1. Phase 1: Golden Path와 플레이 만족도 QA rubric 확정.
2. Phase 2: Story Bible/scenario choice density 보강.
3. Phase 3: 전투 조우와 진행도 보상 튜닝.
4. Phase 4: 목표/보상/결과 UX 피드백 정리.
5. Phase 5: RC 플레이테스트와 문서 동기화.

## 보류

- `glass-library` main_arcs/endings 추가 확장.
- `glass-library` combat action sheet 제작.
- 프론트 대규모 리팩터링. 단, Neo-Seoul 플레이 만족도 개선에 직접 필요한 작은 분해는 허용한다.
- Flux1 + Redux 장기 메모리 모니터링은 문제가 재현될 때 별도 유지보수로 처리한다.
