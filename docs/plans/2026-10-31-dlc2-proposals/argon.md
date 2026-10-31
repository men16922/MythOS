# Mythos 2.0 게임 개선 · 콘텐츠 확장 · DLC 2 제안서 (Argon)

## 요약
1. **최우선 제안 — 보드 위 '상호작용 코어'와 후반부 전장 목표 변주:** 현재 4~6막 조우 47종이 100% 적 전멸(`kill_all`) 단일 구조(`src/mythos_ui/src/v2/content/packs/*/encounters.ts`)여서 배경만 바뀌고 전술 퍼즐이 같아지는 문제를, 밀쳐서 터뜨리는 보드 오브젝트와 비전멸 목표 교체로 먼저 깬다.
2. **기존 콘텐츠 도달성 즉시 복구(신규 에셋 0):** 90판 실측에서 비기본 카드 진화 9종 중 6종이 `0/90`판(`src/mythos_ui/src/v2/engine/run.ts:368-423`), 듀오 궁극기가 `0/90`판(`450`판 중 `7`판)만 발동하는 사각지대를 보상·영입 가중치(`×1.7`)와 봇 평가식(`src/mythos_ui/src/v2/engine/combatSim.ts:54-64`) 교정으로 살린다.
3. **DLC 2 단일 콘셉트 — 《세계:접속 — 역류(Counter-Signal)》:** 막을 7~9막으로 늘리는 피로한 수직 확장이 아니라, **'전력망 점등/암전(Blackout Grid)'** 단일 규칙으로 보드의 시야와 물리 충돌을 뒤집는 **표준 3막 길이(30분)의 병렬 전술 캠페인**이다.
4. **볼륨 대신 장면과 발견:** 카드 수(현 176장, `src/mythos_ui/src/v2/content/index.ts`)를 늘리는 대신 아키타입 대표 진화 5종, 현재 0곳인 5·6막 CRPG 구역 4곳(`src/mythos_ui/src/v2/content/crpg/index.ts:24-40`), `1.0` 3대 반전 물증 장면(`branch 1.0` `resources/neo-seoul/scenario.json`)만 좁고 깊게 꽂는다.
5. **검증 순서:** 오너의 F1~F4 손맛 판정(`docs/test/mythos2_fun_check.md` §8~11) 직후, 아트워크 없이 샌드박스(`/?sandbox=combat&mute=1`)에서 '전원 콘덴서 폭발 + 암전 전환' 프로토타입 1전투로 손맛을 먼저 검증한다.

## 현재 게임 진단

1. **후반부(4~6막) 전술 목표와 시각적 장면 문법의 획일화**
   - 1~3막(`src/mythos_ui/src/v2/content/encounters.ts:1-702`)에는 보호 대상 중립 유닛(`neutral`: `a1_n2_cargo`, `a2_n2_courier`, `a3_n2_liberation`, `a3_boss_warden` 총 4종)과 생존 목표(`objective.kind === 'survive'`: `a1_n2_blackout`, `a2_n2_stall`, `a3_n2_server_room` 총 3종)가 섞여 전장의 시각적 초점과 우선순위를 바꾼다.
   - 반면 딥 시그널 4~6막 조우 47종(`src/mythos_ui/src/v2/content/packs/glass_library/encounters.ts`, `dreaming_machines/encounters.ts`, `first_record/encounters.ts`)은 `neutral` **0종**, `survive` **0종**으로 100% 적 전멸전뿐이다.
   - 또한 CRPG 구역 14곳(`src/mythos_ui/src/v2/content/crpg/index.ts:24-40`)은 1~3막 각 4곳·4막 2곳(`d4_dream_stacks`, `d4_return_desk`)뿐이고 **5막·6막은 0곳**(`src/mythos_ui/src/v2/engine/crpg.ts:150-152`에서 빈 배열 반환)이어서, 후반부로 갈수록 플레이어가 보고 기억할 장면의 결이 오히려 납작해진다.

