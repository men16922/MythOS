# Neo-Seoul Live Feedback Action Plan

작성일: 2026-06-07
상태: 라이브 피드백 반영 계획. 즉시 수정 가능한 UI 버그 일부 패치 시작.

## 핵심 진단

현재 문제는 개별 UI polish보다 크다. `neo-seoul`은 장면, 전투, 지도, Codex, 진행도가 각각 존재하지만
플레이어에게 하나의 게임 루프로 연결되지 않는다. 따라서 다음 작업은 "기능 추가"가 아니라
선택 -> 이동 -> 조우/이벤트 -> 보상 -> 다음 루프 판단의 연결을 선명하게 만드는 것이다.

## 즉시 수정 대상

- `[x]` 오프닝 수락 시 BGM 재시도 강화: `IntroPanel` 수락 시 `initAudio()`와 `playBgm(..., true)`를 다시 호출.
- `[x]` 전투 중 Codex/Dev 탭 이동 후 Story 복귀 시 Tactical Board가 비어 보이는 문제: active tab 전환 시 combat canvas를 다시 draw.
- `[x]` 작전 지도 최소 설명 보강: 현재 위치, 지점 유형, 범례, 접근 중인 접촉 표시.
- `[x]` 상태 HUD 설명 보강: Stability/Tension/Temporal Decay/Zone Risk/Clue Matrix가 무엇인지 한 줄 설명 추가.
- `[x]` 런 히스토리 빈 상태 문구 보강.
- `[x]` 로그 메뉴를 개발 로그로 명시.
- `[x]` 초반 ambient encounter 완화: 명시 요청이 없는 기본 순찰 자동 생성은 끄고, high tension/low stability에서만 ambient 접촉을 허용.
- `[x]` `encounter_reward.insight` 즉시 반영: 전투 보상 insight를 meta progression 통찰 포인트로 저장하고 전투 결과 패널/Codex 설명에 노출.

## P0 — 플레이 진행 불능/혼란

- `[/]` 세션 10장면 이후 멈춤 재현:
  - 구분: 프론트 스트리밍 정지, WebSocket 종료, 백엔드 생성 지연, 파서 repair 실패, combat 상태 잔류.
  - 조치: 장면 번호, 마지막 WS 이벤트, console log, API 응답 시간을 Dev Log가 아닌 QA 기록에 남기도록 최소 instrumentation 추가.
  - 현재 확인: fallback 12선택 진행은 통과. 초반 진행 정지는 ambient encounter가 전투를 강제하고 전투 패배가 루프를 종료하던 흐름으로 재현됨. live LLM 장기 세션은 별도 확인 필요.
- `[ ]` 세린 표기 오류 방지:
  - 정식 표기: `정세린`, 축약 `세린`.
  - 금지 표기: `세리느`, `세린느`, `Serine`, `Seline`.
  - 조치: narrative post-process 또는 prompt naming rule에 금지 표기 추가.
- `[ ]` BGM Live QA:
  - 부팅 화면 진입 후 사용자가 `접속 기동`을 누르면 BGM이 켜지는지.
  - 시나리오 오프닝 수락 후에도 BGM이 유지/재시도되는지.
  - 전투 진입/이탈 시 적절한 BGM으로 전환되는지.

## P1 — 작전 지도 재설계

현재 작전 지도는 좌표 미니맵과 roaming contact 표시다. 이 구조만으로는 "내가 어디로 이동하고 있는지"와
"선택지가 어떤 루트를 뜻하는지"가 보이지 않는다.

방안: Slay the Spire식 노드 루트로 전환한다.

- 지도는 좌표 격자가 아니라 `route_node` 그래프를 source of truth로 둔다.
- 각 노드는 명확한 타입을 가진다:
  - `story`: 주요 장면/막 gate
  - `clue`: 단서/Shard/Codex 보상
  - `combat`: 확정 전투
  - `patrol`: 회피 가능 전투/추적 접촉
  - `market`: 거래/회복/장비
  - `rest`: 회복/정비
  - `event`: 관계/부채/도덕 선택
  - `boss`: 관리자 IX 또는 막 전환 대면
- 선택지는 "행동"이 아니라 "다음 노드 이동"을 명시한다.
  - 예: `한강 야시장으로 우회한다 · market · tension -5 · 린위에 부채 가능`
  - 예: `스파이어 검문소를 정면 돌파한다 · combat · tension +12 · 증거 보존`
- 지도 UI는 현재 노드, 다음 후보 2-3개, 각 후보의 보상/위험/이동 비용을 보여준다.
- roaming encounter는 노드 위협 레이어로 유지하되, 자동 전투가 아니라 회피/매복/정면돌파 선택을 먼저 준다.

완료 기준:

- 플레이어가 선택 버튼만 보고도 "어디로 이동하는지", "무슨 위험/보상을 감수하는지"를 이해한다.
- 최소 한 번의 플레이에서 전투 회피 루트와 전투 감수 루트가 모두 가능하다.

## P1 — 전투 보드 의미 강화

현재 Tactical Board에는 이미 elevation, cover, hazard, enemy intent가 있으나 플레이어가 의미를 알 수 없다.

