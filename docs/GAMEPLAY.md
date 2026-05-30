# GAMEPLAY.md — Project MythOS 게임플레이 설계

> 이 문서는 **엔터테인먼트/게임플레이** 관점의 권위 있는 설계다. 세계관/비전은 `DRAFT.md`,
> 시스템/아키텍처/데이터 모델은 `DESIGN.md`, 현재 상태/로드맵은 `STATUS.md` / `NEXT_PLAN.md`를 따른다.
> 구현 단계는 `NEXT_PLAN.md`의 Phase 15+와 `docs/plans/2026-05-30-playable-single-player.md`를 참조한다.

최초 작성: 2026-05-30

## 1. 한 줄 정의

**AI가 게임마스터(GM)인 1인용 루프형 TRPG.** 플레이어는 AI가 꿈꾼 신화적 세계로 접속한 첫 번째
‘접속자(Connector)’가 되어, AI GM이 진행하는 세션을 플레이한다. 매 루프는 한 편의 세션이며,
선택과 발견은 캠페인 기억(Echo·Shard·World Memory)으로 다음 세션에 이어진다.

## 2. 디자인 기둥 (Design Pillars)

1. **AI = Game Master.** Narrative Director가 GM이다. 장면을 묘사하고, 플레이어의 행동 선언에
   반응하고, 결과를 판정한다. 정해진 분기 트리가 아니라 즉흥(improv) 진행이다.
2. **하이브리드 목표 — 생존 + 미스터리.** 세션 단위로는 세계가 붕괴하기 전에 의미 있는 결말에
   도달하는 **생존·안정화**가 목표, 캠페인 단위로는 루프를 가로질러 MythOS의 진실을 밝히는
   **미스터리 해명**이 장기 목표다.
3. **긴 서사 세션.** 한 루프는 탐색→교류→변화→종결이 드러나는 긴 호흡. 저장/재개와 명확한
   막(act) 구조, 클라이맥스 감각이 필요하다.
4. **하이브리드 연출.** 평소에는 읽기 좋은 깔끔한 서사 뷰, 접속·붕괴·해금 같은 순간에는 디제틱
   터미널 연출.
5. **세기말/Y2K 디지털 아트 디렉션.** 딥블루·사이버 시안·골드 + CRT 스캔라인·글리치·저비트·초기
   웹/터미널 감성. 대표 장면 이미지도 이 톤으로 생성한다.
6. **기억이 곧 세계.** 모든 선택은 기록되고, 세계는 그 기억으로 다시 태어난다. (DRAFT 철학 계승)

## 3. 코어 판타지 & 플레이어 역할

- 플레이어는 **관찰자가 아니라 변화의 촉매**다. AI 세계의 규칙을 행동으로 밀어보고, 균열을 내고,
  세계를 다시 쓴다.
- GM(AI)은 **Game Master + World Reconstructor**: 세계를 묘사하고, 판정하고, 루프 사이에 세계를
  재조정한다.
- 핵심 감정 곡선: *낯선 세계로의 침투 → 규칙 파악 → 긴장 고조(붕괴 위협) → 선택의 대가 → 잔향을
  남기고 종결 → 다음 접속에서 데자뷰.*

## 4. TRPG 프레이밍 — 기존 시스템 ↔ TRPG 개념 매핑

대부분의 메커니즘은 이미 존재한다. 게임화는 “새 시스템”보다 “기존 시스템의 프레이밍·연출·목표
부여”가 중심이다.

