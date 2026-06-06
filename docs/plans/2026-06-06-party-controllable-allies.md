# Plan: 파티/동맹 2단계 전투 조작 (Controllable Party Allies)

작성일: 2026-06-06
상태: 설계 (미구현 — 승인 대기)

## 목표

동맹 캐릭터(예: 정세린, 카이)의 전투 참여를 **2단계**로 구분한다.

1. **파티원 (내 `_party.members`에 소속)** → 그 유닛의 턴에 **플레이어가 직접 조작**(이동/공격/스킬/방어). 드래그&드롭 이동도 동일하게 적용.
2. **파티 외 우호적 (unlock flag만 충족, 파티 아님)** → 기존처럼 **AI 자동 조작 동맹**으로 참전.

## 현재 상태 (출발점)

- `combat_service._build_allies`: `unlocked = (se_rin in _party.members) OR (unlock_flags ∩ loop.state.flags)`. **조건과 무관하게 항상 `faction="ally"` AI 동맹**으로 생성 → 1단계(조작) 미구현.
- `mythos_combat/engine.py`는 **완전히 플레이어 1인 중심**:
  - `available_actions(state)` / `act(...)`(line 91) → `state.player()` 고정.
  - `_run_until_player()` → 플레이어 다음부터 모든 NPC(enemy+ally)를 `_npc_turn`으로 자동 처리하고 **플레이어 턴에서만 멈춤**. ally는 `_ally_turn`(line 773~) 자동 AI.
- `CombatState`/radar는 `current`(현재 actor id)를 노출하지만, 행동 권한은 항상 player 기준.

## 필요한 변경

### 1. 데이터 모델 (`mythos_combat/models.py`, `factory.py`)
- `Combatant`에 `controllable: bool = False` 추가.
- `build_ally_combatant(..., controllable: bool)` — 파티원이면 True.
- `Combatant.is_player`는 유지하되, 조작 판정은 `is_player or controllable`로 일반화하는 헬퍼(`is_controllable`) 추가.

### 2. 엔진 턴 루프 (`engine.py`)
- `_run_until_player` → `_run_until_controllable`: NPC(enemy + **비조작 ally**) 턴은 자동 처리하고, **player 또는 controllable ally** 차례에서 멈춘다. 멈춘 유닛 id를 `state`에 `active_actor`로 기록.
- `_npc_turn`/`_ally_turn`은 **비조작 ally + enemy**에만 적용. controllable ally는 자동 행동하지 않음.
- 라운드 진행/ focus tick 등 `_tick_player_round`를 "현재 조작 유닛" 기준으로 일반화.

### 3. 행동 API 일반화 (`engine.py`)
- `available_actions(state)` / `act(state, action, ...)`가 `state.player()` 대신 **`state.active_controllable()`**(현재 멈춘 조작 유닛)을 대상으로 동작.
- 이동 reachable/사거리/스킬/포커스 모두 활성 유닛 기준 계산(이미 `_reachable_tiles(state, actor)`는 actor 인자를 받으므로 호출부만 교체).
- 한 유닛 행동 종료 후 다음 조작 유닛 또는 라운드로 진행.

### 4. 서비스 (`combat_service.py`)
- `_build_allies`: 파티원 → `controllable=True`, flag-only → `controllable=False`.
- HP carry-over(`_finish_party_state`)는 현행 유지(파티원 HP 저장). 조작/비조작 모두 ally faction이므로 기존 저장 경로 재사용.

### 5. 직렬화/스냅샷 (`combat_server.py`, `mythos_api`)
- radar/blip에 `controllable` 노출, `available`/`can_act`를 **활성 유닛 기준**으로 반환.
- `current`(활성 actor id)와 그 유닛의 이름/초상을 프론트가 알 수 있게.

### 6. UI (`mythos_ui`)
- 현재 누구 턴인지 헤더에 표시("정세린의 턴").
- 활성 유닛이 controllable이면 행동 패널/타겟/스킬을 그 유닛 기준으로 렌더(이미 `available`을 그대로 그리므로 대부분 자동).
- 드래그&드롭 픽업 대상을 `radar.current`(활성 유닛)로 일반화(현재도 `current` 기준이라 거의 호환).
- 비조작 ally 턴은 자동 진행(로그만 갱신).

## 결정/리스크

- **턴 순서**: 파티원도 speed 기반 이니셔티브에 포함. 활성 조작 유닛이 여러 명이면 각자 턴에 멈춘다.
- **조작 유닛 전멸/사망**: 활성 유닛이 죽으면 다음 조작 유닛으로. 조작 가능 유닛이 0이면 패배 처리(기존 player 사망 = 패배 로직 확장).
- **"우호적" 정의**: 현재 unlock_flags로 충분. 별도 reputation 시스템은 범위 밖.
- **회귀 위험**: 엔진의 player 고정 가정이 광범위 → 단계적 적용 + 기존 전투 테스트(`test_combat_engine.py`) 그린 유지가 관문.

## 단계적 진행

1. 모델: `controllable` 필드 + 헬퍼, 직렬화 추가 (테스트: 필드 기본값/직렬화).
2. 엔진: `active_controllable` + 턴 루프 일반화 (테스트: ally 턴에서 멈추는지, 비조작 ally는 자동인지).
3. 행동 API 일반화 (테스트: ally로 공격/이동/스킬 적용).
4. 서비스: 파티원 controllable 분기 (테스트: 파티원=조작 / flag-only=AI).
5. UI: 활성 유닛 표시 + 조작 + 드래그 일반화 (브라우저 검증).
6. 회귀: `make test` + 라이브 전투 플레이.

## 비고

승인되면 위 1→6 순서로 PR을 나눠 진행하는 것을 권장(엔진 일반화가 가장 위험하므로 2~3 단계에서 회귀 테스트 집중).
