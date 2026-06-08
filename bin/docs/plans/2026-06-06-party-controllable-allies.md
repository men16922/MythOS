# Technical Design Plan: 파티/동맹 2단계 전투 조작 (Controllable Party Allies)

**작성일**: 2026-06-06  
**상태**: 구현 완료 (2026-06-07) — 실제 모듈은 `src/mythos_combat/{models,engine,factory}.py` + `src/mythos_runtime/combat_service.py`. 본 문서의 코드 스니펫은 설계 예시이며 메서드명은 일부 다름(`take_player_turn`/`_run_until_controllable`/`_tick_round_upkeep`).  
**관련 문서**: [docs/plans/2026-06-06-party-controllable-allies.md](file:///Users/men1692/Desktop/local/MythOS/docs/plans/2026-06-06-party-controllable-allies.md)

---

## 1. 목표 및 범위
현재 MythOS의 전투 시스템은 플레이어 캐릭터 단 한 명의 행동만을 대기하며, 동행한 동맹 캐릭터(정세린, 카이 등)는 턴이 돌아오면 AI가 완전히 자동으로 조작하고 있습니다.
이 계획은 동맹 유닛의 참전 형태를 **조작 가능 파티원**과 **AI 자동 동맹**의 두 단계로 구분하고, 전자의 경우 플레이어가 직접 행동(이동, 공격, 스킬 사용 등)을 선택해 조작할 수 있도록 전투 엔진과 UI를 고도화하는 것을 목표로 합니다.

*   **파티원 (`_party.members` 소속)**: 자신의 턴에 플레이어가 직접 전투 커맨드(이동, 공격, 스킬, 방어)를 입력하여 조작.
*   **비파티 동맹 (일반 우호 NPC)**: 기존처럼 턴이 오면 AI에 의해 자동으로 조작됨.

---

## 2. 세부 설계 및 변경 영역

### 2.1. 데이터 모델 (`src/mythos_combat/models.py`)
`Combatant` 모델에 직접 조작 가능 여부를 나타내는 필드를 추가하고, 현재 턴 소유자를 범용적으로 식별할 수 있는 속성을 제공합니다.

```python
# src/mythos_combat/models.py

@dataclass
class Combatant:
    # ... 기존 필드 동일 ...
    controllable: bool = False  # 플레이어처럼 직접 명령을 입력하여 조작할 수 있는지 여부
    
    @property
    def is_controllable(self) -> bool:
        """플레이어 본인이거나 직접 조작 가능한 파티원인지 확인"""
        return self.faction == PLAYER or self.controllable
```

`CombatState`에 현재 행동을 대기하고 있는 활성 조작 유닛 정보를 조회하는 프로퍼티를 추가합니다.

```python
# src/mythos_combat/models.py

@dataclass
class CombatState:
    # ... 기존 필드 동일 ...
    
    def active_actor(self) -> Combatant | None:
        """현재 turn_ptr이 가리키고 있는 활성 캐릭터 반환"""
        if not self.order or self.turn_ptr >= len(self.order):
            return None
        return self.by_id(self.order[self.turn_ptr])
        
    def living_controllables(self) -> list[Combatant]:
        """현재 살아있는 조작 가능한 캐릭터 목록 (전멸 판정에 사용)"""
        return [c for c in self.combatants if c.alive and c.is_controllable]
```

### 2.2. 전투 팩토리 (`src/mythos_combat/factory.py`)
전투 유닛을 생성할 때 파티 여부에 따라 `controllable` 필드를 설정하도록 지원합니다.

```python
# src/mythos_combat/factory.py

def create_combatant(
    data: dict[str, Any], 
    x: int, 
    y: int, 
    faction: str,
    controllable: bool = False
) -> Combatant:
    # ... Combatant 생성 시 controllable=controllable 전달 ...
```

---

### 2.3. 엔진 턴 루프 개편 (`src/mythos_combat/engine.py`)

기존의 `_run_until_player`는 플레이어 캐릭터의 인덱스만을 하드코딩된 기준으로 삼고 동작했습니다. 이를 **활성 조작 유닛(is_controllable)** 차례에서 멈추도록 일반화합니다.

```python
# src/mythos_combat/engine.py

class CombatEngine:
    # ...
    
    def start_combat(self, combatants: list[Combatant], arena_w: int = 8, arena_h: int = 6, seed: str = "", encounter_id: str | None = None) -> CombatState:
        # 1. 이니셔티브 롤 및 정렬 (기존 동일)
        # 2. 첫 번째 조작 유닛 차례까지 자동으로 NPC 턴 진행
        state = CombatState(...)
        # ...
        self._run_opening(state)
        return state

    def _run_opening(self, state: CombatState) -> None:
        """첫 번째 조작 가능한 유닛 차례 직전까지 자동 진행"""
        n = len(state.order)
        for i in range(n):
            actor = state.by_id(state.order[i])
            if actor and actor.alive:
                if actor.is_controllable:
                    # 조작 가능 유닛을 찾음 -> 멈춤
                    state.turn_ptr = i
                    self._start_turn_upkeep(state, actor)
                    return
                else:
                    # AI 유닛 -> 자동 행동
                    self._npc_turn(state, actor)
                    self._check_outcome(state)
                    if not state.active:
                        return
        state.turn_ptr = 0

    def _run_until_controllable(self, state: CombatState) -> None:
        """다음 조작 가능한 유닛의 턴까지 NPC 턴을 자동 실행하고 멈춤"""
        n = len(state.order)
        current_idx = state.turn_ptr
        i = (current_idx + 1) % n
        guard = 0
        
        while guard < n * 3:
            guard += 1
            # 라운드 증가 조건: 이니셔티브 리스트의 처음(0번)으로 인덱스가 넘어갈 때
            if i == 0:
                state.round += 1
                
            actor = state.by_id(state.order[i])
            if actor and actor.alive:
                if actor.is_controllable:
                    # 조작 가능한 캐릭터 발견 -> 멈춤
                    state.turn_ptr = i
                    self._start_turn_upkeep(state, actor)
                    return
                else:
                    # AI 동맹 및 적군 -> 자동 실행
                    self._npc_turn(state, actor)
                    self._check_outcome(state)
                    if not state.active:
                        return
            i = (i + 1) % n

    def _start_turn_upkeep(self, state: CombatState, actor: Combatant) -> None:
        """조작 가능 캐릭터의 턴이 시작될 때 리소스 회복 및 상태 관리"""
        actor.defending = False
        # 공통 라운드/턴 회복 적용 (집중력 회복, 쿨다운 감소 등)
        self._tick_round_upkeep(actor)
        
    def _tick_round_upkeep(self, actor: Combatant) -> None:
        """포커스 회복, 쿨다운 감소, 버프 갱신 통합"""
        if actor.max_focus:
            actor.focus = min(actor.max_focus, actor.focus + 1)
        for skill_id in list(actor.cooldowns):
            actor.cooldowns[skill_id] -= 1
            if actor.cooldowns[skill_id] <= 0:
                del actor.cooldowns[skill_id]
        if actor.defense_buff_turns > 0:
            actor.defense_buff_turns -= 1
            if actor.defense_buff_turns <= 0:
                actor.defense_buff = 0
```

---

### 2.4. 행동 실행 API 범용화 (`src/mythos_combat/engine.py`)

플레이어 고정이었던 행동 주체를 `state.active_actor()`로 동적으로 변경합니다.

```python
# src/mythos_combat/engine.py

    def take_turn(
        self,
        state: CombatState,
        action: PlayerAction,
        *,
        skill_def: dict[str, Any] | None = None,
        item_def: dict[str, Any] | None = None,
        item_available: bool = False,
    ) -> CombatState:
        if not state.active:
            return state
            
        # 1. 현재 턴의 조작 가능 유닛 조회
        actor = state.active_actor()
        if actor is None or not actor.alive or not actor.is_controllable:
            return state

        spent = True
        if action.type == "skill":
            spent = self._player_skill(state, actor, action, skill_def, item_available)
        elif action.type == "item":
            spent = self._player_item(state, actor, action, item_def, item_available)
        else:
            dice = self._dice(state)
            if action.move_to is not None:
                self._move_player(state, actor, action.move_to)  # 범용 이동
            if action.type == "attack":
                self._player_attack(state, actor, action, dice)  # 범용 공격
            elif action.type == "defend":
                actor.defending = True
                gained = self._restore_focus(actor, 1)
                # 로그 메세지 다변화
                self._log(state, actor, "defend", f"{actor.name}이(가) 방어 태세를 취하며 집중을 가다듬는다.")
            elif action.type == "flee":
                # 도주는 플레이어 본인(faction==PLAYER)만 시도 가능하게 제한
                if actor.faction == PLAYER:
                    self._player_flee(state, actor, dice)
                else:
                    spent = False  # 파티원은 도주 불가 (대신 다른 행동 취해야 함)
            else:
                self._log(state, actor, "info", f"{actor.name}은(는) 상황을 살핀다.")

        # 전투 종료 조건 평가 (조작 가능한 캐릭터가 모두 사망하면 패배)
        self._check_outcome(state)
        if not state.active or state.outcome == "player_fled":
            return self._finish(state)

        if not spent:
            return state

        # 다음 조작 가능 유닛까지 엔진 진행
        self._run_until_controllable(state)
        if not state.active:
            return self._finish(state)
        return state

    def available_actions(self, state: CombatState) -> dict[str, Any]:
        """활성 조작 유닛 기준으로 가능한 행동 범위(Reachable, Targets) 반환"""
        actor = state.active_actor()
        if actor is None or not actor.alive or not state.active or not actor.is_controllable:
            return {"can_act": False, "targets": [], "reachable": []}

        # 활성 캐릭터 기준 사거리 및 스킬 사용 대상 계산
        reachable = self._reachable_tiles(state, actor)
        targets = []
        hostiles = state.hostiles_of(actor)
        
        # ... 무기 및 사거리 기준 타겟 선정 (actor 기준 계산) ...
        return {
            "can_act": True,
            "targets": targets,
            "reachable": reachable,
            "active_actor_id": actor.id,
            "active_actor_name": actor.name
        }
```

---

### 2.5. 서비스 계층 연결 (`src/mythos_runtime/combat_service.py`)
전투를 개시할 때 파티 소속 동료만 `controllable=True` 속성을 가지도록 필터링합니다.

```python
# src/mythos_runtime/combat_service.py

    def _build_allies(self, loop_state: LoopState, scenario: ScenarioConfig) -> list[Combatant]:
        party_members = loop_state.state.get("party", {}).get("members", [])
        allies = []
        
        for ally_def in scenario.combat.get("allies", []):
            ally_id = ally_def["id"]
            # 동맹 해금 판단
            is_unlocked = (ally_id in party_members) or any(
                f in loop_state.state.flags for f in ally_def.get("unlock_flags", [])
            )
            if not is_unlocked:
                continue
                
            # 파티원인 경우에만 controllable=True 로 조작권 부여
            is_party_member = ally_id in party_members
            c = create_combatant_from_def(ally_def, controllable=is_party_member)
            allies.append(c)
            
        return allies
```

---

## 3. 검증 및 롤아웃 계획
1.  **회귀 테스트 확인**: 기존 플레이어 1인 시나리오 테스트(`test_combat_engine.py`)가 훼손되지 않고 통과하는지 `make test`로 계속 점검합니다.
2.  **동맹 조작 단위 테스트 구축**: `controllable=True/False`인 동맹을 각각 배치하여 AI 동맹과 플레이어 동맹이 의도한 흐름(AI는 자동 실행, 플레이어 동맹은 턴에서 멈추어 대기)대로 순차 이행하는지 테스트 코드를 작성합니다.
3.  **UI 통합 검증**: Web UI에서 정세린이 보드에 등장했을 때 드래그 앤 드롭 이동 조작과 하단 스킬/공격 행동 패널이 정세린의 정보로 즉시 변하는지 수동 검증 및 Playwright E2E에 추가 반영합니다.
