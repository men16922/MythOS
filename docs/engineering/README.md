# Engineering — 에이전트 운영 5개 개념 (바이블 → 해석)

이 디렉터리는 MythOS 의 **AI 에이전트 운영 하네스**를 5개 개념으로 정의한다. 구조는 **바이블 → 해석**:
- **바이블**(`*_ENGINEERING.md`) = **범용·portable** 개념 문서. 특정 repo 에 묶이지 않는다(다른 프로젝트로 가져갈 수 있다).
- **해석**(`mythos/*.md`) = 그 개념을 **이 repo 의 실제 파일·명령·메커니즘에 매핑**한 적용 문서.

바이블은 "무엇/왜"를, 해석은 "이 repo 에서 어떻게"를 담는다. 각 바이블 끝에 짝 해석 링크가 있다.

## 5개 개념
| 개념 | 바이블(범용) | 해석(MythOS) |
| --- | --- | --- |
| 하네스(상위 운영 체계) | [HARNESS_ENGINEERING.md](HARNESS_ENGINEERING.md) | [mythos/HARNESS.md](mythos/HARNESS.md) |
| 자율 무인 루프 | [LOOP_ENGINEERING.md](LOOP_ENGINEERING.md) | [mythos/LOOP.md](mythos/LOOP.md) |
| 다중 에이전트 병렬 | [AGENTIC_ENGINEERING.md](AGENTIC_ENGINEERING.md) | [mythos/AGENTIC.md](mythos/AGENTIC.md) |
| 컨텍스트·연속성 | [CONTEXT_ENGINEERING.md](CONTEXT_ENGINEERING.md) | [mythos/CONTEXT.md](mythos/CONTEXT.md) |
| 프롬프트 | [PROMPT_ENGINEERING.md](PROMPT_ENGINEERING.md) | [mythos/PROMPT.md](mythos/PROMPT.md) |

## Read Order
1. **개념을 처음 잡을 때**: 바이블 `HARNESS_ENGINEERING.md`(전체 상) → 필요한 개념의 바이블.
2. **이 repo 에서 실제로 돌릴 때**: 짝 해석 `mythos/<개념>.md`(러너·make·파일 경로).
3. 무인 루프 운영 = `mythos/LOOP.md`(단일) → 병렬이면 `mythos/AGENTIC.md`.
4. 문서/상태/세션 연속성 = `mythos/CONTEXT.md` · 프롬프트/서사 톤 = `mythos/PROMPT.md`.

## 권위 / 상위 문서
- 설계 불변(모든 에이전트 공유): `harness/CORE_MANDATES.md`
- 문서 운영 규칙: `docs/DOCS_POLICY.md` · docs 인덱스: `docs/README.md` · 백로그/레인 태그: `docs/NEXT_PLAN.md`
- 원시 리서치(보존): `bin/docs/archive/HARNESS_RESEARCH.md` · `bin/docs/archive/AI_REARCH.md` · 정제 `docs/research/AI_TEAM_BLUEPRINT.md`
