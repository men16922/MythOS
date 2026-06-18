# Neo-Seoul 대규모 콘텐츠 확장 자율 수행 계획 (Token Exhaustion Mode)

최종 갱신: 2026-06-11
상태: `[x]` 완료

이 파일은 안티그래비티 에이전트가 `/goal` 슬래시 명령어를 통해 자율 수행할 **초대형 확장 체크리스트**입니다. 
단순한 마이너 업데이트가 아닌, Neo-Seoul 시나리오의 세계관 깊이와 전투 전술 다양성을 비약적으로 증가시키기 위한 대규모 자원 및 분기 확장을 목표로 합니다.

---

## 📋 대규모 확장 상세 명세

### 1. 신규 캐릭터 3인 추가
*   **태오 (Tae-o) «사냥개»** (탈주 집행관):
    *   무기: `heavy_carbine` (헤비 카빈 - 2d6 원거리)
    *   스킬: `overload_strike`, `nanoshield_projector`
    *   기믹: 전술적 정면 돌파. 생존에 강하나 동행 시 추적도(Tension)가 매 턴 추가 누적됩니다.
*   **한 (Han) «신호 파괴자»** (비접속자 해커):
    *   무기: `emp_blaster` (EMP 블래스터 - 1d10, 기계 추가 피해)
    *   스킬: `emp_pulse`, `system_intrusion`
    *   기믹: 전자전 특화. 기계 제어 및 보안 차단. 아군 해킹 능력치(Intelligence) 판정 가중치를 제공합니다.
*   **수아 (Su-ah) «잔향 가공사»** (기억의 대장장이):
    *   무기: `glitch_dagger` (글리치 단검 - 1d6, 방어 무시)
    *   스킬: `memory_resonance`, `combat_reboot`
    *   기믹: Shard/Clue 자원을 장비와 버프로 치환하는 서포터.

### 2. 신규 적 4종 추가 (Bestiary)
*   **집행 특전대 (Shock Trooper)**: 중장갑 사격병. 아군 드론에게 물리 방어막을 씌워줍니다. (HP 20, Armor 2, Ranged)
*   **신호 추적 기계 (Tracker Spider)**: 기동성 높은 암살용 스파이더 드론. 은신(Covering Noise) 상태를 레이더로 해제합니다. (HP 12, Speed 5, Melee)
*   **자동 중진압 전차 (Suppression Mech)**: 중형 4각 보스급 전차. 광역 쉴드 파괴 포격을 가합니다. (HP 36, Armor 5, Ranged AoE)
*   **인공지능 소각기 (Purge Drone)**: 화염 방사기를 장착한 소형 드론. 매 턴 화상 지속 피해(DoT)를 줍니다. (HP 10, Melee DoT)

### 3. 신규 스킬 6종 추가 (Combat Skills)
*   `emp_pulse`: 주변 2칸 내 기계 적들을 1턴간 기절(Stun). (Focus 3, CD 3)
*   `nanoshield_projector`: 지정 아군에게 2턴간 방어 +3 실드 부여. (Focus 2, CD 3)
*   `glitch_blink`: 3칸 순간 이동 후, 원래 자리에 적의 어그로를 끄는 신호 분신(Decoy) 생성. (Focus 3, CD 4)
*   `signal_overdrive`: 2턴간 행동력(Speed) +2 및 치명타 확률 상승. (Focus 3, CD 3)
*   `memory_resonance`: 수집한 단서(Clue)의 개수에 비례하여 적에게 정신 피해를 줍니다. (Focus 4, CD 4)
*   `system_intrusion`: 기계 적 하나를 1턴간 아군으로 해킹하여 조종합니다. (Focus 4, CD 5)

### 4. 신규 장비 및 소모품 6종 추가
*   무기: `glitch_dagger` (Melee, 방어 관통), `emp_blaster` (Ranged, 보호막 파괴)
*   장비: `heavy_exosuit` (최대 HP +4, Speed -1), `stealth_cloak` (회피율 +2, 은신 판정 유리)
*   소모품: `emp_grenade` (광역 기계 마비), `overload_stim` (Focus +5 즉시 획득, HP -2 피해)

### 5. 신규 작전 지도 분기 및 Anchor 추가
*   **제3막: 데이터 소각로 (Data Incinerator)** (Anchor): 대상자를 구출할지(Humanity), 로그를 강탈할지(Insight), 폭파시킬지(Tension 상승/Dominance) 결정하는 극적인 도덕적 선택지 분기.
*   **제4막: 지하철 통제 중추 (Subway Control Hub)** (Anchor): 수송 열차를 해킹하여 은신처로 유도할지(Stability 보너스) 혹은 스파이어 장벽을 들이받는 무기로 쓸지(Dominance) 결정.