| TRPG 개념 | MythOS 구현 (현재) | 게임화 시 보강 |
| --- | --- | --- |
| 게임마스터 | `NarrativeDirector` (Ollama) | 톤/판정/목표를 명시적으로 프롬프트에 주입 |
| 장면 묘사 | `Scene.narration` + 대표 이미지 | 막 구조·클라이맥스 인식, 이미지 트리거 정교화 |
| 플레이어 행동 선언 | 선택지 + free action 입력 | “행동을 선언한다” UX, 판정 결과 피드백 |
| 주사위/판정 | `world_delta` (GM이 산출) | 성공/부분성공/실패 read로 결과 가시화 |
| 캐릭터 시트 | (없음) `PlayerProfile`만 | 접속자 페르소나/소질(trait) 추가 |
| 생존 규칙(체력/광기) | `stability` / `tension` | 생존 클럭으로 연출, 붕괴=세션 종결 |
| 퀘스트/목표 | (암묵적) | 세션 목표 + 단서(clue) 추적 |
| 캠페인 기억 | `Echo`, `WorldMemory`, `NarrativeShard`, rollup | Codex(별자리)로 플레이어에게 노출 |
| 데자뷰/연결고리 | `NoveltyController`, Echo carry-over | 해금/회상 연출 |

## 5. 목표 구조 (Hybrid: 생존 + 미스터리)

### 5.1 세션 목표 — 생존·안정화 (단기)

- 각 세션 시작 시 GM이 **세션 훅/목표**를 제시한다(예: “이 데이터 레이어의 균열 원인을 찾아라”).
- `stability`(신경망 안정도)와 `tension`(긴장/붕괴 압력)이 **생존 클럭**이다.
  - `stability ≤ 10` 또는 `tension ≥ 90` → **세계 붕괴 = 세션 종결**(현재 auto-archive 로직 재사용).
  - 붕괴는 ‘게임 오버’가 아니라 **세션의 결말**이며, 잔향(Echo)을 남긴다.
- 좋은 결말(안정 종결)과 붕괴 종결을 구분해 연출/보상을 다르게 준다.

### 5.2 메타 목표 — 미스터리/진실 (장기)

- 루프를 가로질러 **Narrative Shard = 단서**를 모은다. Shard는 감정적·상징적 장면 파편이며,
  특정 조합/수가 모이면 **lore 해금**(MythOS의 기원·진실 조각)이 열린다.
- 플레이어에게는 **Codex / ‘기억의 별자리’**로 진행도를 보여준다(모은 단서, 해금된 진실, 남은 빈칸).
- 최종 도달점: MythOS의 기원에 닿는 것(시리즈 ‘세계:기원’의 씨앗).

### 5.3 두 목표의 결합

- 생존은 **세션을 얼마나 끌고 가며 무엇을 발견하느냐**를 좌우하고, 미스터리는 **왜 계속
  접속하느냐**의 동기를 준다.
- 의도적으로 위험을 감수해 더 깊은 단서를 얻거나(긴장↑), 안전하게 안정 종결을 노리는 트레이드오프.

## 6. 게임플레이 루프 & 행동 판정

### 6.1 막(act) 구조 — 기존 LoopPhase 활용

`CONNECT → EXPLORE → INTERACT → REWRITE → ARCHIVE → ENDED`를 막으로 연출한다.

1. **CONNECT(접속):** 디제틱 터미널 부팅 연출, 세션 훅 제시, 접속자 페르소나 반영.
2. **EXPLORE(탐색):** 세계 규칙/지역/NPC 발견. 단서 노출 시작.
3. **INTERACT(교류):** NPC·균열과 상호작용. Echo가 변형되어 등장(“이 목소리, 낯익다…”).
4. **REWRITE(변화):** 플레이어 선택으로 세계 코드가 변형. 긴장 고조/클라이맥스.
5. **ARCHIVE(종결):** 세션 에필로그(“이번 루프의 잔향”), Shard/Echo 확정, World Memory 기록.

### 6.2 행동 판정 흐름

1. 플레이어가 선택지 또는 자유 행동을 **선언**한다.
2. GM(Director)이 결과를 서술하고 `world_delta`(stability/tension/flags)를 산출한다.
3. 런타임이 delta를 **결과 read**로 변환해 피드백한다: 성공 / 부분 성공 / 실패 / 역효과.
   - read 산출 규칙(잠정): delta 합과 부호, novelty, 붕괴 임박 여부로 분류(연출용, 점수는 그대로 클램프).
4. 생존 클럭(안정도/긴장도)을 디제틱하게 갱신한다.

