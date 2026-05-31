## MythOS Roguelike/CRPG Encounter Design

### Core Loop

1. **Explore**: 일반 서사 장면이 작전 지도 타일을 갱신한다.
2. **Contact**: `world_delta.spawn_encounters` 또는 런타임 ambient patrol이 주변 타일에 적 접촉을 만든다.
3. **Pressure**: 접촉은 위험도에 따라 플레이어 쪽으로 이동한다. 강한 적은 느리게/멀리, 약한 순찰은 자주/가깝게 둔다.
4. **Encounter**: 플레이어 이동 또는 적 이동으로 같은 타일에 닿으면 `start_combat`가 발생한다.
5. **Tactical Fight**: 명중, 피해, 이동, 도주, 적 AI는 `CombatEngine`만 판정한다.
6. **Aftermath**: 전투 결과 패널이 파티 생존, 적 격파, HP, 라운드/턴, 피해 교환, 명중/치명타, 루트, 판정 문구를 정산한다. 승리/도주 시 다음 장면으로 진행하고, 패배 시 메인 접속 화면으로 돌아가 새 세션 선택을 맡긴다.

### Current Implementation Snapshot

- Runtime authority:
  - `mythos_combat`가 주사위, 명중, 피해, 이동, AI, 승패를 판정한다.
  - `CombatService`가 `loop.state["_combat"]`, `_party`, `_inventory`, `_run`을 관리한다.
  - `RuntimeSessionService`는 `start_combat`, `combat_action`, `world_delta.start_combat`, `world_delta.spawn_encounters`를 통해 서사 장면과 전투 장면을 연결한다.
- Map encounter:
  - `_encounter_map.contacts`가 작전 지도 주변 접촉을 보관한다.
  - 접촉은 턴마다 이동하고 플레이어 현재 타일과 충돌하면 combat scene으로 전환된다.
- Tactical UI:
  - 장면 이미지 / tactical board+roster / command or result panel 3열 구성.
  - 활성 전투에서는 `TACTICAL BOARD` 안에서 플레이어 신호를 선택하고 이동 가능 칸을 직접 클릭한다.
  - 적/아군은 portrait thumbnail, HP strip, roster card로 표시한다.
  - 전투 결과 화면은 combat summary를 사용해 정산 수치를 표시한다.
- Assets:
  - 주인공: `resources/neo-seoul/characters/player-noise.png`.
  - 적: `resources/neo-seoul/enemies/maintenance-drone.png`, `sentinel-drone.png`, `enforcer-unit.png`, `glitch-wraith.png`.
- Data source:
  - 현재 동료/적/인카운터/아이템/스킬은 DB 테이블이 아니라 `resources/neo-seoul/scenario.json["combat"]` pool에 정의한다.

### Best-Practice Targets

- **Slay the Spire식 위험-보상 선택**: 플레이어가 “쉬운 접촉을 피하고 강한 접촉을 감수할 이유”가 있어야 한다. 위험도 1-2는 소모품/재료, 위험도 3-4는 키/희귀 데이터/큰 서사 단서.
- **Darkest Dungeon식 원정 압박**: HP와 소모품은 전투 사이에 유지한다. 승리해도 다음 전투가 쉬워지지 않도록 작은 피해 누적과 회복 아이템 희소성을 유지한다.
- **XCOM/CRPG식 읽히는 전술 정보**: UI는 적 이름, HP, 위치, 사거리 여부를 숨기지 않는다. 불확실성은 명중/피해 굴림에 두고, 정보 부족으로 인한 실수는 줄인다.
- **Into the Breach식 예고 가능한 위협**: 작전 지도에 접촉을 먼저 보여주고, 즉시 랜덤 전투로 끌고 가지 않는다. 적이 다가오는 것을 레이더 점처럼 인지할 수 있어야 한다.
- **Baldur's Gate/파티 CRPG식 역할 분담**: 파티원은 동일한 `Combatant(faction="ally")`로 취급한다. 우선은 NPC 동료가 자동 AI로 행동하고, 이후 수동 조작으로 확장한다.

