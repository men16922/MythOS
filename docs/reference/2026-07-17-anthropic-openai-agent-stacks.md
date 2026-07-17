# Anthropic(Claude) / OpenAI 에이전트 스택 — MythOS 차용점 분석

작성: 2026-07-17 · 성격: 외부 기술 레퍼런스 (Google 편 `2026-07-17-adk2-agent-stack-vs-mythos.md`의 자매편)
전제: 오너 가설 "이쪽(에이전트 프레임워크)은 Claude/OpenAI가 더 앞설 것" — 검색 결과 **대체로 맞음**.
Google ADK가 "그래프 구조"를 이제 표준화했다면, Anthropic은 **컨텍스트 엔지니어링**(장기 실행의 실전 문제)에서,
OpenAI는 **가드레일·트레이싱→평가 파이프라인**에서 한 발 앞서 있음.

---

## 1. Anthropic — 컨텍스트 엔지니어링 3종 세트가 핵심 (장기 루프 게임과 가장 유관)

| 기능 | 내용 | MythOS 대응/차용 |
|---|---|---|
| **Compaction** (API 네이티브, beta `compact-2026-01-12`) | 컨텍스트를 고충실도 요약으로 접어 긴 대화를 계속 | 우리 `session_memory` rolling synopsis = **도메인 특화 compaction을 이미 자체 구현**. API 네이티브 전환은 Gemini 경로라 해당 없음 — 설계 방향 검증 |
| **Tool-result clearing** (context editing) | 재조회 가능한 옛 툴 결과를 지우되 "호출했다는 기록"은 유지 | 우리 prompt diet(머신 레코드 whitelist 제외)와 동일 발상. "기록은 남기고 본문만 비움" 아이디어는 shard 원문 보관 정책과 상통 |
| **Memory tool + 자동 경고** | 클리어 임계 **직전에 "중요한 것 먼저 메모리에 저장하라"는 자동 경고**를 모델에 보냄 | ★ **차용 1순위 패턴.** 우리가 07월에 겪은 버그(autosave 레코드가 recency window에서 **echo carryover를 밀어냄**)의 일반해 — "윈도우 트리밍 전에 반드시 살아남아야 할 사실(에코·관계·플래그)을 원장으로 승격하는 결정론 패스"를 invariant로 명문화할 가치 |
| **서브에이전트 격리** (lead + specialist, 각자 컨텍스트, 공유 FS 병렬) | 리드가 분해→전문 서브에이전트 위임→결과만 회수 | 우리 overnight 3엔진 레인 + worktree 병렬 = 동일 구조 (이미 운영 중) |
| **Hooks** (라이프사이클 인터셉트) | 툴 호출 전/응답 후/에러 시 개입 | 우리 runner 릴레이(critic·image-judge·browser-QA) = 같은 관용구의 외부화 버전 |
| **Managed Agents: 스케줄러 + dreaming pass + 루브릭 채점** | 같은 프리미티브 위에 스케줄러, 오프라인 통합(dreaming), **rubric 기반 결과 채점** | ★ dreaming = 우리 shard rollup의 상위 개념(오프라인 통합 잡 형식화 근거). **루브릭 채점은 아래 §3 공통 차용점** |

## 2. OpenAI — 4 프리미티브(agents/tools/handoffs/guardrails) + 트레이싱→평가 루프

