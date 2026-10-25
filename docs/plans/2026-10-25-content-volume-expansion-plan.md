# Mythos 2.0 — 전체 게임플레이 컨텐츠 & 볼륨 확장 계획 (Stage / Enemy / Boss / Encounter / Event / Card Expansion)

작성일: 2026-10-25  
선행 작업: `docs/plans/2026-10-25-combat-stats-dot-replayability-plan.md` (`00146-cuf` 배포 완료)

---

## 1. 배경 및 목표

직전 업데이트(`00146-cuf`)를 통해 **5대 스탯 전투 연동(`STR/AGI/INT/CHA/OBS`)**, **결정론적 회피(`evade`) & 치명타(`focus >= 4`)**, **3대 지속피해(`burn`·`bleed`·`corrode`)**, **다회차 변칙 선택 및 엔딩 잔향(World Echoes)** 등 **전투 메커니즘의 깊이**가 확보되었다.

그러나 플레이어가 마주하는 **물리적 게임 볼륨(스테이지 층수, 적 종류, 보스 수, 전투 맵 배치, 내러티브 이벤트 수)** 은 여전히 기존 규모에 머물러 있다:
- **적(Enemies)**: 일반/미니언 15종 + 엘리트 9종 = 24종 (적군은 아직 `bleed`·`corrode`·`evade` 기믹을 전혀 사용하지 않음)
- **보스(Bosses)**: Act 1(2종: 해태·주작), Act 2(2종: 잔향 포식자·아라크네), **Act 3(1종 고정: 관리자 IX)** = 총 5종
- **전투 인카운터(Encounters)**: 총 39개 (일반 22 + 이벤트 매복 3 + 엘리트 9 + 보스 5)
- **스테이지 길이(Map Rows)**: 막(Act)당 일반 7행 + 보스 1행 = 8행 (3막 총 24노드, 1판 약 25분)
- **내러티브 이벤트(Events)**: 총 70개 (오프닝·영입·동료 서사 포함)

본 계획은 **새로 도입된 전투 시스템(출혈·부식·회피·치명타·스탯)을 적·보스·맵·이벤트 전반에 녹여내면서 전체 컨텐츠 볼륨을 약 35~45% 확대**하는 것을 목표로 한다.

---

## 2. 컨텐츠 볼륨 확장 전/후 비교표

| 컨텐츠 영역 | 현재 (`00146-cuf`) | 확장 목표 | 증가량 | 핵심 변화 |
| :--- | :---: | :---: | :---: | :--- |
| **스테이지 길이 (1회차)** | 3막 × 8행 (24노드) | **3막 × 9행 (27노드)** | **+3층 (막당 +1층)** | 중반 빌드업 구간 확대로 성장·조합 체감 강화 (플레이타임 32~40분) |
| **일반 적 (Normal/Minion)** | 15종 | **21종** | **+6종 (막당 +2)** | 출혈(`bleed`)·부식(`corrode`)·회피(`evade`) 구사 적군 대거 투입 |
| **엘리트 적 (Elites)** | 9종 (막당 3종) | **12종 (막당 4종)** | **+3종 (막당 +1)** | 강제 이동+출혈 연계, 광역 부식, 분대 회피 장막 엘리트 추가 |
| **보스 (Bosses)** | **5종** (2 / 2 / 1) | **8종 (3 / 3 / 2)** | **+3종 (막당 +1)** | 1막 `백호`·2막 `현무`·**3막 대체 최종 보스 `설계자 오메가`** 추가 |
| **전투 인카운터 (Encounters)** | 39개 | **54개** | **+15개 (막당 +5)** | 신규 적 조합·지형 퍼즐·호위/생존/환경처치 전술 맵 15개 추가 |
| **내러티브 이벤트 (Events)** | 70개 | **79개** | **+9개 (막당 +3)** | 신규 스탯 체크·DoT/회피/치명타 카드 및 임플란트 보상 사건 추가 |
| **카드 (Cards)** | 96장 | **104장** | **+8장** | 적 회피 파훼, 출혈/부식 격발, 스탯 비례 전술·공격 카드 추가 |

---

## 3. 세부 설계 (Waves 1~4)

### Wave 1 — 신규 적 6종 & 신규 엘리트 3종 + 신규 보스 3종 (`v2/content/enemies.ts`, `taunts.ts`, `spriteManifest.ts`, `artManifest.ts`)