### Encounter Table

| Tier | Encounter | Risk | Use | Reward intent |
| --- | --- | ---: | --- | --- |
| 1 | `patrol_ambush` | 1 | 초반 순찰, 튜토리얼, 약한 압박 | 드론 잔해, 낮은 tension |
| 2 | `sentinel_checkpoint` | 2 | 원거리 적 소개, 회피/접근 판단 | 나노패치 확률, 중간 tension |
| 3 | `wraith_glitch` | 3 | 빠른/도주형 적, 정보 보상 | 데이터 파편, insight |
| 4 | `enforcer_standoff` | 4 | 정예 봉쇄, 준비 없는 진입 처벌 | 접근 키, 큰 tension |

### Balancing Rules

- 한 화면 주변 활성 접촉은 3-4개 이하. 그 이상은 선택이 아니라 소음이 된다.
- 초반 5턴 안에는 Risk 4 접촉을 현재 타일 2칸 이내에 배치하지 않는다.
- 전투 하나당 평균 플레이어 HP 손실 목표:
  - Risk 1: 최대 HP의 10-20%
  - Risk 2: 20-35%
  - Risk 3: 35-50%
  - Risk 4: 50% 이상 또는 소모품 강제
- 회복 아이템은 “실수를 지우는 버튼”이 아니라 “다음 접촉을 감수할 권한”이어야 한다. Risk 1 보상에서 낮은 확률, Risk 2 이상에서 의미 있게 지급한다.
- 도주는 실패 가능성이 있어야 하지만 완전 손해는 아니어야 한다. 도주 성공 시 HP는 보존하되 접촉은 지도에 남겨 우회/재접촉 압박을 만든다.

### Party / Enemy Presentation

- Character dossier는 인물/동료 정체성용이다.
- Enemy UI는 전투 레이더와 roster로 분리한다:
  - 작전 지도: 접촉 glyph, 위치, 위험 수.
  - 전투 보드: 격자 좌표, 적/아군 portrait, HP strip, 플레이어 직접 이동 칸.
  - 전투 roster: 파티와 적의 이름, HP, 좌표, 사망/방어 상태.
- 적 이미지는 `bestiary[*].image`로 연결되어 tactical board와 roster에서 썸네일로 표시된다. 전투 대표 이미지는 `scene_type="combat"` 장면 이미지 생성으로 처리한다.

### Next Implementation Priority

1. `nanopatch`와 `stim_shard`를 `PlayerAction(type="item")`에 실제 효과로 연결.
2. NPC 동료를 `_party.members`로 저장하고 `CombatService.begin()`에서 ally combatant로 투입.
3. 도주 성공 시 접촉을 defeated가 아니라 roaming/alerted로 되돌려 추격 압박 유지.
4. 전투 후 reward를 Codex inventory UI와 단일 출처로 통합.
5. `PlayerAction(type="skill")`을 추가하고 `scenario.json["combat"]["skills"]`의 cooldown/cost/effect를 엔진 판정에 연결.
6. Streamlit custom component가 필요하다고 판단되면 tactical board drag/drop을 도입. 현재는 클릭-투-무브가 안정 기준선.

### Skill Table Direction

Current data lives under `scenario.json["combat"]`, not a separate database table.
The pool now has these tactical domains:

- `weapons`: basic attack profile.
- `skills`: CRPG/JRPG active abilities with role, cost, range, cooldown, tags, and effect payload.
- `allies`: recruitable party members with hidden `recruit_keywords`, unlock flags, portraits, weapons, skills, and stats.
- `bestiary`: enemy stat blocks and portraits.
- `items`: consumables/keys/materials.
- `loot_tables`: weighted drops.
- `encounters`: risk/weight/map distance/enemy groups/rewards.

Recommended ability model:

