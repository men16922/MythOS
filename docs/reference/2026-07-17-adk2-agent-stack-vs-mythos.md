# ADK 2.0 / Agents CLI / Antigravity — 사실 검증 + MythOS 엔진 비교 분석

작성: 2026-07-17 · 성격: 외부 기술 레퍼런스 분석 (오너 제공 세션 요약의 검증 + 차용점 도출)
검증 방법: Google 공식 소스 웹 검색·fetch (개발자 블로그 · adk-docs · agents-cli 문서 · I/O '26 Cloud 블로그)

---

## 1. 사실 검증 결과 — 요약의 뼈대는 진짜, 디테일 3곳이 틀림

| 요약의 주장 | 판정 | 실제 |
|---|---|---|
| ADK 2.0 = 그래프 기반 워크플로우 엔진, 결정론 노드 + LLM 노드 분리 | ✅ 사실 | I/O 2026(5/19) GA. 노드 그래프 + 스케줄러(동시 실행·상태 영속·휴먼 일시정지). 결정론 노드(Function/Tool/Join/서브그래프) + LLM 에이전트 노드(`Chat`/`Task`/`SingleTurn` 3모드)를 같은 그래프에 배치 |
| 상태 분리/데이터 스코핑 (노드에 필요한 payload만 전달) | ✅ 개념 사실 | 세션 기반 상태 영속 + `IsolationScope()` + **브랜치 격리**("한 브랜치의 대화가 다른 브랜치 LLM 프롬프트에 안 샘"). 단 **"비용 50% 절감" 수치는 공식 소스에 없음** — 마케팅성 첨언으로 보임 |
| HITL 장기 대기 | ✅ 사실 (단 소속이 다름) | ADK 그래프의 `RequestInputEvent` — 노드가 그래프를 멈추고 사람에게 질문, **프로세스 재시작을 넘어 durable resume** (세션 히스토리에서 상태 재구성). handoff / re-entry 2모드 |
| Agents CLI: `agents init` / `agents run --hot-reload` / `agents deploy` | ⚠️ 존재하나 커맨드명 틀림 | 실제는 **`agents-cli create --prototype` / `install` / `playground`**(localhost:8080 hot reload) + deploy 스킬(Agent Runtime·Cloud Run·GKE). 본질은 "AI 코딩 에이전트(Claude Code 포함)에게 에이전트 빌드/운영 전문 스킬을 얹는 스킬 패키지+CLI" — 모의응답(mock) 프레임 얘기는 문서에서 미확인 |
| **Antigravity = 엔터프라이즈 에이전트 전용 관리형 서버리스 런타임** | ❌ **오류 (핵심 혼동)** | Antigravity 2.0 = **코딩 에이전트를 조종·오케스트레이션하는 데스크톱 앱(IDE)** + Antigravity CLI/SDK. 요약이 Antigravity에 붙인 기능(장기 실행·격리 샌드박스·옵저버빌리티)은 전부 별개 제품 **"Agent Runtime"**(GCP 인프라 레이어)과 **Managed Agents API** 소속 |
| 세션 제목 "Build and deploy multi-agent graphs with…" | ⚠️ 미확인 | 해당 제목의 OnAir 세션은 검색으로 특정 안 됨 — I/O '26 발표 자료들의 재구성 요약으로 보임 |

**교훈**: 이 요약 자체가 LLM 생성물로 보이며, 제품명-기능 매핑이 한 군데 크게 어긋나 있었음 (우리가 overnight agy 레인에서 쓰는 그 Antigravity가 맞고, 런타임이 아님).

## 2. "결정론적 상태 머신 그래프" — 맞습니다, 우리 엔진과 같은 설계입니다

오너 직감대로, ADK 2.0의 핵심 명제 = **"흐름 제어는 코드(정적 그래프), LLM은 판단이 필요한 노드에만 격리"**는 MythOS가 이미 독립적으로 도달한 구조입니다:

| ADK 2.0 개념 | MythOS 대응물 | 비고 |
|---|---|---|
| 그래프 기반 워크플로우 (노드+엣지, 결정론 실행) | **`route_map.py` 사전저작 DAG** (layer→anchor→dynamic pool) + `route_runtime.py` 진행 | 우리는 서사 도메인이라 "턴→레이어" 1차축이 추가로 있음 |
| 결정론 노드 vs LLM 노드 분리 | **노드 스크립트 강도 3단계** (`PROMPT_LAYER.md` §4): 오프닝=hard 스크립트 · anchor=준스크립트 · dynamic=자유생성 | ADK는 이진 분리, 우리는 **LLM 자유도의 그라데이션** — 서사 게임에 더 맞는 일반화 |
| LLM 출력의 구조 계약 (typed schema) | `ScenePayload` JSON 계약 + Gemini `response_schema` + parse→repair→fallback 사다리 | 동일 철학. 우리 fallback 사다리(결정론 저작 장면)가 한 단계 더 깊음 |
| 상태 = 세션에 영속, durable resume | **Postgres per-transition 트랜잭션** + resume/재접속 멱등 choose + Neon reap 복구 | 동일. "프로세스 재시작 너머 재개"를 우리는 이미 프로덕션에서 검증 |
| 라우팅을 LLM에 맡기지 마라 | `advance_route` 결정론 축 집계(threshold=2) · `node_encounter_id` no-repeat 픽 · 전투는 별도 결정론 엔진 | 07-10 "consequence 시스템 결정론 배선" 결정과 정확히 같은 원칙 |
| 데이터 스코핑 (노드에 필요한 payload만) | **prompt diet** (narrative-kind whitelist, `_slim_*`, notes 8개 truncation vs synopsis 전량 채널) — 실측 **−25%** | ADK 문서엔 수치 없음; 우리는 측정치 보유 |
| HITL pause (handoff/re-entry) | 선택지 대기 = handoff · 재접속 재전송(멱등) = re-entry 유사 | 구조 동일 |
| 마이크로 에이전트화 | 듀얼 모델(storyteller→parser) + 키비트 라우팅(2.5/3.5) + 이미지/전투/서사 서비스 분리 | 우리는 "노드별 모델 라우팅"까지 진행 (ADK의 LLM 모드 개념과 상통) |

**결론: 차용할 구조적 부채는 없음.** 우리 엔진은 이 블루프린트를 이미 구현·초과(자유도 그라데이션, fallback 사다리, 노드별 모델 라우팅)하고 있고, 이번 검증은 그 설계 방향이 업계 표준으로 수렴 중이라는 **외부 근거**가 됨.

## 3. 그래도 차용 가치가 있는 것 (우선순위순)

1. **노드(비트 클래스)별 비용/지연 롤업** — ADK의 "노드별 latency·모델버전별 비용" 옵저버빌리티. 우리는 턴 단위 `tokens/cost` + `key_beat/model_override` 로그까지 있으니, **비트 클래스별 집계 쿼리 한 장**이면 키비트 A/B 판정(§1)의 비용 축을 데이터로 뒷받침 가능. (작음, 필요 시 `[auto:claude]` 시드 후보)
2. **노드별 retry policy의 명시적 표** — 우리 재시도는 지점별로 자라남(파서 repair · 스트리밍 비스트리밍 재생성 · 429 backoff · Neon pre-ping). 동작 변경 없이 **한 장짜리 정책 표**(어느 실패 → 어느 사다리)를 DESIGN.md에 두면 신규 실패 유형이 생길 때 배치 결정이 빨라짐. (문서만)
3. **Agents CLI의 "스킬 패키지" 모델** — Claude Code 등 코딩 에이전트에 전문 스킬을 얹는 접근은 우리 overnight-harness 플러그인과 동일 발상. **우리가 이미 하고 있는 방식의 타당성 확인**; Google의 스킬 구성(평가/배포/옵저버빌리티 분리)은 harness 스킬 분류 참고거리.
4. **Antigravity 2.0 / Antigravity CLI 추적** — agy overnight 레인이 쓰는 제품이 데스크톱+CLI로 확장됨. **CLI 버전은 브라우저 attach 플레이크(우리 standing 이슈)의 우회로가 될 수 있음** — agy 레인 다음 정비 때 Antigravity CLI 평가 1회차 가치 있음.
5. (해당 없음 확인) Agent Runtime/Managed Agents API — 우리 런타임은 Cloud Run + 자체 상태영속으로 충분; 게임 서버를 에이전트 런타임으로 옮길 이유 없음.

## 4. Sources

- https://developers.googleblog.com/announcing-adk-go-20/ (ADK Go 2.0 그래프 엔진 · HITL · IsolationScope)
- https://google.github.io/adk-docs/2.0/ · https://adk.dev/ (ADK 2.0 GA)
- https://google.github.io/agents-cli/guide/getting-started/ (실제 커맨드: create/install/playground)
- https://cloud.google.com/blog/topics/developers-practitioners/io26-news-for-agent-developers-on-google-cloud (Antigravity 2.0=데스크톱 앱 · Agent Runtime=인프라 · Managed Agents API 구분)
- https://codelabs.developers.google.com/enterprise-cloud-scale-deploying-the-expense-agent-to-agent-runtime-on-google-cloud (Agent Runtime 배포 경로)