#### 1-A. Act 1 (C-17 Blackout) 신규 적·엘리트·보스 (4종)
1. **`ripper_hound` (절단견 / Ripper Hound — Normal, HP 15, Move 4)**
   - **기믹**: 빠른 근접 추격자. `톱니 엄니(Jagged Fang)` 근접 공격(피해 3 + **`bleed 2`**) 및 `물고 흔들기(Tear & Shove)`(피해 4 + **`push 1`** — 밀려나는 즉시 출혈 틱 발동).
2. **`stalker_drone` (암살 드론 / Stalker Drone — Normal, HP 12, Move 4, Flying)**
   - **기믹**: 비행 저격기. `광학 위장(Optical Camo)` 버프로 **자신에게 `evade 1` + 방어막 3** 부여, `바늘 레이저(Needle Laser)` 직선 사격(피해 4 + **`bleed 1`**). 단발 강타 전에 약한 타격으로 회피를 먼저 벗겨야 함.
3. **`rust_hulk` (부식 처리기 / Rust Hulk — Elite, HP 38, Armor 1, Move 2)**
   - **기믹**: 폐기물 중장갑 기체. `산성 오수 살포(Sludge Lob)` 십자 투척(피해 3 + **`corrode 2`**)으로 아군 방어도를 영구 손상시키며, 1턴 차징 `폐기 압착(Trash Crush)`(주변 사각형 피해 8 + `weak 1`) 구사.