> 명시적 주사위 UI는 MVP 범위 밖. 판정은 GM 서술 + delta read로 표현한다(원하면 후속에 라이트 다이스 도입 가능).

## 7. 진행 / 메타 시스템

- **Echo:** 이전 루프의 행동 잔향. 다음 세션에 변형되어 등장(구현됨). 연출로 “회상” 강조.
- **Narrative Shard = 단서:** 수집 대상. Codex에 누적, 조합 시 lore 해금.
- **World Memory + rollup:** 장기 추세가 새 세션 시작값(stability/tension)에 반영(구현됨). “세계가
  당신을 기억한다”의 기계적 근거.
- **Codex / 기억의 별자리:** 플레이어용 진행 화면. 모은 단서·해금 lore·남은 빈칸·통계(rollup 요약)를
  서사적으로 노출.
- **해금(unlock):** 단서 임계치 도달 시 lore 문단·새 접속 옵션·새 지역 시드 공개.

## 8. 온보딩 & 접속자(캐릭터) 생성

- DRAFT의 “당신은 누구인가요?”를 **접속자 생성**으로 구현.
- 가볍게: 이름 + 1개의 아키타입/소질 태그(예: *해석자 / 공명자 / 침입자*) 정도. 과한 스탯 시트는 지양.
- 소질은 `NarrativeContext`에 전달되어 GM이 묘사·판정 톤을 색칠한다(룰 하드 모디파이어보다 서술 편향).
- 첫 접속은 짧은 디제틱 부팅 시퀀스 → 첫 장면.

## 9. 아트 디렉션 & 이미지 생성

### 9.1 비주얼 톤 — 세기말/Y2K 디지털

