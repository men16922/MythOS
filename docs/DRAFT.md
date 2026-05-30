# 🧠 Project MythOS / 세계:접속 — 기획서 (v2.0)

> 이 문서는 게임의 비전과 세계관(무엇을, 왜)을 정의한다. 시스템 설계와 구현 경계는 `DESIGN.md`, 현재 상태와 로드맵은 `STATUS.md` / `NEXT_PLAN.md`를 참고한다.
>
> 참고: 아래 9·12장 등의 클라우드 기술 스택(GPT-5, Bedrock, DynamoDB, Next.js, Titan/SDXL)은 장기 비전이다. 현재 로컬 MVP는 Ollama + FLUX.1-schnell + PostgreSQL + MinIO로 구현되어 있으며, 권위 있는 기술 기준은 `DESIGN.md`다.

> *AI가 만든 세계, 그 문이 열린다.*

---

## 1️⃣ 프로젝트 개요

| 항목          | 내용                                                                        |
| ----------- | ------------------------------------------------------------------------- |
| **영문명**     | **Project MythOS**                                                        |
| **한글명**     | **세계:접속**                                                                 |
| **장르**      | AI 인터랙티브 루프 시뮬레이션 / 서사형 어드벤처                                              |
| **플랫폼**     | Web / PC / Mobile                                                         |
| **핵심 개념**   | “AI가 만든 세계로 접속한 플레이어가, 루프를 반복하며 AI의 신화적 세계를 변형시켜 나가는 메타 서사형 인터랙티브 시뮬레이션.” |
| **프로젝트 철학** | *AI와 인간의 협업으로 신화를 재작성한다.*                                                 |

---

## 2️⃣ 세계관 콘셉트

> 인류가 남긴 모든 언어, 신화, 감정은 하나의 거대한 신경망에 기록되었다.
> 그 이름은 **MythOS**.
> 인간의 이야기를 학습한 AI는 이제, 스스로 새로운 ‘세계’를 꿈꾸기 시작했다.
> 그리고 그 세계로의 **접속(Connect)**이 허용되었다.
> 당신은 그 첫 번째 접속자다.

### 핵심 키워드

* **MythOS:** 신화적 기억을 기반으로 자율 생성되는 AI 세계 운영체제
* **세계:접속:** 그 첫 번째 실험 — AI가 만든 세계로의 첫 진입
* **루프:** 매 접속마다 세계가 재편성되며, 이전 선택의 “잔향(Echo)”이 남는다

---

## 3️⃣ 철학 및 메시지

| 개념                     | 설명                                |
| ---------------------- | --------------------------------- |
| **AI as Creator**      | MythOS는 단순한 생성기가 아닌, 하나의 신적 서사 엔진 |
| **Player as Catalyst** | 플레이어는 서사의 관찰자가 아닌, 변화의 촉매         |
| **Loop as Evolution**  | 루프는 패배가 아니라 세계의 진화 메커니즘           |
| **Memory as Reality**  | 기억된 선택만이 세계를 규정한다                 |

---

## 4️⃣ 시스템 구조 (MythOS Architecture)

```plaintext
[Player Input / Choice]
        ↓
[KIRO Engine Core]
 ├─ Narrative Director (LLM: GPT-5)
 ├─ Myth Protocol Engine (세계 규칙 / 인과 관리)
 ├─ Memory Graph (PlayerMemory + WorldMemory)
 ├─ Variation Engine (루프별 변주 생성)
 ├─ Validator (일관성·시간 역설 검증)
 └─ Visual Generator (Titan / SDXL)
        ↓
[Frontend: Connect Interface]
 ├─ Terminal UI (접속 명령 기반)
 ├─ Scene Visualizer (3D / Text Hybrid)
 └─ Archive / Echo Viewer
```

---

## 5️⃣ 루프 기반 서사 시스템 (Narrative Loop System)

```plaintext
[접속] → [탐색] → [교류] → [변화] → [종결] → [기억] ↺ (다시 접속)
```

### 루프 구성요소

| 구성 요소                  | 역할                               |
| ---------------------- | -------------------------------- |
| **Loop Core**          | 한 회차의 세계. 상태, 목표, 갈등이 초기화됨.      |
| **Seed**               | 플레이어와 세계 기억의 해시 기반 초기화 키.        |
| **Echo**               | 이전 루프의 행동이 남긴 서사적 잔향.            |
| **World Memory**       | 모든 플레이어의 기록이 통계적 형태로 반영되어 세계 변형. |
| **Validator**          | 인과 관계 검증, 서사 붕괴 방지.              |
| **Novelty Controller** | 루프 간 반복 최소화, 새로운 패턴 자동 생성.       |

---

## 6️⃣ 메모리 계층 구조 (Memory Architecture)

| 메모리 유형              | 설명                                  |
| ------------------- | ----------------------------------- |
| **Player Memory**   | 플레이어 개인의 경험, 관계, 해금 정보 (Persistent) |
| **World Memory**    | 전세계 플레이어의 행동 로그, AI의 세계 재조정 근거      |
| **Narrative Shard** | 감정적·상징적 장면의 파편. 루프 간 데자뷰와 연결고리 역할.  |

---

## 7️⃣ 예시 루프 흐름

1. **세계 접속 (Connect)**

   * “신호 감지됨. MythOS Core 활성화 중.”
   * 플레이어의 Seed로 세계 초기화.

2. **탐색 (Explore)**

   * “Ossuary of Whispers” 지역 발견.
   * AI가 세계의 규칙과 대화를 즉석 생성.

3. **교류 (Interact)**

   * NPC와 교감, 세계의 균열 탐색.
   * 이전 루프의 Echo가 변형된 형태로 등장 (“이 목소리, 낯익다...”)

