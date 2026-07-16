# AI Native Engineering Team — 블루프린트 & MythOS 적용 범위
최종 갱신: 2026-06-14

> 출처: `bin/docs/archive/AI_REARCH.md`(ChatGPT 5.5 제안)에 대한 정제·피드백.
> 이 문서는 **일반 블루프린트**(범용 AI 엔지니어링 팀)와 **MythOS 가 실제 채택한 범위**를 분리한다.
> 멀티클라우드/K8s/DevOps 레이어는 **MythOS 가 아니라 사용자의 별도 DevOps-Agent 목표**에 속한다.

## 1. 채택한 핵심 원리 (모든 프로젝트 공통)
1. **AI 전문화: Builder ≠ Reviewer ≠ Researcher ≠ Operator ≠ QA.** 단일 AI 가 전부 하지 않는다.
2. **생성자 ≠ 리뷰어.** 만든 사람과 검수하는 사람을 분리해 자기확증 편향을 줄인다(작성→리뷰→수정 루프).
3. **MCP = 교체 가능한 Tool Layer.** AI 모델을 바꿔도 외부 시스템(SCM/브라우저/클라우드) 연결은 재사용.
4. **상태는 파일/git 에.** 메모리가 아니라 디스크가 source of truth(컨텍스트 비대 회피, 회차당 커밋).

## 2. 역할 매핑 (블루프린트 → MythOS 구현)
| 블루프린트 역할 | 후보 | MythOS 에서 | 구현 위치 |
| --- | --- | --- | --- |
| Orchestrator(PM/CTO) | OpenClaw 등 별도 | **claude 가 겸함**(별도 프로세스 과함) | `merge-loops.sh`, NEXT_PLAN 레인 태깅 |
| Builder(Principal SWE) | Claude | **claude** — src/tests/하네스/리팩터 | `loop/claude`, `[auto]`/`[auto:claude]` |
| Reviewer(Auditor) | Codex | **codex** — 통합 diff 읽기전용 감사(+자기 레인 빌드) | `review.sh`, `PROMPT.review.md`, `make overnight-review` |
| Researcher | Gemini | **agy(Antigravity=Gemini)** — 리서치 + 이미지 초안 | `loop/agy`, `[auto:agy]`, in-session Imagen/Gemini |
| QA | Playwright | Playwright MCP + E2E | `tests/playwright/`, `make test-e2e` |
| Content(세계관/NPC/스토리) | Local Gemma/Qwen | 런타임 서사(이원화 dual-model) + codex 콘텐츠 레인 | `mythos_narrative/`, `[auto:codex]` |

→ 즉 블루프린트의 **멀티모델·멀티에이전트·생성자≠리뷰어·MCP Tool Layer** 골격은 MythOS 가 실제 구현했다
(`docs/engineering/mythos/AGENTIC.md` 가 운영 권위).

## 3. MythOS 범위 밖 (별도 DevOps-Agent 프로젝트)
아래는 블루프린트엔 있으나 **MythOS(로컬 단일플레이 내러티브 게임)와 무관** — 배포/인프라가 없다.
적용하지 않고, 사용자의 별도 "Autonomous DevOps Agent" 목표를 위한 참고로만 둔다.
- **멀티클라우드 MCP**: AWS(EC2/EKS/IAM/Bedrock/Lambda/CFN), GCP(GKE/Vertex/BigQuery/Cloud Run), Azure(AKS/Foundry/Cosmos).
- **오케스트레이션 인프라**: Kubernetes, Terraform, CI/CD, Telegram/Slack 리포트.
- **별도 Orchestrator 프로세스(OpenClaw)**: 다수 클라우드/리포를 다룰 때 가치. 단일 게임 repo 엔 claude 겸임으로 충분.

해당 프로젝트를 시작할 때 이 블루프린트(§1 원리 + MCP 재사용)를 그대로 가져가되, Builder/Reviewer/Researcher
삼분할 + 생성자≠리뷰어 루프는 MythOS 에서 검증된 패턴(`scripts/overnight/`)을 재사용하면 된다.

## 4. 솔직한 한계 / 주의
- 블루프린트는 다소 범용·포부형이다. 로컬 게임에선 Research/Operator/멀티클라우드 비중이 낮다.
- 에이전트 추가는 공짜가 아니다 — 토큰·조정 비용. MythOS 는 3엔진(claude/codex/agy)에서 멈추는 게 합리적.
- "모델 교체 자유"는 MCP/도구 계층에서만 참이다. 프롬프트/게이트/레인 규약은 여전히 프로젝트가 소유한다.

## 5. 관련 문서
- 운영 권위: `docs/engineering/mythos/AGENTIC.md` · 루프: `docs/engineering/mythos/LOOP.md` · 원제안: `bin/docs/archive/AI_REARCH.md`
