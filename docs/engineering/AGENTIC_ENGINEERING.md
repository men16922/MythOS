# AGENTIC_ENGINEERING — 다중 에이전트 병렬 운영 (바이블)

> **범용 개념 문서(bible).** 이 repo 적용(3엔진·worktree·make)은 → [`mythos/AGENTIC.md`](mythos/AGENTIC.md).

## 정의
여러 헤드리스 에이전트를 **역할·격리·게이트로 조직**해 충돌 없이 협업시키는 엔지니어링. 단일 에이전트가
전부 하지 않는다. 오케스트레이터가 작업을 분해·배정하고, 전문화된 에이전트가 각자 영역에서 실행한다.

## 1. 충돌을 "구조"로 막는다
동시 작성 충돌은 의지가 아니라 **격리**로 막는다. 세 축이 겹치지 않게 한다:
1. **작업 트리 격리** — 에이전트마다 다른 worktree+브랜치 → 같은 파일을 동시에 못 만진다.
2. **레인 분리** — 백로그 작업에 에이전트 접미사 태그 → 같은 항목을 둘이 집지 않는다.
3. **도메인 분할** — 에이전트별 디렉터리 소유권 → 머지 충돌이 사실상 없다.
4. **공유 문서 규약** — 셋 다 건드리는 문서는 append-only + merge=union, 또는 자기 레인 한 줄만 토글.

## 2. 역할 전문화 (Builder ≠ Reviewer ≠ Researcher ≠ QA)
| 역할 | 책임 |
| --- | --- |
| Orchestrator | 작업 분해·레인 배정·결과 통합·충돌 해결·최종 승인 |
| Builder | 구현·리팩터·테스트 작성·게이트 통과 |
| Reviewer | git diff 읽기전용 감사(버그/엣지/테스트누락/drift). **코드 미수정** |
| Researcher | 조사·문서 분석·초안(이미지/콘텐츠) 생성 |
| QA | E2E·브라우저·스크린샷 검증 |
역할 수는 공짜가 아니다(토큰·조정 비용). 작은 repo 는 Orchestrator 를 Builder 가 겸하는 것도 합리적이다.

## 3. 생성자 ≠ 리뷰어 (핵심 루프)
만든 에이전트와 검수하는 에이전트를 분리해 **자기확증 편향**을 줄인다:
```
Builder 생성 → 통합 → Reviewer 읽기전용 감사 → findings 를 백로그로 환류 → Builder 수정
```
리뷰어는 코드도 백로그도 직접 고치지 않는다 — findings 만 낸다. 오케스트레이터가 백로그에 반영한다.

## 4. 결정론 vs 비결정론 레인은 게이트가 다르다
- **결정론(코드)**: 게이트 green → 자동 커밋. 안전.
- **비결정론(이미지/콘텐츠/feel)**: 같은 입력도 매번 다르고 "느낌" 판단이라 게이트로 박제 불가
  → **무결성 게이트**(있다/규격 맞다)로만 자동 커밋하고, 미적/서사 품질은 **사람 검수**. 누락 자산 fabricate 금지.

## 5. Reasoning Sandwich
계획=높은 추론, 구현=보통 추론, 검증=높은 추론. 모든 단계에 최고 모델을 쓰면 낭비. 단계별로 모델 티어를 맞춘다.

## 6. 형제 개념 (바이블)
- 상위 하네스: [`HARNESS_ENGINEERING.md`](HARNESS_ENGINEERING.md) · 단일 루프: [`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md)
- 컨텍스트: [`CONTEXT_ENGINEERING.md`](CONTEXT_ENGINEERING.md) · 프롬프트: [`PROMPT_ENGINEERING.md`](PROMPT_ENGINEERING.md)
- 이 repo 적용: [`mythos/AGENTIC.md`](mythos/AGENTIC.md)
