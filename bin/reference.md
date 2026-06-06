# Project MythOS Reference Notes & Action Items

작성일: 2026-06-03

이 문서는 Project MythOS 개발에 참고할 만한 게임 레퍼런스들과 현재 구현 상태를 기반으로 한 피드백 및 추가 기능 리스트를 통합하여 관리합니다.

---

## 1. 스토리 / 내러티브

### Citizen Sleeper / Citizen Sleeper 2

- 참고 포인트: 제한된 자원, 생존 압박, 선택의 누적이 서사를 밀어가는 구조.
- MythOS 적용: `stability` / `tension` 같은 생존 클럭을 단순 수치가 아니라 "오늘 어떤 선택을 포기하게 만드는 압력"으로 느끼게 만드는 데 좋다.
- 링크: https://store.steampowered.com/app/2442460/Citizen_Sleeper_2_Starward_Vector/

### Disco Elysium

- 참고 포인트: 스킬, 내면 독백, 실패 판정까지 모두 캐릭터성과 문장으로 전환하는 방식.
- MythOS 적용: AI GM의 판정 결과를 성공/실패 로그가 아니라 플레이어 정체성, 기억, 세계 반응으로 서술하는 방향에 유용하다.
- 링크: https://www.playstation.com/ja-jp/games/disco-elysium/

### Slay the Princess

- 참고 포인트: 반복 루프, 믿음과 선택이 세계/인물의 형태를 바꾸는 구조.
- MythOS 적용: Echo와 Loop가 "다시 시작"이 아니라 "세계가 플레이어를 다르게 기억하는 장치"로 보이게 만드는 데 참고할 만하다.
- 링크: https://store.steampowered.com/app/1989270/Slay_the_Princess/

---

## 2. 세계관 몰입감

### Roadwarden

- 참고 포인트: 텍스트 중심 RPG임에도 장소, 시간, 피로, 인벤토리, 관계가 촘촘하게 연결된다.
- MythOS 적용: 장면마다 "지금 어디에 있고, 무엇이 부족하며, 어떤 위험이 다가오는지"를 명확히 보여주는 UX 레퍼런스다.
- 링크: https://store.steampowered.com/app/1155970/Roadwarden/

### Sunless Sea / Sunless Skies

- 참고 포인트: 탐험 자체가 세계관을 읽는 행위가 되고, 위험한 이동이 이야기의 일부가 된다.
- MythOS 적용: 작전 지도, 접촉 신호, 붕괴 압력, 미발견 구역을 더 강한 탐험 감각으로 연결할 때 좋다.
- 링크: https://www.mobygames.com/game/71093/sunless-sea/

### Caves of Qud

- 참고 포인트: 기묘한 SF 세계관, 절차적 역사, 텍스트만으로도 강한 장소성을 만드는 밀도.
- MythOS 적용: Story Bible snippet을 단순 설정 설명이 아니라 "세계가 오래전부터 존재했다"는 감각으로 쓰는 데 참고할 만하다.
- 링크: https://store.steampowered.com/app/333640/Caves_of_Qud/

---

## 3. 게임플레이 루프

### I Was a Teenage Exocolonist

- 참고 포인트: 타임루프, 능력치, 기억, 관계, 카드 기반 판정이 하나의 성장 경험으로 묶인다.
- MythOS 적용: Meta Progression과 Run History가 다음 루프의 선택지, 시작 조건, 캐릭터 정체성에 자연스럽게 영향을 주는 방향에 유용하다.
- 링크: https://exocolonist.com/

### 80 Days

- 참고 포인트: 선택형 텍스트 어드벤처에 시간 압박, 루트 선택, 반복 플레이 가능성을 결합한다.
- MythOS 적용: 40-60턴 장기 세션에서 "이번 루프의 여정"이 분명히 남도록 경로/장소/시간 감각을 강화하는 데 좋다.
- 링크: https://inkle.itch.io/

### AI Dungeon

- 참고 포인트: AI 기반 자유 입력과 즉흥 서사의 대표 사례.
- MythOS 적용: 자유도는 강하지만 품질과 일관성이 흔들릴 수 있으므로, MythOS는 Story Bible, Ending Resolver, 상태 검증 레이어로 통제된 AI GM을 지향해야 한다.
- 링크: https://apps.apple.com/us/app/ai-dungeon/id1491268416

---

## 4. RPG 경험 / 전투

### Shadowrun: Dragonfall / Hong Kong

- 참고 포인트: 사이버펑크 세계관, 동료 서사, 거점 대화, 턴제 전술 전투의 결합.
- MythOS 적용: 전투가 서사를 끊는 별도 모드가 아니라 동료, 세력, 단서, 대가를 드러내는 장면이 되도록 참고할 수 있다.
- 링크: https://www.paradoxinteractive.com/games/shadowrun-hong-kong-extended-edition/about

