---
name: checkpoint
description: 현재 세션의 작업 결과를 Project MythOS 문서 체계(PROGRESS_LOG/STATUS/AGENT_BRIEF/NEXT_PLAN/COMPLETED_SUMMARY/DECISIONS)의 맞는 위치에 맥락대로 기록한다. "체크포인트", "checkpoint", "진행 상황 저장", "docs에 반영", 작업 묶음 완료 시 사용.
---

# /checkpoint — 작업 결과를 문서에 반영

`docs/DOCS_POLICY.md`의 "작업 완료" 절차와 update sequence를 자동화한다.
의미 있는 **작업 단위가 끝났을 때만** 기록한다(모든 작은 편집을 남기지 않는다).

## 절차

1. **이번 세션 변경을 수집한다:**
   - `git status -sb`, `git diff --stat`, (있으면) 이번 세션 커밋 `git log --oneline`.
   - 무엇을 바꿨고(Changed), 무엇을 검증했고(Verified), 막힌 것(Blockers), 다음(Next)을 정리.
   - 검증 명령은 실제로 돌린 것만 적는다. 안 돌렸으면 "미검증"이라고 명시.

2. **PROGRESS_LOG.md에 최신 항목을 맨 위에 append** (`## YYYY-MM-DD — 한 줄 제목`):
   ```text
   ## YYYY-MM-DD — <제목>
   - Status:
   - Changed:
   - Verified:
   - Blockers:
   - Next:
   ```
   - 날짜는 오늘 날짜(상대 날짜 금지). 기존 동일 날짜 항목이 있으면 통합 여부 판단.
   - 5-15줄로 압축. 상세 diff를 복사하지 말 것.

3. **STATUS.md 갱신** — baseline/active focus/검증 상태/open risks가 바뀌었으면 반영.
   해소된 risk는 제거하고, 새로 생긴 risk는 추가. "최종 갱신" 날짜 갱신.

4. **AGENT_BRIEF.md 갱신** — snapshot이나 active work 우선순위가 바뀐 경우에만.
   60줄 목표 유지. "최종 갱신" 날짜 갱신.

5. **NEXT_PLAN.md 갱신** — 완료한 task는 제거/체크하고, 다음 작업 방향이 바뀌었으면 반영.
   NEXT_PLAN은 "열린 작업"만 담는다(완료 이력 아님).

6. **조건부 갱신:**
   - milestone 완료 → `COMPLETED_SUMMARY.md`에 목적·산출물·검증을 짧게 요약.
   - 되돌리기 어려운 선택(provider/infra/데이터 모델/문서 정책/public workflow) →
     `DECISIONS.md`에 Decision/Reason/Impact 기록.
   - 큰 작업 시작점이었다면 `docs/plans/YYYY-MM-DD-<topic>.md` 스냅샷 고려.

7. **요약 출력** — 어떤 파일을 어떻게 갱신했는지 1줄씩, 그리고 커밋 제안 여부.
   커밋/푸시는 사용자가 명시적으로 요청할 때만 한다.

## 규칙

- Current docs는 짧게 유지한다 — 상세 변경 이력을 STATUS/AGENT_BRIEF에 복사하지 않는다.
  상세는 PROGRESS_LOG, 그리고 길어지면 archive로.
- 라인 예산: AGENT_BRIEF ≤60, STATUS/NEXT_PLAN ≤120, PROGRESS_LOG ≤120.
  PROGRESS_LOG가 예산을 넘으면 이 skill로 기록만 하고, 정리는 `/tidy-docs`에 위임(사용자에게 제안).
- 한국어로 작성하되 식별자/명령/경로는 원문 그대로.
- 무엇을 기록할지 애매하면 사용자에게 "이번 작업 단위 범위"를 한 번 확인한다.