4. **`baekho_stalker` (백호 / BAEKHO — Act 1 Boss #3, HP 60, Move 4)**
   - **컨셉**: 해태(중장갑 포격)·주작(화염 장판)과 대비되는 **초고속 기동·회피·출혈 강습 보스**(사방신 컨셉 완성).
   - **패턴**: `질풍 돌진(Gale Charge, 피해 5 + bleed 2)`, `발톱 갈기(Sharpen Claws, 자신에게 evade 1 + 방어막 5)`, `사냥개 호출(Summon ripper_hound × 1)`, 2페이즈(HP 50% 이하) 1턴 차징 `백호열풍(White Tiger Tempest, 한 줄 전체 피해 9 + bleed 2 + push 1)`.

#### 1-B. Act 2 (Undercity Market) 신규 적·엘리트·보스 (4종)
1. **`blade_dancer` (칼춤꾼 / Blade Dancer — Normal, HP 20, Move 4)**
   - **기믹**: 야시장의 근접 자객. `제비베기(Swallow Cut)` 돌진(피해 5 + **`bleed 2`**), `환영 보법(Mirage Step)` 버프(**`evade 1` + 방어막 4**, 쿨다운 2).
2. **`acid_alchemist` (폐수 연금술사 / Acid Alchemist — Normal, HP 18, Move 3)**
   - **기믹**: 후열 플라스크 투척병. `부식병 투척(Acid Flask)` 십자 범위(피해 3 + **`corrode 2`**), `신경 가시(Nerve Gas)` 직선 사격(피해 4 + `slow 1`).
3. **`crimson_executioner` (혈흔 집행자 / Crimson Executioner — Elite, HP 45, Armor 1, Move 2)**
   - **기믹**: `갈고리 회전베기(Hooked Cleave)` 가로 3칸(`row`, 피해 5 + **`bleed 2`** + **`push 1`** — 밀치면서 출혈 즉시 발동), 1턴 차징 `단두대(Guillotine)`(주변 4칸 피해 10 + `bleed 2`).
4. **`hyeonmu_bastion` (현무 / HYEONMU — Act 2 Boss #3, HP 74, Armor 2, Move 2)**
   - **컨셉**: 잔향 포식자(흡혈)·아라크네(감전 군체)와 대비되는 **중장갑·부식(Corrode)·철벽 요새 보스**.
   - **패턴**: `부식 박격포(Corrosive Mortar, 십자 피해 4 + corrode 2)`, `중력 해일(Gravity Undertow, 직선 피해 5 + pull/push)`, `소각 드론 사출(Summon purge_drone × 2)`, 2페이즈(HP 66%)/3페이즈(HP 33%) 전환 시 방어막 + 가시(`thorns 3`) 및 1턴 차징 `현무 대붕괴(Abyssal Shellshock, 3×3 피해 10 + corrode 2)`.
   - **공략 포인트**: 장갑이 2로 높고 단단하므로 플레이어의 **부식(`corrode`)·관통(`pierce`)·치명타(`focus >= 4`)** 빌드가 빛을 발함.

#### 1-C. Act 3 (The ARK Spire) 신규 적·엘리트·보스 (4종)
1. **`phantom_assassin` (팬텀 암살병 / Phantom Assassin — Normal, HP 22, Move 4)**
   - **기믹**: ARK 특무 암살자. `위상 은신(Phase Cloak, evade 1 + 방어막 5)` + `동맥 절개(Artery Slice, 근접 피해 5 + bleed 2)` + `추적 단검(Tracking Dart, 사거리 6 피해 3 + mark 2)`.
2. **`bio_purger` (생체 정화병 / Bio-Purger — Normal, HP 26, Armor 1, Move 2)**
   - **기믹**: `용해 광선(Dissolve Beam, 사거리 4 직선 광선 피해 5 + corrode 2)` + `오염 분무(Bio Spray, 주변 4칸 피해 4 + weak 1)`.
3. **`eclipse_valkyrie` (이클립스 발키리 / Eclipse Valkyrie — Elite, HP 48, Armor 2, Move 3, Flying)**
   - **기믹**: 비행 지휘 엘리트. `위상 장막(Phase Aegis, 아군 전체 방어막 5)` + `하강 급습(Dive Lance, 돌진 피해 6 + bleed 2)` + 1턴 차징 `이클립스 심판(Eclipse Judgment, 직선 광선 피해 9 + corrode 2)`.
4. **`architect_omega` (설계자 오메가 / Architect Omega — Act 3 Boss #2, HP 104, Armor 2, Move 3, Flying)**
   - **컨셉**: Act 3의 고정 보스였던 `관리자 IX`와 번갈아(또는 시드에 따라) 등장하는 **제2 최종 보스(IX의 무력 집행 아바타)**.
   - **패턴**:
     - `차원 절단(Dimensional Sever)`: 직선 광선 피해 8 + **`bleed 2`**.
     - `엔트로피 투하(Entropy Drop)`: 3×3 투척 피해 5 + **`corrode 2`**.
     - `위상 도약(Phase Shift)`: 아군 전체 방어막 7 + 자신에게 **`evade 1`** (2단계부터 해금).
     - `암살대 소집(Summon Phantoms)`: `ark_sentry` 2기 소환.
     - `영점 붕괴(Zero-Point Collapse)`: 2단계 1턴 차징 3×3 피해 13 + `corrode 2`.
     - `종말 프로토콜(Omega Protocol)`: 3단계 1턴 차징 한 줄 전체 피해 15 + `bleed 3` + `trace_bug` 추가.
   - **스토리/연출 연동**: `CombatScreen.tsx`, `run.ts`, `taunts.ts`, `ix.ts`에서 `a3_boss_architect` 클리어 시에도 동일하게 IX의 거울(`ixMirror`) 및 4대 엔딩 선택으로 매끄럽게 진입.

---

### Wave 2 — 전투 인카운터 15종 추가 & 스테이지 맵 확장 (`v2/content/encounters.ts`, `v2/engine/map.ts`)

#### 2-A. 신규 인카운터 15종 (총 39개 → 54개)
- **Act 1 (+5개)**:
  1. `a1_n2_pack_hunt` (사냥개 무리 / Pack Hunt — Normal): `ripper_hound` × 2 + `scrap_drone` × 1 (지형: 위험 타일 + 엄폐물, 보너스: `untouched`).
  2. `a1_n2_acid_vat` (폐수 처리장 / Acid Vat — Normal): `stalker_drone` × 1 + `maintenance_drone` × 2 (지형: 양측 낭떠러지 `void`, 보너스: `environment 1`).
  3. `a1_n2_skyline_snipers` (옥상 저격선 / Skyline Snipers — Normal): `stalker_drone` × 2 + `ripper_hound` × 1 (보너스: `turn_limit 5`).
  4. `a1_elite_rust_hulk` (부식 처리기 / The Rust Hulk — Elite): `rust_hulk` + `ripper_hound` + `scrap_drone`.
  5. `a1_boss_baekho` (백호 / BAEKHO — Boss): `baekho_stalker` + `ripper_hound` + `scrap_drone`.
- **Act 2 (+5개)**:
  6. `a2_n2_blade_alley` (칼날 골목 / Blade Alley — Normal): `blade_dancer` × 2 + `glitch_echo` × 1 (보너스: `untouched`).
  7. `a2_n2_alchemist_lab` (연금술 공방 / Alchemist Lab — Normal): `acid_alchemist` × 2 + `riot_enforcer` × 1 (지형: 위험 타일 다수, 보너스: `environment 1`).
  8. `a2_n2_blood_ring` (지하 투기장 / Underground Ring — Normal): `blade_dancer` + `acid_alchemist` + `shock_trooper` (보너스: `turn_limit 5`).
  9. `a2_elite_executioner` (혈흔 집행자 / Crimson Executioner — Elite): `crimson_executioner` + `blade_dancer` + `glitch_echo`.
  10. `a2_boss_hyeonmu` (현무 / HYEONMU — Boss): `hyeonmu_bastion` + `acid_alchemist` + `purge_drone`.
- **Act 3 (+5개)**:
  11. `a3_n2_phantom_hall` (환영 회랑 / Phantom Hall — Normal): `phantom_assassin` × 2 + `ark_warden` × 1 (보너스: `turn_limit 5`).
  12. `a3_n2_bio_chamber` (생체 정화실 / Bio-Purge Chamber — Normal): `bio_purger` × 2 + `ark_executor` × 1 (지형: `void` + `hazard`, 보너스: `environment 1`).
  13. `a3_n2_execution_deck` (처형 갑판 / Execution Deck — Normal): `phantom_assassin` + `bio_purger` + `hunter_spider` (보너스: `untouched`).
  14. `a3_elite_valkyrie` (이클립스 발키리 / Eclipse Valkyrie — Elite): `eclipse_valkyrie` + `phantom_assassin` + `ark_sentry`.
  15. `a3_boss_architect` (설계자 오메가 / Architect Omega — Boss): `architect_omega` + `ark_warden` × 2.

#### 2-B. 스테이지 맵 볼륨 확장 (`v2/engine/map.ts`)
- **막(Act)당 층수 확대**: `MAP_ROWS = 7` → **`MAP_ROWS = 8`** (일반 0~7행 + 8행 보스 = 막당 9층, 3막 총 **27노드**).
  - Row 0: 시작 전투
  - Row 1~6 (6개 중반 행): 전투 / 이벤트 / 엘리트(Row 2~6) / 상점(Row 2~6) / 보물(Row 3 고정 + 추가 쿼터)
  - Row 7 (`MAP_ROWS - 1`): 보스 직전 캠프(휴식처)
  - Row 8 (`BOSS_ROW`): 액트 보스
- **효과**: 한 막에서 노드를 1개 더 밟게 되어(전체 런 기준 +3노드), 새로 늘어난 적·이벤트·카드 풀을 충분히 경험하고 덱/임플란트 시너지를 완성할 여유가 생김.

---

### Wave 3 — 신규 카드 8종 & 내러티브 이벤트 9종 추가 (`v2/content/cards.ts`, `v2/content/eventsMore.ts`)

#### 3-A. 신규 전술·시너지 카드 8종 (`v2/content/cards.ts`, 총 96장 → 104장)
적들의 회피(`evade`)를 카운터하거나 출혈(`bleed`)·부식(`corrode`)·치명타(`focus`)를 폭발시키는 카드 8종:
1. **`tracer_barrage` (예광탄 난사 / Tracer Barrage — Common, Attack, 1코스트)**: 사거리 4 직선, `2 피해 × 2회` + `mark 1`. (연타로 적의 `evade`를 즉시 벗겨내고 본타를 꽂는 카운터 카드)
2. **`serrated_shove` (톱니 밀치기 / Serrated Shove — Common, Attack, 1코스트)**: 인접 1칸 `4 피해`(STR 비례) + `bleed 2` + `push 1` (출혈을 걸자마자 1칸 밀어 즉시 출혈 이동 틱까지 터뜨리는 콤보 카드).
3. **`rust_burst` (부식 파열 / Rust Burst — Uncommon, Tactic, 1코스트)**: 사거리 4 단일 대상에게 `corrode 2` + `4 관통 피해`(INT 비례). 업그레이드 시 `corrode 3` + `6 관통 피해`.
4. **`evasive_roll` (회피 구르기 / Evasive Roll — Common, Skill, 1코스트)**: 최대 2칸 빈 칸으로 도약(`leap`) + `evade 1` + 방어막 3 (AGI 비례).
5. **`bloodhound_rush` (사냥개의 추격 / Bloodhound Rush — Uncommon, Attack, 1코스트)**: 직선 3칸 돌진(`dash`) 후 인접 적에게 `5 피해` + `bleed 2` + `focus 2`.
6. **`corrosive_shrapnel` (산성 파편탄 / Corrosive Shrapnel — Uncommon, Attack, 2코스트)**: 사거리 3 주변(또는 직선) 전체 적에게 `4 피해` + `corrode 2` + `expose 1`.
7. **`assassin_focus` (암살자의 호흡 / Assassin's Breath — Uncommon, Skill, 0코스트, 소멸)**: 즉시 `focus 4` 획득(다음 4+ 공격 확정 치명타!) + `evade 1` 획득 (OBS 비례).
8. **`crimson_finale` (핏빛 피날레 / Crimson Finale — Rare, Attack, 2코스트, 소멸)**: 사거리 3 단일 대상에게 `8 관통 피해`(STR/AGI 비례) + `bleed 4` + 대상의 현재 `bleed` 즉시 1회 강제 격발(`push 1`).

#### 3-B. 신규 내러티브 이벤트 9종 (`v2/content/eventsMore.ts`, 막당 3종씩 총 70개 → 79개)
- **Act 1 (+3종)**:
  1. `a1_red_clinic` (골목길 무허가 봉합소): AGI/INT 판정 또는 크레딧 지불로 출혈 카드(`artery_rip`/`serrated_shove`) 또는 체력 회복 + `STR +1`.
  2. `a1_rust_cistern` (부식된 폐수 저장조): STR/OBS 판정으로 부식 카드(`corrosive_rain`/`rust_burst`) 또는 `acid_injector` 임플란트 획득.
  3. `a1_blind_spot_relay` (감시망 사각지대 중계기): CHA/OBS 판정으로 추적도(`trace`) 감소 + `OBS +1` 또는 `tracer_barrage` 획득.
- **Act 2 (+3종)**:
  4. `a2_crimson_pit` (하층 철창 투기장): STR/AGI 판정으로 크레딧 대량 획득 + `bloodhound_rush` 카드 또는 `serrated_wire` 임플란트.
  5. `a2_alchemist_vial` (폐수 연금술사의 거래): INT/CHA 판정으로 `corrosive_shrapnel`/`pandemic_pulse` 획득 또는 `INT +1`.
  6. `a2_shadow_broker` (그림자 브로커의 사격장): OBS/AGI 판정으로 `vital_snipe`/`assassin_focus` 획득 또는 `hawkeye_lens` 임플란트.
- **Act 3 (+3종)**:
  7. `a3_valkyrie_hangar` (발키리 주기장 해킹): INT/AGI 판정으로 `phantom_feint`/`evasive_roll` 강화판 획득 + `AGI +1`.
  8. `a3_bio_disposal` (첨탑 생체 폐기 구역): STR/INT 판정으로 `crimson_finale` 획득 또는 최대 체력 +6.
  9. `a3_omega_terminal` (오메가 백업 터미널): OBS/CHA 판정으로 모든 동료 호감도(`bond`) 상승 + `CHA/OBS +1` 및 희귀 임플란트 획득.

---

### Wave 4 — 밸런스 시뮬레이션, E2E 검증 및 프로덕션 배포

1. **콘텐츠 무결성 및 쿼터 검증 (`content.test.ts`, `map.test.ts`, `narrative.test.ts`)**:
   - 모든 신규 적(12종), 인카운터(15종), 카드(8종), 이벤트(9종)의 한/영 텍스트(`ko`/`en`), 스프라이트·아이콘·배경 아트 매핑, 보드 배치 합법성, 보너스 목표 비율(30~60%) 검증.
   - Act 3 멀티 보스(`a3_boss_ix` 및 `a3_boss_architect`) 양쪽 모두 최종 보스전 승리/패배 처리, IX 대사/거울/엔딩 분기, 리플레이 검증기(`replay_verify.mjs`)와 100% 호환되는지 테스트.
2. **밸런스 측정 (`simulateRun` 3 × 360 시드 블록)**:
   - 9행 맵(`MAP_ROWS = 8`) + 신규 적/엘리트/보스 풀에서의 아키타입별 승률 및 보스 승률 확인.
3. **전체 게이트(`make check`, `make test-e2e-v2`) & Cloud Run 배포**:
   - 로컬 게이트 전부 그린 확인 후 `https://mythos-api-k62nky5rrq-uc.a.run.app` 프리뷰 배포 → 검증 → 100% 트래픽 승격.