### Wildermyth

- 참고 포인트: 캐릭터가 사건을 겪으며 변하고, 그 변화가 다음 이야기의 전설로 남는다.
- MythOS 적용: 동료 참전, Run History, Meta Progression을 "기록 보관소" 수준에서 더 나아가 캠페인 신화로 만드는 데 좋다.
- 링크: https://wildermyth.itch.io/wildermyth

### Into the Breach

- 참고 포인트: 작고 명료한 전술 공간, 예측 가능한 적 행동, 짧은 턴의 높은 밀도.
- MythOS 적용: 전술 전투 UI는 복잡한 RPG 전투보다 "무엇이 위험하고 어떤 선택이 의미 있는지"가 즉시 보이는 쪽이 좋다.
- 링크: https://subsetgames.com/itb.html

---

## 5. MythOS에 가장 우선적으로 참고할 순서

1. Citizen Sleeper: 생존 압박과 선택 경제.
2. Roadwarden: 텍스트 RPG의 장소감과 장기 세션 UX.
3. Disco Elysium: 판정, 실패, 내면 독백의 문학적 처리.
4. Slay the Princess: 루프와 기억이 세계를 바꾸는 감각.
5. Shadowrun: 동료 서사와 전술 전투의 결합.
6. Wildermyth: 플레이 기록이 캠페인 신화가 되는 구조.

---

## 6. 개발 관점 요약

- 내러티브: AI GM의 자유도보다 "기억되는 결과"가 중요하다.
- 몰입감: 장소, 시간, 위험, 관계가 매 장면에서 작동해야 한다.
- 게임플레이: 선택지는 문학적 문장이 아니라 실제 자원/관계/엔딩 압력과 연결되어야 한다.
- RPG 경험: 스탯과 동료는 수치보다 플레이어 정체성과 행동 가능성을 바꾸는 장치여야 한다.
- 메타 진행: Run History는 로그가 아니라 다음 접속의 세계를 바꾸는 캠페인 기억이어야 한다.

---

## 7. 레퍼런스 대비 구현 격차 (Gap Analysis)

| 레퍼런스 게임 | 핵심 디자인 의도 (Reference) | 현재 구현 상태 (Current State) | 잔여 격차 (Gap) |
| :--- | :--- | :--- | :--- |
| **Citizen Sleeper** | 제한된 자원(`stability`, `tension`)에 의한 선택의 포기 및 생존 압박 | 스탯 필드 및 엔딩 조건 평가에 반영되나, 선택지를 잠그거나 강제하는 경제가 미약함 | 자원 소모량에 따른 선택지 활성/비활성 제약 및 클러치 경제 시스템 |
| **Disco Elysium** | 실패 판정을 문학적 내면 독백과 정체성 서사로 치환 | 5대 스탯 기반 GM 판정 연출이 적용되었으나, 스탯별 '인격적 내면 독백'의 깊이가 부족함 | 스탯별 내면의 목소리 주입 프롬프트 템플릿 고도화 |
| **Slay the Princess** | 반복 루프 속에서 세계와 NPC가 플레이어의 과거 선택을 기억하고 변함 | Meta Progression, Run History MVP가 구축되었으나 루프 간 서사 잔향(Echo)이 단순함 | 이전 루프의 주요 분기를 다음 루프 AI GM의 `NarrativeContext`로 연계하는 룰 구현 |
| **Roadwarden** | 장소, 시간, 피로, 인벤토리가 유기적으로 결합된 촘촘한 텍스트 UX | Story Bible MVP 및 Neo-Seoul 1시간 세션이 있으나 탐험 중 리소스가 텍스트 위주로 소모됨 | 각 장소의 위험도, 리소스 소모, 시간 흐름을 시각적으로 결합한 탐험 대시보드 |
| **Shadowrun** | 전술 전투가 단서와 대가를 드러내고 동료 서사와 결합 | 단일 iframe 전투 UI, 동료 참전이 구현되었으나 동료의 개별 전술 개성이 단순함 | 동료 고유 스킬/AI 튜닝 및 전투 후 거점(Campfire) 내러티브 씬 추가 |
| **Wildermyth** | 영웅들이 사건을 겪으며 영구적으로 변하고 역사로 남음 | `run_summary`를 통한 Meta Progression 해금은 구현되었으나 동료의 상태 변화가 누적되지 않음 | 영웅의 영구적 부상/각성 상태가 세이브 및 다음 루프에 누적되는 시스템 |
| **Into the Breach** | 명료한 전술 공간과 적의 행동 예측(Intent)을 통한 두뇌 전투 | 단일 iframe 전술 보드가 렌더링되나 적의 다음 턴 행동이 가려져 있음 | 적의 행동 의도(Attack/Move Target)를 타일에 가시화하는 전술 인텐트(Intent) 구현 |