| 기능 | 내용 | MythOS 대응/차용 |
|---|---|---|
| **Guardrails** (입출력 검증을 에이전트 실행과 **병렬**, fail-fast) | 입력 가드는 첫 에이전트, 출력 가드는 최종 산출에만 | 우리 validator/클램프/콘텐츠 invariant = 동일 역할. "스트리밍 중 병렬 regex 파서"도 이미 있음 — 검증 |
| **Handoffs** (제어권 이양 — 함수 호출이 아니라 대화 소유권 이전) | 이양 후엔 새 에이전트가 소유 | 듀얼 모델 storyteller→parser, 서사→전투 엔진 이양 = 동일 구조 |
| **Sessions** (영속 작업 컨텍스트) | Responses API 기반 상태 유지 | Postgres per-transition + 세션 메모리로 이미 초과 구현 |
| **Structured outputs** (Pydantic strict 스키마) | 스키마 자동 생성+검증 | `ScenePayload` + Gemini `response_schema` = 동일 |
| **Tracing → Evals → fine-tune 파이프라인** | 모든 런이 자동으로 트레이스(LLM 호출·툴·핸드오프·가드레일 결과) → 그대로 **평가/증류 재료**로 씀 | ★ **차용 2순위.** 우리는 트레이스(OTel + tokens/cost + key_beat 로그)까지는 있는데 **트레이스→평가 재사용 고리가 없음** — 아래 §3 |
| Sandbox agents (격리 워크스페이스 + 재개 가능 상태) | 매니페스트 정의 파일 + resumable | worktree 격리와 동일 발상 |

주목: OpenAI SDK는 "LLM 오케스트레이션이 기본" — Google ADK와 정반대 축. **MythOS는 ADK 쪽(결정론 그래프)이 정답**임을 재확인 (서사 게임은 흐름이 저작물).

## 3. MythOS 차용 제안 (구체안, 우선순위순)

1. **골든 루프 평가 뱅크 + LLM-judge 루브릭** (OpenAI evals + Anthropic rubric grading 합성) —
   실플레이 루프 트랜스크립트 몇 개를 골든셋으로 은행화하고, 서사 루브릭(연속성·레지스터·반복·이름 정합)
   채점자를 붙이면: ①**키비트 A/B 판정의 보조 데이터**(§1 오너 체감 + 루브릭 점수 병기) ②이후 모든
   프롬프트/directive 변경의 회귀 게이트(semantic critic의 서사 품질판). 기존 자산(트레이스 로그·
   `narrative_metrics`·critic 릴레이)이 다 있어 조립 비용이 낮음. → `[auto:claude]` 시드 후보.
2. **"트리밍 전 승격" invariant** (Anthropic memory-tool 경고 패턴의 결정론화) — recency window/
   synopsis 압축이 일어나기 전에 반드시 생존해야 할 사실 클래스(active echo·관계 델타·미해소 플래그)가
   원장에 있는지 검사하는 소스락 테스트. 07월 echo-crowding 버그의 재발 방지를 패턴 수준으로 격상.
3. **shard rollup의 "dreaming pass" 형식화** — 지금은 rollup이 경로 내 처리인데, Managed Agents의
   dreaming처럼 **오프라인 통합 잡**(overnight 레인 1항목)으로 빼면 raw shard 보존 정책(DB hygiene
   리스크 항목)과 자연 결합. 급하지 않음 — DB 부하가 실제로 문제 될 때.
4. **채택 불필요 확인**: compaction/session API(자체 구현이 이미 도메인 특화로 우월), handoff/구조화
   출력/가드레일(동등물 보유), LLM-오케스트레이션 기본값(우리 도메인에 부적합).

## 4. 3사 종합 한 줄

- **Google ADK 2.0**: 흐름 구조(결정론 그래프) — 우리가 이미 구현한 것의 표준화.
- **Anthropic**: 장기 실행 컨텍스트 위생(compaction·클리어·메모리·경고) — 우리 session_memory가 같은
  문제를 풀었고, "트리밍 전 승격" 패턴만 가져올 가치.
- **OpenAI**: 운영 루프(트레이스→평가→개선) — **우리의 실질 공백은 여기**(평가 뱅크 부재). 차용 1순위.

## Sources

- https://code.claude.com/docs/en/agent-sdk/overview (Claude Agent SDK 프리미티브)
- https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools (compaction/clearing/memory 3종)
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool (memory tool + 임계 경고)
- https://www.anthropic.com/engineering/managed-agents (Managed Agents: 스케줄러·dreaming·rubric 채점)
- https://openai.github.io/openai-agents-python/ (4 프리미티브 · sessions · tracing · sandbox agents)
- https://openai.github.io/openai-agents-python/handoffs/ (handoff 의미론)
- https://developers.openai.com/api/docs/guides/agents (Responses API 기반 오케스트레이션)