2. **핵심 시각·발견 보상(카드 진화 12종·듀오 궁극기 12쌍)의 극단적 미도달**
   - `simulateRun`(`src/mythos_ui/src/v2/engine/runSim.ts:462`)으로 기준 시드 90판(`1000..1029` × 3아키타입, 전 해금 `mixed` 봇)을 실측한 결과, 진화가 일어난 49판 중 45판이 모든 덱에 기본 포함된 시작 카드 3종(`wall_breaker` 19회·`noise_curtain` 23회·`locked_shot` 13회, 합계 55/60회 = **91.7%**)에 몰렸다.
   - **비기본 카드 진화 9종은 90판 중 단 5판(5.6%)**만 발동했고, 그중 **6종(`triple_tap`, `acid_incendiary`, `artery_open`, `overtuned_laser`, `phantom_step`, `cover_fire`)은 0/90판**이었다. 진화 12종(`src/mythos_ui/src/v2/content/evolutions.ts:21-130`)이 전부 공용(`owner: 'any'`) 카드만 쓰는데 보상 추첨(`src/mythos_ui/src/v2/engine/run.ts:368-375`)은 동료 카드 `×2.5`·아키타입 카드 `×1.8`만 우대하고 진화 반쪽 보유 시 가중치(`SET_PULL = 1.7`, `engine/implantSets.ts:99` 같은 유도)나 UI 표시가 전혀 없기 때문이다.
   - 듀오 궁극기(`src/mythos_ui/src/v2/content/duos.ts:9-106`)도 11명 조합 55쌍 중 12쌍(21.8%)인데, 영입 후보 추첨(`src/mythos_ui/src/v2/engine/run.ts:1081-1084`)에 듀오 파트너 가중치가 없어 90판 중 `0`판(450판 기준 `7`판 = 1.6%, `docs/PROGRESS_LOG.md:54`)만 발동한다.

3. **신규 아키타입·5막 부품 경제·Paradox 10의 콘셉트-구현 단절**
   - 인양 부품(`salvage`)을 주는 적 13종은 전부 5막(`src/mythos_ui/src/v2/content/packs/dreaming_machines/enemies.ts:11-228`)에만 있고, 은신처 제작대(`src/mythos_ui/src/v2/engine/run.ts:1544-1574`)는 각 막 6행(`src/mythos_ui/src/v2/engine/map.ts:166-168`) 단 한 번뿐이라 5막 보스(`furnace_mother`·`kai_zero`, 각 `salvage: 6`)에서 얻은 부품은 6막 끝까지 쓰지 못한다. 더욱이 부품 경제 아키타입으로 기획된 `scrapborn`(`src/mythos_ui/src/v2/content/packs/new_archetypes/archetypes.ts:32-54`, `cards.ts:119-224`)은 코드상 `parts`와 상호작용하는 카드·임플란트가 **0개**다.
   - `Paradox 10`(`src/mythos_ui/src/v2/content/paradox.ts:61-65`)은 이름이 `'IX가 학습한다'`이지만 실제 엔진(`src/mythos_ui/src/v2/engine/combat.ts:168`)은 단순 `적 피해 +1`뿐이어서 이름이 약속한 장면을 보여 주지 못한다.

## 리버스 엔지니어링

| 게임 (기억 기반) | 재미의 구조 | Mythos 현황 | 가져올 것 | 가져오지 않을 것 |
| --- | --- | --- | --- | --- |
| **Into the Breach** (기억 기반) | 보호 건물과 파괴 가능한 보드 기믹(댐·지뢰·열차)이 매 전투의 시선과 밀치기 각도를 바꾼다 | 7×5 예고·밀치기는 완성도 높으나(`engine/combat.ts`), 4~6막 조우 47종에 중립 구조물·보호 목표가 0개다 | 밀쳐서 부딪히면 주변에 예고된 방전·폭발·장막을 터뜨리는 **'전장 코어 오브젝트'** | 도시 전력망 파괴 시 즉시 패배하는 이중 체력바(접속자 HP와 중복 피로) |
| **Hades** (기억 기반) | 첫 은혜 선택 후 듀오·전설 조건이 보상 풀을 유도하고, 고난도 규약(Extreme Measures)이 보스전 무대를 시각적으로 바꾼다 | 듀오 12쌍(`content/duos.ts`)·진화 12종(`evolutions.ts`)이 있으나 보상/영입 유도가 없어 미발동률이 94~98%다 | 진화·듀오 반쪽 보유 시 나머지 조각 가중치(`×1.7`) + 보상 카드의 작은 `'✦ 공명'` 배지 | 방마다 보상을 미리 고정 노출하는 다중 문 구조(현 7행 지도와 충돌) |
| **Inscryption** (기억 기반) | 보스 페이즈 전환 시 보드 규칙과 소품이 바뀌어 플레이어가 보스전을 '하나의 장면'으로 기억한다 | 3·6막 IX/오메가에는 `glitch`(`first_record/enemies.ts:235-279`)가 있으나 4·5막 보스 6종은 단순 방어막·회피 버프뿐이다 | 4·5막 보스 반피 전환 시 보드 타일을 서가(엄폐)·용광로(불길)로 즉시 재작성하는 무대 연출 | 덱을 영구 훼손하거나 적 예고를 숨기는 불공정 연출(예고 기둥 위반) |
| **Slay the Spire** (기억 기반) | 아키타입 핵심 카드와 유물이 맞물려 덱의 작동 방식 자체가 바뀌는 빌드 정점이 뚜렷하다 | 임플란트 세트 6종(`engine/implantSets.ts:31-92`)은 작동하나, 진화 12종에 아키타입·동료 전용 카드가 0장이다 | 5개 아키타입 대표 시작 카드가 금지 임플란트와 만나 변모하는 전용 진화 5종 | 진엔딩 진입을 위해 매 판 고정 열쇠 3개를 강제 수집하게 하는 경직된 동선 |