---

## 8. 추가할 기능 리스트 (Action Items)

### 8.1 스토리 / 내러티브 경제 (Citizen Sleeper & Disco Elysium)
- [ ] **자원 제한적 선택지 (Resource-gated Choice)**
  - `stability`가 너무 낮거나 `tension`이 임계치를 넘을 때 특정 선택지를 비활성화하고, "정신적 붕괴로 인해 이 선택을 내릴 수 없습니다"와 같은 시스템 메시지 주입.
  - 특정 선택지 실행 시 `stability` 소모를 요구하는 로직 구축.
- [ ] **스탯별 분화된 내면 독백 (Inner Monologue Injector)**
  - 플레이어의 최고/최저 스탯 정보를 AI GM의 프롬프트에 주입하여, 해당 스탯의 성격을 대변하는 내면의 목소리가 텍스트에 포함되도록 지침 강화.

### 8.2 루프와 세계의 변화 (Slay the Princess & Wildermyth)
- [ ] **내러티브 잔향 (Narrative Echoes) 시스템**
  - `RunSummary`에 기록된 핵심 분기점(예: `defeated_boss=True`, `betrayed_ally=True`)을 다음 루프의 `NarrativeContext`로 전달하여 AI GM이 NPC 대사나 초기 반응에 활용하도록 함.
- [ ] **동료 영구 유산 (Companion Legacies)**
  - 동료가 전투 중 쓰러지거나 각성(Awakened)할 경우, 해당 상태를 `PlayerMemory(kind="meta_progression")`에 저장하여 다음 루프/세이브 로드 시 동료의 초기 특성에 영구 반영.

### 8.3 세계관 탐험 및 시간 축 (Roadwarden & 80 Days)
- [ ] **탐험 현황 UI 컴포넌트 강화**
  - 턴수에 맞춰 세계의 붕괴도를 시각화하는 '시공간 붕괴 타이머(Temporal Decay Tracker)' 및 구역 위험도/단서 수집 게이지 표현.
- [ ] **이동 중 조우 이벤트 (Travel Encounters) 풀**
  - 지역 이동 시 붕괴 수치와 스케줄러를 참조하여 중간 조우(Interception) 이벤트 생성.

### 8.4 고도화된 전술 전투 (Into the Breach & Shadowrun)
- [ ] **적 인텐트(Intent) 가시화 시스템**
  - `CombatService` 상태 패킷에 `enemy_intents` 데이터를 추가하고 전술 보드 렌더러에서 적의 공격 범위/대상을 타일 하이라이트로 가시화.
- [ ] **동료 전술 성향 (Companion Tactical AI)**
  - 동료 캐릭터성에 맞추어 서포터/스트라이커/해커 등 성향별 자동 행동 및 스킬 사용 로직 고도화.

---

## 9. 단계별 로드맵 제안 (Proposed Roadmap)

### 🚀 Phase 1: 내러티브 및 루프 잔향 (내실 다지기)
- **목표**: Disco Elysium의 독백과 Slay the Princess의 잔향감을 AI 프롬프트와 런타임에 심는다.
- **주요 작업**:
  1. `NarrativeContext`에 `PlayerProfile.stats` 및 이전 런의 `RunSummary.key_decisions` 주입 로직 작성.
  2. Ollama 프롬프트 엔지니어링: 내면 독백 발생 조건 및 Echo 반응 룰북 튜닝.

### ⚔️ Phase 2: 전술 전투 고도화 (전술적 재미 강화)
- **목표**: Into the Breach와 Shadowrun의 재미를 전투 iframe에 안착시킨다.
- **주요 작업**:
  1. 전투 루프에서 적의 행동 예측(Intent) 데이터를 산출하도록 `mythos_combat` 수정.
  2. 전술 보드 HTML5/JS 렌더러에 적의 예상 경로 및 공격 대상 타일 하이라이트 추가.
  3. 동료 성향별 간단한 의사결정 트리 구현.

### 🧭 Phase 3: 탐험 UX 완성 (세계관 몰입감 극대화)
- **목표**: Roadwarden의 유기적인 리소스 관리와 80 Days의 시간 압박을 체감하게 만든다.
- **주요 작업**:
  1. Streamlit 및 신규 Web API 기반 프론트엔드에 시간(턴) 경과 게이지와 구역 위험도 대시보드 추가.
  2. 리소스 임계점 도달 시의 위기 인카운터(Emergency Encounters) 연계.
