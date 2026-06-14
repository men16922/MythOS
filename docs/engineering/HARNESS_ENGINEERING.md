# HARNESS_ENGINEERING — 에이전트 안전 운영 scaffolding (바이블)

> **범용 개념 문서(bible).** 특정 repo 에 묶이지 않는다. 이 repo 적용(해석)은 → [`mythos/HARNESS.md`](mythos/HARNESS.md).

## 정의
AI 에이전트가 코드를 마음대로 만들게 두지 않고, **repo 안에 지식·제약·검증·상태기록·리뷰 루프**를 심어
에이전트가 안전하게 반복 실행되게 하는 운영 체계. 한 줄 원리: **Humans steer. Agents execute.**
사람은 방향·경계·예외를 정하고, 에이전트는 그 안에서 구현·검증·수정·기록을 반복한다.

## 1. 성숙도 사다리 (L0→L4)
| 레벨 | 정의 |
| --- | --- |
| L0 Ad-hoc | 매번 사람 승인, 규칙·상태가 대화창에만 존재 |
| L1 Basic Harness | 에이전트 지침 파일 + lint/test 게이트 + worktree/branch 격리 + 계획 문서화 |
| L2 Automated Feedback | 게이트 스크립트 + 독립 리뷰어 + 실패 자동 재시도 + checkpoint 저장 |
| L3 Multi-Agent | coder/reviewer/gardener 역할 분리 + 위험도 기반 승인 + 병렬 worktree + 정기 entropy scan |
| L4 Self-Evolving | 실패 trace 분석 + 하네스 자체 개선 PR + 예외에서만 인간 개입 |
대부분 프로젝트는 **L2→L3** 이 현실적 목표다. 레벨을 자가진단하고 다음 한 칸의 갭만 투자한다.

## 2. Feedback Ladder — 반복 피드백은 더 강한 시스템으로 승격
| 반복도 | 인코딩 대상 |
| --- | --- |
| 1회 | 리뷰 노트 |
| 2회 | 문서 |
| 3회+ | 스크립트 / 린터 / 테스트(결정론 게이트) |
| 안전 위배 | hard gate(차단) |
핵심: 같은 지적이 반복되면 산문이 아니라 **결정론 게이트로 박제**한다.

## 3. Verification Layers — 결정론 우선, 확률론은 위에 얹는다
| 층 | 트리거 | 잡는 것 |
| --- | --- | --- |
| L1 | 파일 변경 | 금지 패턴·파일 크기·secret·conflict marker |
| L2 | 턴 종료 | lint·format·typecheck·architecture/dependency 규칙 |
| L3 | 완료 전 | unit·integration·contract 테스트 |
| L4 | L3 후 | LLM/Codex read-only 리뷰(버그·엣지·drift) |
| L5 | PR/머지 | 전체 CI·E2E·사람 승인 |
L1-L3(결정론)을 우선 갖추고, L4(확률론 리뷰)는 그 위에 얹는다. 단일 게이트 명령으로 묶어도 되고
스크립트로 쪼개도 된다 — **무엇이 어디서 걸리는지**만 명확하면 된다.

## 4. Tier 기반 경계 보안 — 매 명령 승인이 아니라 경계로
| Tier | 행동 |
| --- | --- |
| 1 항상 허용 | read·grep·glob·git status/diff |
| 2 repo 내 허용 | src/tests/docs/scripts 수정 + 열거된 안전 명령 + 로컬 commit |
| 3 조건부(차단/사람) | push·네트워크·파괴 명령·secret·prod·dependency 설치 |
Tier 3 는 실행 전 plan 을 요구한다(하려는 것·이유·영향·복구·명령). 무인 환경은 Tier 3 를 **물리적으로 차단**한다.

## 5. 채택 원칙
- **Repository as SoT**: 규칙·상태는 대화·메모리가 아니라 repo 에. 계획도 repo 안에(스크래치 경로 금지).
- **Agent Legibility First**: 진입점은 작게, 핵심 문서는 짧게, 상세는 링크로. 금지는 테스트/스크립트로 강제.
- **Constraints Create Speed**: "하지 말 것"을 명시하면 추측·드리프트가 줄어 오히려 빨라진다.
- **Progressive Deletability**: 모든 룰/게이트에 **제거 조건**을 단다(예: 3개월 무위배·CI 가 동일 검증·아키텍처 불일치 시 제거).
- **Agent-friendly errors**: 게이트 실패는 *무엇이/어디서/왜 금지/어떻게 고치는지* 4요소를 담아 에이전트가 자가수정 가능하게.

## 6. 3중 상태 저장
git history(변경 이력) + 구조화 ledger(작업/이벤트 원장) + 자연어(상태·진행·핸드오프 문서).
메모리가 아니라 디스크가 source of truth → 회차당 fresh context 로 복원.

## 7. 형제 개념 (바이블)
- 자율 루프: [`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md) · 멀티에이전트: [`AGENTIC_ENGINEERING.md`](AGENTIC_ENGINEERING.md)
- 컨텍스트: [`CONTEXT_ENGINEERING.md`](CONTEXT_ENGINEERING.md) · 프롬프트: [`PROMPT_ENGINEERING.md`](PROMPT_ENGINEERING.md)
- 이 repo 적용: [`mythos/HARNESS.md`](mythos/HARNESS.md)