**자체 게임 리버스 엔지니어링 발견 3건:**
1. **`combatSim.ts`의 궁극기 채점 맹점(`spendGauge`):** `src/mythos_ui/src/v2/engine/combatSim.ts:54-64`는 필살기·동료 궁극기·듀오 궁극기를 `evaluate(trial, C)`(`combatSim.ts:158-198`)만으로 비교한다. 그런데 `evaluate`는 카드 평가(`bestCardAction`, `combatSim.ts:287`)와 달리 **드로우(`hand.length`), 에너지(`energy`), 재이동(`refund_move`), 회상(`recall`), 크레딧(`credits`), 손패 생성(`add_card`)에 0점**을 준다. 이 때문에 듀오 12종 중 **8종**(`collection`, `unlogged_dream`, `anvil_and_wall`, `not_for_sale`, `warm_circuit`, `burned_ledger`, `overdue_reader`, `undeletable`)과 동료 궁극기 11종 중 **5종**(`se_rin`, `han`, `su_ah`, `lin_yue`, `io`), 사서 필살기(`총서 낭독`)의 핵심 가치가 봇 시뮬에서 증발한다.
2. **비기본 카드 진화 6종의 `0/90` 도달 불능 구조:** `src/mythos_ui/src/v2/engine/run.ts:236-245`(`evolveCards`)는 카드와 임플란트를 동시에 들었을 때만 발동하는데, `cardWeight`(`run.ts:368-375`)에서 공용 카드는 가중치 `1.0`으로 동료(`2.5`)·아키타입(`1.8`)에 밀리고, `rollImplant`(`run.ts:401-423`)도 세트 가중치(`1.7`)만 줄 뿐 진화 짝은 무시한다.
3. **`branch 1.0`의 미이식 시각·장면 자산 3종:** `git show 1.0:resources/neo-seoul/scenario.json` 역분석 결과, ① `twist_bank` 3대 반전의 **물증 중심 연출 지침**(세린의 관리망 교신 흔적 `twist_serin_duality`, 소거 신호 보관 선반 `twist_grid_true_purpose`, 주인공 필적 공명 `twist_player_identity`), ② `session_design.chapter_gates`의 **시작 동료별 1막 탈출 목표 변주 6종**, ③ `npc_agendas`의 **고추적도 시 동료 능동 개입**이 2.0에 비어 있다.

## 게임 개선

신규 에셋이나 콘텐츠 추가 없이 기존 코드·데이터만 손봐 체감을 바꾸는 4가지다.

1. **진화·듀오 유도 가중치(`×1.7`)와 보상 `'✦ 공명'` 배지 (`src/mythos_ui/src/v2/engine/run.ts:368-423, 1081-1084`):**
   - 보유 중인 카드/임플란트와 진화 짝(`C.evolutions`)을 이루는 상대가 보상·상점에 추첨될 때 `SET_PULL`(`1.7`)과 같은 가중치를 주고, 보상 카드/임플란트 우상단에 작은 `'✦ 공명'` 표시만 띄운다(결과 카드는 도감에서 여전히 비밀 유지).
   - 2막·길 위의 동료 영입(`recruitCandidates`, `run.ts:1081-1084`)에서 현재 파티 동료와 듀오(`C.duos`)가 있는 후보에 가중치 `×1.8`을 부여하고, `runSim.ts`가 듀오 성립 시 `setDeployment`(`run.ts:1602`)를 호출하게 한다.