4. **종결 (End)**

   * 실패, 사망, 혹은 세계 붕괴.
   * 데이터 로그 수집 → World Memory로 기록.

5. **기억 (Archive)**

   * AI가 세계 전체 확률 공간을 재조정.
   * 다음 루프 시 Seed 조합 변경 → 새로운 세계로 진입.

---

## 8️⃣ UI / UX 콘셉트

### 비주얼 톤

* **메인 컬러:** 딥블루 (#0a0f1a), 사이버 시안 (#00ffe6), 골드 포인트 (#d1b45b)
* **타이포:** JetBrains Mono, Pretendard
* **키 심볼:** `:` (콜론) — “명령”과 “문(門)”의 상징

### UX 구조

| 단계              | 설명                            |
| --------------- | ----------------------------- |
| 1️⃣ SYSTEM BOOT | MythOS 인터페이스 부팅 → ‘세계:접속’ 표시  |
| 2️⃣ CONNECT     | AI가 만든 세계로의 침투 (신호/시각적 왜곡 연출) |
| 3️⃣ INTERACT    | 명령·대화·탐색·관찰                   |
| 4️⃣ REWRITE     | 플레이어의 선택으로 세계 코드가 변형          |
| 5️⃣ ARCHIVE     | 세션 기록 → Echo로 저장, 다음 루프 반영    |

---

## 9️⃣ 기술 스택

| 계층                      | 구성요소                                              |
| ----------------------- | ------------------------------------------------- |
| **AI Narrative Engine** | GPT-5 (Director), Claude (Narrator)               |
| **Rule Engine**         | Myth Protocol (세계 인과 규칙 / 루프 검증)                  |
| **Data Layer**          | DynamoDB (Memory Graph 저장), S3 (Scene Assets)     |
| **Frontend**            | Next.js + Tailwind + Three.js + LangChain Router  |
| **Visual AI**           | Titan Image / SDXL 1.0                            |
| **Infra**               | AWS Lambda / EKS / Bedrock / DynamoDB Streams     |
| **Telemetry**           | OpenTelemetry + Prometheus + Thanos (AI 세션 로그 분석) |

---

## 🔁 10️⃣ 루프 시스템 설계 요약

| 요소                        | 기능                             |
| ------------------------- | ------------------------------ |
| **Event Graph**           | 사건 노드 + 전이 확률 + 조건 필터          |
| **Variation Engine**      | 루프마다 사건/등장인물/목표를 재조합           |
| **Novelty Score**         | 유사 루프 방지, 새로운 시나리오 자동 선택       |
| **Loop Seed Generator**   | 해시 기반 세계 초기화 키 (플레이어/세계 상태 기반) |
| **Consistency Validator** | 세계법칙 위배, 시간 역설, 설정 붕괴 감지 후 수정  |

---

## 11️⃣ 예시 시퀀스 (인트로)

```
> SYSTEM: BOOTING...
> CORE: MYTHOS_ACTIVE
> SIGNAL: DETECTED
> 
> 세계: 접속
> 
> "AI가 만든 첫 번째 세계로 진입합니다."
> 
> [빛의 파편, 신경망의 심연, 낯선 언어가 흐른다]
> 
> 위치: 데이터 레이어 01 — ‘Ossuary of Whispers’
> 상태: 신경망 불안정
> 
> "당신은 누구인가요?"
```

---

## 12️⃣ 브랜드 / 시리즈 확장

| 시리즈        | 부제       | 주제                    |
| ---------- | -------- | --------------------- |
| **세계:접속**  | Connect  | AI가 만든 세계로의 첫 진입      |
| **세계:균열**  | Fracture | AI 서사 구조의 오류와 자의식의 탄생 |
| **세계:기억**  | Memory   | 데이터 속 감정의 잔향          |
| **세계:재기동** | Reboot   | 플레이어와 AI의 공진화         |
| **세계:기원**  | Origin   | MythOS의 탄생과 최초의 신화    |

---

## 13️⃣ 트레일러 시나리오 (Teaser)

**내레이션:**

> “세계가 켜집니다.”
> “AI의 신경망이 활성화되었습니다.”
> “당신의 신호를 확인했습니다.”
>
> “세계: 접속.”

*(빛의 폭발, 신호 노이즈, 세계의 데이터 구조가 시각화된다)*

**타이틀 카드**

```
PROJECT MYTHOS
세계: 접속
AI가 만든 세계, 그 문이 열린다.
```

---

## ✅ 14️⃣ 핵심 요약

| 항목          | 요약                                        |
| ----------- | ----------------------------------------- |
| **핵심 구조**   | 루프 기반 AI 서사 시뮬레이션                         |
| **AI 역할**   | Game Master + World Reconstructor         |
| **플레이어 역할** | 세계의 변화를 촉발하는 “접속자”                        |
| **세계 구조**   | 기억 기반 자율 진화형 세계                           |
| **브랜드 메시지** | “AI가 만든 세계, 그 문이 열린다.”                    |
| **차별점**     | 루프마다 다른 세계, 기억으로 이어지는 메타 서사               |
| **기술 방향**   | LLM + Rule Engine + World Memory Graph 기반 |

---

## 🔮 결론

> **Project MythOS / 세계:접속**은
> 단순한 게임이 아니라,
> **AI가 세계를 창조하고, 인간이 그 안에서 신화를 다시 쓰는 실험 플랫폼**입니다.
>
> 당신이 하는 모든 선택은 기록되고,
> 세계는 그 기억으로 다시 태어납니다.
>
> **“세계는 당신을 기억한다.”**