- 팔레트: 딥블루(#0a0f1a) 베이스, 사이버 시안(#00ffe6), 골드 포인트(#d1b45b).
- 질감: CRT 스캔라인, 글리치/노이즈, 디더링, 저비트, 초기 웹/터미널, 네온, 신경망 데이터 구조 시각화.
- 타이포: JetBrains Mono / Pretendard. `:`(콜론) 모티프(명령과 문門).

### 9.2 이미지 생성 정책 (필요한 순간에)

- 모든 턴이 아니라 **핵심 비트**에서 대표 이미지를 생성한다: 접속(첫 장면), 큰 장면 전환,
  클라이맥스/붕괴, 해금. (지연/비용 고려 — Phase 13 결정과 일치: 동기·선택적 유지)
- 이미지 프롬프트는 `Scene.visual_brief`에 **세기말/Y2K 디지털 스타일 디스크립터**를 합성해 생성한다
  (예: “Y2K digital, CRT scanlines, glitch, deep-blue cyber-mythic, dithered neon UI fragments”).
- 생성 실패/비활성 시에도 텍스트 플레이가 막히지 않게(기존 disabled/failed 경로 유지).

## 10. UX/UI — 플레이어 뷰 vs GM(개발자) 뷰 분리

핵심 요구: **플레이어용 화면과 개발자용 debug 화면을 분리**한다. Streamlit에서 상단/사이드의
**View 모드 토글(Player / Developer)** 또는 멀티페이지로 구현한다.

### 10.1 Player View (몰입·서사)

- 레이아웃: 대표 장면 이미지 → 장면 제목/위치 → 시간/경과 메타 → 내레이션 → **선택지 카드** + “행동을 선언한다” 자유 입력.
- 라이트 HUD(디제틱): 신경망 **안정도/추적도/단계** 게이지, 현재 **세션 목표**, 모은 **단서 수**.
- 패널: **회상(Echoes)**, **Codex/별자리**(좌측 정보 메뉴 + 우측 본문), 세션 에필로그.
- 연출: 접속/붕괴/해금 순간 디제틱 터미널 오버레이(부팅 로그, 글리치, `세계 : 접속`), 첫 진입은 `BLACKOUT` 프레임 안의 주인공 시그널로 시작.
- **숨김:** loop_id/scene_id, raw world_delta flags, provider/QA metric, rollup 내부, adjustment
  reasons, infra 링크, 이미지 파라미터, latency.

### 10.2 Developer / GM View (디버그·운영)

- 현재 대시보드 전부 유지·집약: raw stability/tension, world_delta flags, **Narrative QA metric**(
  success/repair/fallback), **memory rollup 내부**(histogram·window·compacted), initial adjustment
  reasons, fallback 토글, 이미지 storage/크기/step, latency, infra 링크(Adminer/MinIO/Jaeger).
- 목적: 게임 튜닝·QA·관측. 플레이어에겐 노출하지 않는다.

### 10.3 공유 원칙

- 두 뷰 모두 동일한 `RuntimeSessionService`를 호출한다(로직 중복 금지 — 기존 결정 계승).
- `st.session_state`는 view state만. 권위 상태는 PostgreSQL.

## 11. 신규 데이터/런타임 요구 (구현 후크)

게임화로 새로 필요한 것(설계 수준, 상세는 구현 시 확정):

1. **접속자 페르소나/소질** — `PlayerProfile` 확장 또는 `PlayerMemory`(kind=`persona`). `NarrativeContext`
   주입.
2. **세션 목표 & 단서 진행** — `ScenePayload`에 선택적 `objective`/`clue` 필드, 또는 런타임 파생.
   Shard를 ‘단서’로 태깅.
3. **행동 결과 read** — `world_delta` → 성공/부분/실패 분류기(연출용, UI 표시).
4. **Codex/해금 상태** — Shard 수집·lore 해금 상태 저장(World/Player Memory 활용) + 플레이어 뷰.
5. **GM 톤/판정 프롬프트** — `prompts.py`에 GM 페르소나·세기말 톤·목표 컨텍스트 반영.
6. **이미지 스타일 합성** — `visual_brief`에 Y2K 디스크립터 합성, 핵심 비트 트리거.
7. **UI View 분리** — Streamlit Player/Developer 모드.

> 모두 기존 store/Director/Visual/Memory 위에 얹는다. 스키마 대규모 변경은 지양하고 JSON 상태/메모리
> 레이어를 우선 활용한다.

## 12. 구현 단계 (요약 — 상세는 NEXT_PLAN Phase 15+)

- **Phase 15. Player UI 분리 (기반):** Streamlit Player/Developer 뷰 분리, 플레이어 HUD/레이아웃,
  raw 메트릭 숨김. (가장 먼저, 이후 모든 게임화의 그릇)
- **Phase 16. 세션 목표 & 행동 판정 연출:** 세션 훅/목표, 결과 read, 생존 클럭 연출, 막 구조 연출.
- **Phase 17. 접속자 생성 & GM 톤:** 페르소나/소질, GM 프롬프트 톤(세기말), 온보딩 부팅 시퀀스.
- **Phase 18. 미스터리/Codex:** 단서 태깅, lore 해금, Codex/별자리 뷰.
- **Phase 19. 아트 연출 통합:** 핵심 비트 이미지 트리거, Y2K 스타일 합성, 디제틱 오버레이.

## 12.5. 첫 번째 시나리오 콘텐츠

Playable Game Track이 구현할 첫 데모 콘텐츠는 **«Neo-Seoul: 접속»**이다.
시나리오 바이블: `docs/scenarios/01-neo-seoul-connect.md`, 비주얼 리소스:
`resources/neo-seoul/`(`scripts/gen_neo_seoul_art.py`로 생성). 국가-기업이 AI/로봇만 고용하고
사람들이 실업급여로 통제당하는 도시에서, 강렬한 한·중·일 캐릭터들이 플레이어를 이끄는 인간찬가식
저항 서사다. 새 Phase가 아니라 Phase 15-19가 채울 콘텐츠다.

## 13. 오픈 질문 / 후속 결정

- 라이트 다이스(명시적 판정 수치) 도입 여부.
- lore 해금 임계치/분량과 ‘엔딩’ 정의.
- 접속자 소질의 기계적 영향(서술 편향만 vs 점수 모디파이어).
- 이미지 자동 생성 빈도(핵심 비트만 vs 매 막) — Phase 13 지연 모니터링 결과와 연동.