- **Basic attack**: always available, low decision overhead.
- **Mobility skill**: reposition or escape pressure (`signal_step`).
- **Burst skill**: cooldown-limited high payoff (`overload_strike`).
- **Ranged/control skill**: solves spacing problems (`packet_shot`, future stun/mark).
- **Defensive/support skill**: party survival and tactical tempo (`covering_noise`).
- **Consumable skill**: items are actions, not menu clutter (`patch_protocol`).

Party recruitment should be narrative-first: scenes mention hidden keywords such as
`정세린`, `물거미`, `카이`, `RX-09`; when matching flags or clues are earned, the runtime
can add the ally id to `_party.members`.

---

Streamlit으로 TRPG나 턴제 전략 시뮬레이션(TBS)을 구현할 때의 가장 유연하고 성능이 뛰어난 최적의 아키텍처(Best Practice)를 공유해 드립니다.

실제 오픈소스 Streamlit RPG 게임 레퍼런스(예: *StreamlitLand Adventure*, *streamlit-dungeon*)들이 채택한 방식을 기반으로, 코드 스파게티화를 방지하고 깔끔한 UI 갱신을 보장하는 구조입니다.

---

## 🎯 핵심 설계 사상 (최적화 포인트)

1. **상태 기반 렌더링 (State-driven UI)**: 화면을 직접 그리려 하지 말고, `st.session_state`에 게임 데이터(Grid, Map, Character)를 두고 화면은 이를 '표현'만 하게 만듭니다.
2. **모듈화**: 전투 로직(엔진)과 데이터(DB), UI 표현단을 철저히 분리합니다.
3. **Delta 갱신 지향**: Streamlit은 무조건 전체 페이지를 다시 그리므로, 레이아웃 프레임(`st.container`, `st.empty`)을 명확히 쪼개어 번쩍거림(Flickering)과 데이터 유실을 막아야 합니다.

---

## 🏗️ 최적 구조 및 실제 구현 코드

아래 코드는 턴제 전략(Grid 기반 이동/공격)과 **TRPG 형식의 주사위 판정(Dice Roll) 및 로그 시스템**을 동시에 결합한 실전형 보일러플레이트입니다.