2. **시뮬레이터 궁극기 평가식에 템포 가치 반영 (`src/mythos_ui/src/v2/engine/combatSim.ts:54-64`):**
   - `spendGauge`가 `evaluate(trial, C)`에 드로우·에너지·재이동·생성 카드 점수(`2 * Δhand + 2.5 * Δenergy + 1.5 * Δmovable`)를 더하도록 고쳐, 듀오 8종과 유틸리티 궁극기의 실제 밸런스를 측정 가능하게 만든다.
3. **5막 인양 부품(`parts`)과 `scrapborn`·전리품 화면 직결 (`src/mythos_ui/src/v2/engine/run.ts:912, 1544-1574`):**
   - `scrapborn` 시작 임플란트 `self_repair`(`packs/new_archetypes/implants.ts`)에 '전투당 첫 기계/엘리트 처치 시 부품 +1'을 연결해 1~3막에서도 부품을 만지게 하고, 보스 보상 화면에서도 `CRAFT_RECIPES`를 1회 쓸 수 있게 열어 5막 보스 부품(`salvage: 6`)이 증발하지 않게 한다.
4. **4·5막 보스 페이즈 보드 재편 및 Paradox 10 실구현 (`src/mythos_ui/src/v2/content/paradox.ts:61-65`):**
   - `Paradox 10`을 단순 피해 +1 대신 플레이어 덱 최다 카드 유형(`attack`/`skill`/`tactic`)에 대응하는 기존 전투 변칙(`mutatorCombat`, `engine/mutators.ts:44-55`) 1종을 보스·엘리트전에 결정론적으로 켜게 바꾸고, 4·5막 보스 반피 전환(`glass_library/enemies.ts:196-258`, `dreaming_machines/enemies.ts:208-268`)에 기존 `rewrite` 효과를 붙여 보드 지형이 눈앞에서 바뀌게 한다.

## 콘텐츠 확장

볼륨 확대가 아니라 **매 판의 판단과 기억할 장면**을 바꾸는 소규모 핀포인트 추가다(승률 밴드 35~45% 유지).

1. **전장 상호작용 코어 3종 (보드 위 '밀쳐서 터뜨리는 기믹'):**
   - 새 타일 타입 없이 `EncounterDef.neutral`(`src/mythos_ui/src/v2/engine/combat.ts:326-330`)을 활용해, 충돌(`bump`)이나 타격으로 부수면 십자(`cross`) 범위에 예고된 효과를 터뜨리는 코어 3종(**과충전 축전기**: 감전 1+피해 4, **무너진 서가**: 2칸 밀치기+검열 1, **냉각 파이프**: 빙결 1)을 배치한다. 적도 아군을 코어로 밀칠 수 있어 순수 파워 인플레가 없다.
2. **아키타입 대표 시작 카드 진화 5종 (`src/mythos_ui/src/v2/content/evolutions.ts`, 이미지 5장):**
   - 5개 아키타입(`ghost`, `smuggler`, `echo_collector`, `archivist`, `scrapborn`)의 고유 시작 카드 각 1종을 **금지 임플란트(대가가 있는 보스 유물)**와 짝지어 5종만 추가한다. 특히 `archivist_footnote`(`packs/new_archetypes/cards.ts:9-23`)는 진화 시 DLC 원안(`docs/plans/2026-10-26-dlc-expansion-plan.md:156`)대로 '이번 턴 다음 카드에 표식 2·피해 +3 각주 부여'로 변모시킨다.
3. **5·6막 CRPG 구역 4곳 + `1.0` 3대 반전 물증 장면 (`src/mythos_ui/src/v2/content/crpg/`, 이미지 4장):**
   - 현재 공백인 5막(`d5_furnace_dock`, `d5_dream_nursery`)과 6막(`d6_first_scriptorium`, `d6_erased_shelf`)에 구역 2곳씩 총 4곳을 추가하고, `1.0` `twist_bank`(`scenario.json`)의 3대 반전 물증(세린의 관리망 인장, 소거 신호 보관 선반, 내 필적의 최초 기록)을 구역 d20 판정 장면으로 심는다.