---

## 📋 세부 체크리스트

### [x] 1단계: Visual Asset 매핑 완료 및 경로 검증
- [x] 생성된 이미지들 (`characters/tae-o.png`, `enemies/shock-trooper.png`, `enemies/tracker-spider.png`, `concept/05-data-incinerator.png`)이 정상 경로에 존재하고 읽어지는지 검증 코드 작성.
- [x] 신규 에셋 6종 (한, 수아, 중진압 전차, 소각 드론, 지하철 통제 중추 등)에 대한 FLUX 프롬프트를 `scripts/gen_neo_seoul_art.py`에 추가.
- [x] (로컬 MPS 미작동 시) 에이전트의 내부 `generate_image` 툴을 사용해 신규 추가 에셋들의 최고 품질 비주얼을 생성하여 `/resources` 하위 폴더에 복사/배치.

### [x] 2단계: scenario.json 데이터 스키마 대규모 확장
- [x] `character_map` 및 `concept_map`에 신규 인물/배경 6종 추가.
- [x] `characters` 목록에 태오, 한, 수아, 지은 정보 및 대화 키워드 추가.
- [x] `combat.weapons`에 신규 무기 3종 (`glitch_dagger`, `emp_blaster`, `heavy_carbine` 등) 정의.
- [x] `combat.skills`에 6종의 신규 전술 스킬 정의 및 습득 조건(requires, epiphany) 게이팅 설정.
- [x] `combat.allies`에 태오, 한, 수아의 동료 데이터 및 스펙 설정.
- [x] `combat.bestiary`에 Shock Trooper, Tracker Spider, Suppression Mech, Purge Drone의 데이터 및 combat_images 매핑.
- [x] `combat.items` 및 `combat.loot_tables`에 신규 아이템 6종과 전리품 획득 가중치 갱신.
- [x] `combat.encounters`에 신규 교전 4종 (`shock_trooper_patrol`, `tracker_ambush`, `mech_siege`, `purge_incineration`) 설계.
- [x] `route_map.layers`와 `route_map.combat_encounters`에 신규 앵커(소각로, 지하철 중추) 및 전투 조우 배치 풀 갱신.

### [x] 3단계: story_bible/bible.json 데이터 대폭 보강
- [x] 신규 캐릭터 3인(태오, 한, 수아)의 배경, 성격, 전술 지침을 담은 Story Bible 엔트리 작성.
- [x] 신규 거점 분기 2종(데이터 소각로 구역, 지하철 통제 중추)의 선택과 대가, 묘사 기준을 정하는 pacing/location 엔트리 작성.
- [x] 각 엔딩(`ending_safe_refuge`, `ending_code_rewrite` 등)에서 신규 캐릭터들과의 누적 관계성이 미치는 서사적 영향 및 Echo 변주 설명 보강.

### [x] 4단계: LLM 내러티브 프롬프트와의 정합성 및 시나리오 룰 정정
- [x] `scenario.json`의 `system_prompt`와 `session_design.chapter_gates`에 신규 추가된 분기 조건(소각로 해킹 여부, 태오 영입 여부 등)을 반영하도록 prompt contract 갱신.
- [x] `RuntimeSessionService`가 신규 캐릭터 동료화 플래그 및 신규 조우 난이도를 올바르게 판단하는지 데이터 로드/캐시 검증.

### [x] 5단계: 대규모 자동화 테스트 및 E2E 기동 검증
- [x] `tests/test_route_runtime.py` 및 `tests/test_session_combat.py`에 신규 적/스킬/장비의 로딩 및 전술 판정 정합성 테스트 케이스 작성.
- [x] `make test`를 실행하여 291개 이상의 테스트 케이스가 무결하게 통과하는지 확인.
- [x] `make lint` 및 `make typecheck`를 수행하여 코드 오염 방지.
- [x] `make smoke-local`을 기동하여 시나리오 초기 부팅, 맵 생성, 전투 보드 진입까지 에러가 없는지 최종 검증.

---

## 🎯 완료 조건
모든 항목에 `[x]`가 채워지고, 회귀 테스트 및 런타임 스모크가 완벽히 통과하면 작업을 종료합니다.
