# 리서치: 로컬 LLM vs Gemini 3.5 Flash · 클라우드 GPU의 실제 용도 · 비FM 기업의 독자 모델과 게임 산업

작성: 2026-07-05 · 딥리서치 하네스(웹 팬아웃 → 소스 23개 fetch → 주장 111개 추출 → 상위 25개 적대검증) + MythOS 자체 실측 결합.
세션 한도로 16개 주장의 교차검증·최종 합성은 미완(재개: `resumeFromRunId: wf_82fe1a3b-656`) — 본 문서는 수동 합성본.

**표기**: ✅ = 3표 적대검증 통과 · ⚠️ = 1차 출처 확보(교차검증 미완) · 💭 = 지식 기반(컷오프 2026-01) · 📏 = MythOS 자체 실측

---

## 1부 — 로컬 LLM vs Gemini 3.5 Flash: 격차는 "일반 지능 < tool use < 신뢰성" 순으로 벌어진다

### (a) 일반 지능/추론

- Gemini 3 Flash: **MMLU-Pro 89% · GPQA Diamond 90% · Artificial Analysis 지능지수 71** (2.5 Flash 대비 +13) ✅
  — 3.5 Flash는 그보다 상위. [artificialanalysis.ai](https://artificialanalysis.ai/articles/gemini-3-flash-everything-you-need-to-know)
- 소비자 하드웨어(Mac 48-64GB / RTX 5090) 최상급 로컬(Qwen3-32B급·Llama 70B급): 💭 MMLU-Pro 60-75%대,
  GPQA-D 45-65%대. 8B급(gemma류): 💭 MMLU-Pro 40-50%대.
- **결론: 최상급 로컬도 Flash급 대비 한 세대(10-20pt), 8B는 두 세대 차이.**

### (b) Tool use / 에이전틱 — 격차가 가장 큰 축

- 반전: 클라우드인 **Gemini 2.5 Flash조차 tau-bench airline 정확도 59.0%, 신뢰도 0.72로 15개 에이전트 중 11위** ✅
  (Princeton HAL). 멀티턴 도구 사용은 클라우드 flash급도 아직 잘 못하는 영역 — 로컬은 여기서 더 크게 무너진다.
  [hal.cs.princeton.edu](https://hal.cs.princeton.edu/reliability/agent/gemini-2-5-flash/benchmark/taubench_airline/)
- BFCL(Berkeley Function-Calling Leaderboard)이 함수 호출 능력의 표준 척도 ✅.
  💭 로컬 오픈웨이트는 단발 함수 호출(BFCL simple)은 곧잘 하지만 멀티턴·오류 복구·병렬 호출에서 급락하는 패턴이 일관됨.
- **"테스트용으로도 클라우드가 낫다"는 통념의 실체 = 단발 성능이 아니라 에이전틱 신뢰성의 차이.**

### (c) 구조화 출력(JSON) — MythOS 실측과 학술 결과가 정확히 일치

- 제약 디코딩 벤치마크(arXiv 2501.10868): Gemini/OpenAI controlled generation은 JSON Schema **기능 커버리지 최하위**
  (예: GitHub Easy 스키마 커버리지 Gemini 0.07 vs Guidance 0.86)이지만, **지원하는 부분집합 안에서는 컴플라이언스 ~1.00** ✅
  — "좁게 지원하되, 지원하는 건 절대 안 틀린다"는 의도적 설계.
- 📏 MythOS: 3.5 Flash controlled generation 파스 4/4·리페어 0이 바로 이 설계의 체감.
- 반대편: "로컬 모델에 제약 디코딩을 걸면 품질 손실 없이 스키마 신뢰성을 얻는다"는 주장은 **적대검증에서 반박됨(0-2 ✗)**
  — 로컬 8B에 문법 강제를 걸면 다운스트림 품질이 흔들릴 수 있음. 📏 gemma4 8B에 qwen 3B 파서를 별도로 붙여야 했던
  MythOS 이중모델 구조가 우연이 아님.

### (d) 실효 비용

- 온프레미스 손익분기 연구(arXiv 2509.18101) ⚠️: RTX 5090($2,000)+32B는 **고가 API(Opus급) 상대 0.3~3개월**이면 본전,
  그러나 **flash급 저가 API 상대로는 31~108개월+** — 사실상 성립 안 함.
- 가격 ⚠️(Google 공식 + 📏 실과금 일치): 3.5 Flash $1.50/$9 per M (2.5 Flash $0.30/$2.50의 ~5배);
  Gemini 3 Flash는 $0.5/$3 ✅ 로 "지능 대비 최저비용" 포지션.
- **로컬이 이기는 영역은 비용이 아니라**: 프라이버시/오프라인 · 지연 민감 실시간(3부 KRAFTON 사례) · 좁은 도메인 파인튜닝.

---

## 2부 — 클라우드 GPU는 "학습용"이 아니라 점점 "추론용"

- OpenAI 2024년 컴퓨트 지출(Epoch AI) ⚠️: **학습 ~$3B + 연구 ~$1B vs 추론 ~$1.8B**. 그 "학습"의 대부분도 릴리즈 모델의
  최종 학습런이 아니라 **실험·미공개 연구**. [epoch.ai](https://epoch.ai/data-insights/openai-compute-spend)
- 전 산업: **프론티어 5개 랩(OpenAI·Anthropic·xAI·GDM·Meta)의 컴퓨트가 전세계 AI 컴퓨트의 절반 미만** ⚠️ — 나머지는
  2군 랩 + 오픈웨이트 추론 서빙 + 추천시스템 등. [epoch.ai](https://epoch.ai/gradient-updates/frontier-labs-dont-use-most-ai-compute)
- McKinsey 전망 ⚠️: 추론 수요 CAGR 35%(→2030년 90GW+) vs 학습 22%(→60GW+) — **2030년엔 추론이 지배 워크로드**.
- **답: 일반 기업이 클라우드 H100/B200을 빌리는 전형적 용도는 사전학습이 아니라 파인튜닝(LoRA/SFT) + 자사 서비스 추론 서빙.**

---

## 3부 — 비(非)프론티어 기업의 "독자 모델" 전략과 게임 산업

### 전략 스펙트럼과 GPU 오더 💭

| 전략 | GPU/비용 오더 | 누가 |
|---|---|---|
| API 래핑 + RAG/프롬프트 | GPU 0 | 대부분의 기업 (MythOS 현 구조) |
| 오픈웨이트 + LoRA/SFT 후학습 | 7-8B: GPU 1장 × 수시간~수일 | "독자 모델" 주장의 실체 대부분 |
| 증류 (교사 → 소형 학생) | 수~수십 GPU × 수일~수주 | 온디바이스가 목표일 때 |
| 풀 사전학습 | 수백~수천 GPU-월, 수백만$+ | 극소수 (국가·대기업 프로젝트) |

### 게임 산업 사례 — 정확히 이 패턴

- **KRAFTON PUBG Ally** ⚠️(NVIDIA 개발자 블로그): 자체 사전학습이 아니라 **큰 교사 모델에서
  Mistral-NeMo-Minitron-2B로 증류**해 게임 특화 행동을 모델에 내재화. **클라우드 LLM 지연이 실시간 스쿼드 보이스에
  못 미쳐 온디바이스 선택** — 양자화 2B가 PUBG와 함께 **8GB VRAM에서 동시 구동**.
  [developer.nvidia.com](https://developer.nvidia.com/blog/how-krafton-built-pubg-ally-a-co-playable-character-powered-by-nvidia-ace/)
- **NVIDIA ACE Game Agent SDK** ⚠️: ~4B SLM(GGUF) + UE5 플러그인으로 온디바이스 NPC 대화·함수 호출 표준화 —
  게임향 에이전틱 AI는 프론티어가 아니라 **4B SLM 스케일**에서 배포되는 중.
- 게임 산업의 위치: GPU를 태동시킨 산업 → AI 시대에 두 갈래로 연결 — **데이터센터 GPU**(빌려서 후학습·증류)와
  **게이머 GPU**(그 결과물의 온디바이스 추론 배포).

### MythOS 함의

현 구조(서사 품질 = 클라우드 3.5 Flash, 로컬 Ollama = dev 전용)는 업계 패턴과 일치. 장기적으로 KRAFTON식 경로 —
좁은 역할(전투 나레이션·파서·분류)만 증류한 SLM을 플레이어 GPU에 내리는 하이브리드 — 가 "독자 모델"의 현실적 형태.

---

## 소스 목록

| 출처 | 검증 |
|---|---|
| artificialanalysis.ai — Gemini 3 Flash 분석 (지능지수·MMLU-Pro·GPQA·가격) | ✅ |
| hal.cs.princeton.edu — tau-bench airline 신뢰성 대시보드 | ✅ |
| github.com/ShishirPatil/gorilla — BFCL | ✅ |
| arxiv.org/2501.10868 — 제약 디코딩/구조화 출력 벤치마크 | ✅ (일부 ⚠️) |
| arxiv.org/2509.18101 — 온프레미스 LLM 손익분기 | ⚠️ |
| ai.google.dev — Gemini API 가격 | ⚠️ (📏 실과금 일치) |
| epoch.ai — OpenAI 컴퓨트 지출 · 프론티어 랩 컴퓨트 점유 | ⚠️ |
| mckinsey.com — AI 워크로드 전망 | ⚠️ |
| developer.nvidia.com — KRAFTON PUBG Ally · ACE Game Agent SDK | ⚠️ |
