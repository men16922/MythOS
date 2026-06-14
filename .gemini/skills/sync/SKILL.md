---
name: sync
description: Project MythOS의 current docs를 정해진 read path대로 읽어 현재 작업 컨텍스트(상태·다음 작업·최근 증분·가드레일)를 복원한다. 세션 시작, 작업 재개, "지금 상황 파악", "sync", "컨텍스트 동기화" 요청 시 사용.
---

# /sync — 문서 기반 컨텍스트 복원

`docs/DOCS_POLICY.md`의 Context Budget과 `docs/README.md`의 Read Path를 따라
**최소 토큰으로** 현재 작업 문맥을 복원한다. `docs/` 전체를 bulk-read 하지 않는다.

## 절차

1. **진입점 4종을 읽는다 (이 순서, 병렬 Read 가능):**
   1. `docs/AGENT_BRIEF.md` — 1분 압축 문맥, snapshot, active work, guardrails.
   2. `docs/STATUS.md` — 현재 구현 상태, 검증 baseline, active focus, open risks.
   3. `docs/NEXT_PLAN.md` — 지금부터 진행할 열린 작업(완료 항목 아님).
   4. `docs/PROGRESS_LOG.md` — 최신 3-5개 증분 항목만(상단). 긴 과거 로그는 무시.

2. **작업 트리 신호를 확인한다:**
   - `git status -sb`와 `git log --oneline -8`로 현재 브랜치/미커밋 변경/최근 커밋 파악.
   - 미커밋 변경이 진행 중 작업이면 어떤 task에 해당하는지 NEXT_PLAN과 대조.

3. **on-demand 문서는 필요할 때만 연다 (지금 자동으로 열지 말 것):**
   - 구조 변경 전 → `docs/DESIGN.md`
   - 게임 규칙 변경 전 → `docs/GAMEPLAY.md`
   - API 계약 작업 → `docs/API.md`
   - 시나리오/콘텐츠 변경 → `docs/scenarios/*`, `resources/<scenario>/story_bible/*`
   - 활성 작업 상세 → `docs/plans/YYYY-MM-DD-*.md` (단 STATUS/NEXT_PLAN이 더 권위 있음)
   - 결정 근거 → `docs/DECISIONS.md`, 완료 범위 → `docs/COMPLETED_SUMMARY.md`

4. **요약을 출력한다 (5-10줄, 한국어):**
   - **현재 baseline**: 무엇이 동작하는가 (AGENT_BRIEF snapshot 기반).
   - **Active focus**: 지금 최우선 작업 1-2개 (NEXT_PLAN 권위).
   - **최근 증분**: PROGRESS_LOG 최상단 1-2건.
   - **작업 트리**: 브랜치 + 미커밋 변경 요지.
   - **다음 할 일 후보**: 바로 착수 가능한 항목.
   - **열린 위험/blocker**: STATUS의 open risks 중 관련 항목.

## 규칙

- 권위 순서: `NEXT_PLAN.md`(다음 작업) > `plans/`(historical snapshot, 낡을 수 있음).
- 진입점 문서끼리 모순되면 그 사실을 요약에 명시한다.
- 추측으로 채우지 말 것. 문서에 없으면 "문서에 없음"이라고 적는다.
- 코드를 읽어 구조를 다시 도출하지 말 것 — docs가 이미 압축해 둔 것을 신뢰한다.