4. **4~6막 비전멸 조우 4종 교체 (총 조우 수 106종 유지, 신규 에셋 0):**
   - 4~6막의 평이한 일반 조우 4개를 삭제하고 같은 자리에 '금서 반납 수레 호위(`protect`)', '용광로 과열 4턴 생존(`survive`)', '원본 필경사 서판 사수(`protect`)'를 넣어 후반부 전투의 리듬을 바꾼다.

## DLC 2

- **제목:** **《세계:접속 — 역류 (Counter-Signal: The Blackout War)》**
- **플레이어 판타지:** 관리망의 추적을 피해 첨탑으로 도망치던 신호가 아니라, **네오서울의 전력·감시망을 구역째로 끊어 도시의 불을 내 손으로 끄고 어둠 속에서 사냥하는 '역습의 설계자'**가 된다.
- **단 하나의 새 규칙 — 「전력망 조도 (Grid Illumination: 점등 Lit / 암전 Dark)」:**
  - 보드의 각 열/구역이 **점등(Lit)** 또는 **암전(Dark)** 상태를 가진다(미리보기와 예고에 100% 반영).
  - **점등 칸**에 선 유닛은 조명에 노출되어 받는 원거리 피해가 `+2` 늘어나고, **암전 칸**에 선 유닛은 적 직선탄(`line`)의사거리 밖(은신, 근접 인접 시에만 피격)이 되며 밀치기 충돌(`bump`) 피해가 `+2` 증가한다.
  - 보드 위의 **전원 노드(Power Node)**를 타격하거나 적을 밀쳐 박으면 그 구역의 네온이 꺼지며 즉시 **암전**으로 뒤집히고(시각적으로 타일 조명이 꺼지고 형광 예고선과 실루엣만 빛남), 적 조명 드론은 예고 후 다시 점등시킨다.
- **왜 '딥 시그널 2탄'이 아닌가:**
  - 딥 시그널이 3막 뒤에 4~6막을 이어 붙인 **2시간짜리 수직 마라톤**이었다면, 《역류》는 셋업 화면에서 고르는 **표준 3막 길이(30~35분, 24층)의 병렬 전술 캠페인(`mode: 'counter'`)**이다.
  - 덱 크기와 적 체력을 6막까지 부풀리는 대신, 1막부터 **'어느 구역의 전력을 끊을 것인가'**가 다음 막 전투의 시작 조도와 시민 구역의 운명(병원 전력을 남기면 적 포탑이 켜지고, 끊으면 암시장 평판이 깎이는 등)을 바꾸는 **시각·공간 퍼즐**이다.
- **범위 (Scope):**
  - **막:** 병렬 3막 (1막 지하 고압 변전망 · 2막 한강 수문 통제소 · 3막 방공 서치라이트 타워, 총 24층).
  - **적:** 12종 (일반 7 · 엘리트 3 · 보스 2: 서치라이트 감시자 `Argus-IX`, 전력망 심장 `Grid Leviathan`).
  - **카드:** 12장 (점등/암전 전환·암전 기습·과전류 역류 전술 카드 6장, 아키타입·동료 연동 6장).
  - **장면:** 사건 12개 + CRPG 구역 3곳(막당 1곳, 전력 배분과 암전 공작 d20 장면).
  - **이미지:** 총 **34장** (Codex image 전용: 배경 3 · 적 스프라이트 12 · 보스 키아트 2 · 카드 12 · 구역/사건 스틸 5).
- **재사용할 수 있는 것:**
  - `src/mythos_ui/src/v2/engine/effects.ts`의 지면 레이어(`Tile.fire`/`Tile.ttl` 옆에 `dark?: number` 추가), `combat.ts`의 `rawOptions`(`line` 사거리 필터)와 `previewPlay`, `run.ts`의 `RunMode`, 기존 5아키타입·11동료·임플란트·데일리 리플레이 검증기 전체.

## 재미 프로토타입