- 보드 크기 확대 또는 반응형 가로폭 우선 배치.
- Tile legend 추가:
  - cover: 방어 보너스/사선 차단
  - hazard acid/electro: 턴 종료 피해/방어 감소/집중 손실
  - elevation: 명중/시야/이동 비용 후보
  - enemy intent: 공격/이동/도주 예고
- 칸 hover/click inspector 추가: 좌표, 지형, 효과, 점유 유닛, 예상 위험 표시.
- 전투 시작 전에 "이 전투의 학습 목표"를 짧게 표시한다.

## P1 — 체력, 소모품, 전리품, 장비

현재 코드에는 소모품 사용, 전리품 드랍, 동료 HP 지속이 일부 있다. 하지만 UI와 루프 설계가 약해서
플레이어는 매 전투가 풀피로 시작한다고 느낀다.

- 전투 후 HP/동료 HP가 실제로 다음 전투에 이어지는지 라이브 재검증.
- 회복 수단을 노드 루프에 명시:
  - `rest` 노드: 안정도 일부 회복, 시간/decay 비용
  - `market` 노드: 나노패치 구매, 린위에 부채
  - 스킬: `patch_protocol`
- 전리품 결과를 전투 종료 패널에 표시한다.
- 인벤토리에서 소모품 이름/효과/사용 가능 상황을 보여준다.
- 장비 장착은 별도 P2로 둔다. 먼저 소모품/전리품/회복 루프를 체감시키는 것이 우선이다.

## P1 — 스킬 포인트와 진행도 설명

현재 통찰 포인트 적립 규칙은 구현돼 있지만 플레이어에게 설명되지 않는다.

- 현재 규칙: 루프 보관 +2, 단서 +1, 전투 승리 +1.
- 완료: `encounter_reward.insight`는 실제 meta progression 통찰 포인트에 즉시 반영한다.
- UI:
  - Codex Skill 탭 상단에 "통찰 획득 방법" 한 줄 표시.
  - 전투 종료/Run History에 이번 루프에서 얻은 통찰 출처 표시.

## P2 — 기억의 별자리 메뉴 재구성

제안은 타당하다. 현재 Codex/Character/Run History/Inventory/Skill이 흩어져 있고, 로그는 개발자 콘솔 성격이다.

방안:

- `기억의 별자리`를 플레이어 메타 메뉴로 재정의한다.
- 내부 탭:
  - `개요`: 현재 루프 요약, 주요 Echo/Shard
  - `캐릭터`: 스탯, 아키타입, 자율성, 상태
  - `스킬 트리`: 해금/습득/강화
  - `파티`: 동료 HP, 관계, 전투 역할, 리타이어 상태
  - `인벤토리`: 소모품, 전리품, 장비 후보
  - `런 히스토리`: 종료된 루프와 다음 루프 단서
- `개발 로그`는 별도 접힘 패널로 유지하되 일반 플레이 루프에서 강조하지 않는다.

## P2 — 아키타입 재설계

진행도에 따른 아키타입 해금 아이디어는 유지할 수 있지만, "시스템이 진행도를 추정"하면 불명확하다.
해금 조건은 루프 종료 시 명시적으로 저장되는 milestone만 써야 한다.

권장 기준:

- `Ghost`: 기본. 추격/생존/이동, 신호 스킬.
- `Signal Breaker`: 첫 전투 승리 또는 high tension 루프 생존. 전투/과부하/정면돌파 오프닝.
- `Memory Diver`: Kai 각성 또는 Shard 3개 확보. 단서/꿈/기억 해석 오프닝.
- `Debt Runner`: 린위에 부채 루트 완료. 시장/거래/우회 오프닝.
- `Null Citizen`: 세린 불신 또는 관리자 IX 순응 루트. 낮은 tension, 낮은 관계 보상, 시스템 우회 오프닝.

각 아키타입은 반드시 달라야 한다:

- 오프닝 첫 장면이 다르다.
- 시작 위치 또는 첫 선택지가 다르다.
- 기본 스킬 2개와 시작 아이템이 다르다.
- 세린/린위에/카이/관리자 IX의 첫 반응이 다르다.
- 같은 노드라도 선택 결과 보정이 다르다.

## P2 — 스토리 반복/AI GM 진행

현재 Story Bible과 session_design은 있지만, 시간에 따른 "다음 사건"이 강하게 주입되지 않는다.

방안:

- `scenario.session_design.golden_path`를 runtime context에 현재 turn/phase 기준으로 주입한다.
- 각 막에 `required_beats`와 `advance_gate`를 둔다.
- AI GM은 매 장면 다음 중 하나를 반드시 전진시킨다:
  - 위치 노드
  - NPC agenda
  - 단서
  - tension/stability consequence
  - phase gate
- 같은 이미지/비슷한 장면 반복을 줄이기 위해 visual prompt에 current node, recent action, unique beat를 강제로 넣는다.

## 보류 또는 별도 결정

- 장비 장착 전체 시스템은 P2 이후. 먼저 회복/소모품/전리품 루프가 보여야 한다.
- 로그라이크 노드 지도는 기존 `_map`을 바로 제거하지 않고, `route_node`를 추가한 뒤 호환 계층으로 전환한다.
- 전투 중 동료 리타이어의 최종 룰은 선택 필요:
  - 권장: 해당 전투에서는 쓰러짐, 전투 후 부상 상태로 남음, rest/market/skill로 회복 가능. 루프 종료 전 영구 사망은 금지.