```python
import streamlit as st
import random
import time

# ==========================================
# 1. PAGE CONFIG & BASIC STYLING
# ==========================================
st.set_page_config(page_title="Streamlit TRPG Tactics", layout="wide")

# 게임용 깔끔한 격자(Grid) 디자인을 위한 CSS 
st.markdown("""
    <style>
    .grid-box {
        display: flex; justify-content: center; align-items: center;
        height: 60px; border: 1px solid #4A5568; border-radius: 5px;
        font-weight: bold; font-size: 1.2rem; margin: 2px;
    }
    .player-box { background-color: #2B6CB0; color: white; }
    .enemy-box { background-color: #C53030; color: white; }
    .empty-box { background-color: #2D3748; color: #718096; }
    </style>
""", unsafe_allow_html=True)

# ==========================================
# 2. GAME ENGINE & STATE INITIALIZATION
# ==========================================
class GameEngine:
    @staticmethod
    def init_game():
        if "game_initialized" not in st.session_state:
            st.session_state.game_initialized = True
            st.session_state.player_pos = [0, 0] # [Row, Col]
            st.session_state.enemy_pos = [2, 3]
            st.session_state.player_hp = 50
            st.session_state.enemy_hp = 40
            st.session_state.logs = ["🌲 깊은 숲속 전장에 진입했습니다. (3x4 그리드)"]
            st.session_state.turn = "Player" # Player / Enemy / GameOver

    @staticmethod
    def add_log(text):
        st.session_state.logs.append(text)
        # 로그는 최신 7개까지만 유지
        if len(st.session_state.logs) > 7:
            st.session_state.logs.pop(0)

    @staticmethod
    def roll_dice(sides=20):
        return random.randint(1, sides)

# 초기화 실행
GameEngine.init_game()

# ==========================================
# 3. GAME ACTIONS (전투 및 이동 로직)
# ==========================================
def move_player(direction):
    if st.session_state.turn != "Player": return
    
    r, c = st.session_state.player_pos
    if direction == "위" and r > 0: r -= 1
    elif direction == "아래" and r < 2: r += 1
    elif direction == "왼쪽" and c > 0: c -= 1
    elif direction == "오른쪽" and c < 3: c += 1
    
    # 적 위치와 겹치지 않는지 확인
    if [r, c] == st.session_state.enemy_pos:
        GameEngine.add_log("⚠️ 적이 있는 칸으로는 이동할 수 없습니다!")
    else:
        st.session_state.player_pos = [r, c]
        GameEngine.add_log(f"🏃 플레이어가 [{direction}]으로 이동했습니다.")
        trigger_enemy_turn()

def attack_enemy():
    if st.session_state.turn != "Player": return
    
    # 거리 계산 (Manhattan Distance)
    dist = abs(st.session_state.player_pos[0] - st.session_state.enemy_pos[0]) + \
           abs(st.session_state.player_pos[1] - st.session_state.enemy_pos[1])
           
    if dist > 1:
        GameEngine.add_log("🏹 거리가 너무 멉니다! (공격 범위 1칸 근접)")
        return
        
    # TRPG 주사위 판정 (D20 명중 굴림)
    hit_roll = GameEngine.roll_dice(20)
    GameEngine.add_log(f"🎲 명중 주사위 굴림: **{hit_roll}** (필요치: 8 이상)")
    
    if hit_roll >= 8:
        damage = GameEngine.roll_dice(8) + 2
        st.session_state.enemy_hp -= damage
        GameEngine.add_log(f"💥 공격 성공! 적에게 **{damage}**의 피해를 입혔습니다.")
        if st.session_state.enemy_hp <= 0:
            st.session_state.turn = "GameOver"
            GameEngine.add_log("🏆 적을 물리치고 승리했습니다!")
            return
    else:
        GameEngine.add_log("💨 공격이 빗나갔습니다!")
        
    trigger_enemy_turn()

def trigger_enemy_turn():
    """플레이어 행동 후 적의 턴 자동 AI 시뮬레이션"""
    st.session_state.turn = "Enemy"
    # 화면 갱신을 통해 Enemy Turn 상태를 먼저 유저에게 인지시킴
    st.rerun()

# ==========================================
# 4. ENEMY AI INTERACTION (적 턴 처리)
# ==========================================
if st.session_state.turn == "Enemy":
    # 적 턴 연출을 위한 딜레이 (유저 체감용)
    time.sleep(0.8)
    
    er, ec = st.session_state.enemy_pos
    pr, pc = st.session_state.player_pos
    dist = abs(er - pr) + abs(ec - pc)
    
    if dist <= 1:
        # 사정거리 안이면 공격
        hit_roll = GameEngine.roll_dice(20)
        if hit_roll >= 10:
            damage = GameEngine.roll_dice(6) + 1
            st.session_state.player_hp -= damage
            GameEngine.add_log(f"👹 적의 반격! 플레이어가 **{damage}**의 피해를 입었습니다.")
            if st.session_state.player_hp <= 0:
                st.session_state.turn = "GameOver"
                GameEngine.add_log("💀 플레이어가 사망했습니다... 게임 오버.")
        else:
            GameEngine.add_log("🛡️ 적의 공격을 회피했습니다!")
    else:
        # 사정거리 밖이면 플레이어 방향으로 1칸 이동 (간단한 AI)
        if er < pr: er += 1
        elif er > pr: er -= 1
        elif ec < pc: ec += 1
        elif ec > pc: ec -= 1
        st.session_state.enemy_pos = [er, ec]
        GameEngine.add_log("👣 적이 당신을 향해 한 칸 다가옵니다.")
        
    if st.session_state.turn != "GameOver":
        st.session_state.turn = "Player"
    st.rerun()

# ==========================================
# 5. UI LAYOUT RENDERING (화면 출력부)
# ==========================================
st.title("⚔️ TRPG Tactics Simulator")

# 상단 대시보드 (상태)
status_col1, status_col2, status_col3 = st.columns(3)
status_col1.metric("플레이어 HP", f"{st.session_state.player_hp} / 50")
status_col2.metric("보스 몬스터 HP", f"{max(0, st.session_state.enemy_hp)} / 40")
status_col3.subheader(f"⏳ 현재 턴: {st.session_state.turn}")

main_left, main_right = st.columns([3, 2])

with main_left:
    st.markdown("### 🗺️ 전장 그리드 Map")
    # 3x4 격자 전장 동적 렌더링
    for r in range(3):
        cols = st.columns(4)
        for c in range(4):
            if [r, c] == st.session_state.player_pos:
                cols[c].markdown('<div class="grid-box player-box">🧙 P</div>', unsafe_allow_html=True)
            elif [r, c] == st.session_state.enemy_pos and st.session_state.enemy_hp > 0:
                cols[c].markdown('<div class="grid-box enemy-box">👹 E</div>', unsafe_allow_html=True)
            else:
                cols[c].markdown('<div class="grid-box empty-box">.</div>', unsafe_allow_html=True)

    # 컨트롤러 패널
    st.markdown("### 🎮 액션 명령")
    if st.session_state.turn == "Player":
        ctrl_col1, ctrl_col2, ctrl_col3 = st.columns([1, 2, 1])
        with ctrl_col2:
            st.button("🔼 위", on_click=move_player, args=("위",), use_container_width=True)
        
        ctrl_col1, ctrl_col2, ctrl_col3 = st.columns(3)
        with ctrl_col1:
            st.button("◀️ 왼쪽", on_click=move_player, args=("왼쪽",), use_container_width=True)
        with ctrl_col2:
            st.button("💥 1칸 근접 공격", on_click=attack_enemy, use_container_width=True, type="primary")
        with ctrl_col3:
            st.button("▶️ 오른쪽", on_click=move_player, args=("오른쪽",), use_container_width=True)
            
        ctrl_col1, ctrl_col2, ctrl_col3 = st.columns([1, 2, 1])
        with ctrl_col2:
            st.button("🔽 아래", on_click=move_player, args=("아래",), use_container_width=True)
    elif st.session_state.turn == "Enemy":
        st.warning("적의 턴 행동을 계산 중입니다...")
    else:
        if st.button("🔄 게임 리셋", use_container_width=True):
            del st.session_state.game_initialized
            st.rerun()

with main_right:
    st.markdown("### 📜 전투 로그 (TRPG Console)")
    # 로그창 최신 순으로 깔끔하게 출력
    log_container = st.container(border=True)
    for log in reversed(st.session_state.logs):
        log_container.write(log)

```

---

## 🛠️ 실제 레퍼런스 및 고도화 팁

1. **콜백 패턴 (`on_click`) 활용**:
* 위 코드에서 버튼을 생성할 때 `on_click=move_player, args=("위",)` 형식을 썼습니다. 버튼 누름과 동시에 상태 변화 함수를 트리거하는 이 방식이 Streamlit에서 입력 밀림 현상(Lag)을 방지하는 가장 최적의 설계입니다.


2. **사운드 및 시각 효과 이펙트**:
* 실제 상용 오픈소스 툴들은 몰입감을 위해 공격 성공 시 `st.audio()`를 숨겨두었다가 재생하거나, `st.balloons()` 같은 이벤트를 분기점에 배치하여 웹 브라우저 효과를 극대화합니다.


3. **데이터의 외부 파일화**:
* 맵 배치 정보나 몬스터 스탯 스키마는 파이썬 코드 내부에 선언하지 않고, `map.json` 이나 `monster.yaml` 파일로 분리한 뒤 `st.cache_data`로 불러와 사용하면 Streamlit 앱의 메모리 오버헤드를 대폭 줄일 수 있습니다.