- **가장 작은 무아트(Art-free) 테스트:**
  - 이미지 0장, 엔진·UI 코드 ~45줄로 샌드박스 전용 전투 1개(`/?sandbox=combat&mute=1&enc=proto_blackout`)를 만든다.
  - 기존 `a1_n2_blackout`(`src/mythos_ui/src/v2/content/encounters.ts`) 보드 중앙(`x=3, y=2`)에 체력 1짜리 중립 **'전원 콘덴서'**를 두고, 오른쪽 4열(`x >= 3`)은 점등(밝은 테두리, 원거리 피해 +2), 왼쪽 3열은 암전(어두운 오버레이, 충돌 피해 +2·직선탄 은신)으로 시작한다.
  - 적을 밀쳐 콘덴서에 박으면 십자 범위에 감전 피해 4를 주고 오른쪽 구역이 2턴 동안 암전으로 꺼진다.
- **폐기(Kill) 기준:**
  - 오너가 샌드박스에서 5분(3판) 플레이했을 때, ① 암전 오버레이가 붉은 예고 타일 가독성을 조금이라도 해치거나, ② 콘덴서를 노려 불을 끄고 벽에 박는 플레이보다 그냥 손패 공격 카드를 순서대로 던지는 쪽이 더 편하고 재미있다고 판정되면 **점등/암전 규칙을 즉시 폐기**하고 '상호작용 코어 오브젝트'만 남긴다.

## 우선순위

| 항목 | 규모 | 판단 | 장면 | 발견 | 피로 | 위험 | 선행 조건 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **1. 진화·듀오 가중치(`×1.7`) + `'✦ 공명'` 배지 + `spendGauge` 교정** | S | 중 | 중 | **상** | 없음 | 낮음(시뮬 재측정) | 오너 F1~F4 판정 |
| **2. 재미 프로토타입 (`proto_blackout`: 코어 오브젝트 + 암전)** | S | **상** | **상** | 중 | 낮음 | 낮음(샌드박스 격리) | 없음(아트 0장) |
| **3. 5막 부품(`parts`)×`scrapborn` 직결 + 4·5막 보스 페이즈 재작성 + P10** | S | 중 | **상** | 중 | 없음 | 낮음(기존 규칙 조합) | 1번 시뮬 기준선 |
| **4. 4~6막 비전멸 조우 4종 교체 + 전장 코어 3종 배치** | M | **상** | **상** | 중 | 없음 | 중(3블록 승률 검증) | 2번 프로토타입 통과 |
| **5. 아키타입 대표 진화 5종 + 5·6막 CRPG 구역 4곳(`1.0` 반전 물증)** | M | 중 | **상** | **상** | 낮음 | 낮음(이미지 9장) | 오너 F1~F4 판정 |
| **6. DLC 2 《세계:접속 — 역류》 (병렬 3막 + 조도 규칙)** | L | **상** | **상** | **상** | 낮음(30분 런) | 중(직선탄AI·미리보기) | 2번 프로토타입 통과 |

## 확인할 사항

1. **진화·듀오 보상 유도 방식 (`run.ts:368-423, 1081-1084`):** 반쪽 보유 시 가중치(`×1.7`)와 보상 카드의 작은 `'✦ 공명'` 아이콘을 넣을지. **기본값: 적용**(도감의 완성 결과는 `???`로 숨기되, 런 중 조합 성립 확률만 5.6% → ~25%로 끌어올림).
2. **4~6막 조우 변주 방식 (`packs/*/encounters.ts`):** 조우 수를 더 늘릴지, 기존 47종 중 평이한 4종을 호위(`protect`)·생존(`survive`)으로 교체할지. **기본값: 교체**(총 조우 106종 유지, 볼륨 대신 밀도 선택).
3. **5막 부품(`parts`) 사용처 확장 (`run.ts:1544-1574`):** 5막 보스 보상 화면에서도 제작대 레시피 1회를 허용하고 `scrapborn` 시작 유물에 부품 획득을 연결할지. **기본값: 허용**(5막 보스 `salvage: 6` 사장 문제 해결).
4. **DLC 2 방향 (`mode: 'counter'`):** 7~9막 수직 확장 대신 30분짜리 병렬 3막 캠페인 《역류(전력망 점등/암전)》로 갈지. **기본값: 병렬 3막 프로토타입(`proto_blackout`)을 샌드박스에서 5분 먼저 시연 후 결정.**
5. **5·6막 CRPG 구역 추가 (`content/crpg/index.ts`):** 현재 0곳인 5·6막에 구역을 막당 2곳(총 4곳, 이미지 4장) 채울지. **기본값: 승인**(딥 시그널 후반부 서사 공백 해소 및 `1.0` 3대 반전 물증 회수).
