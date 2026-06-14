---
name: tidy-docs
description: Project MythOS docs를 context budget 규칙대로 정리·통합·압축한다. 길어진 PROGRESS_LOG를 월별 archive로 분리, 완료 체크리스트를 COMPLETED_SUMMARY로 압축, 중복/낡은 md 통합·은퇴, current docs를 라인 예산 안으로 다이어트한다. "문서 정리", "tidy-docs", "컨텍스트 최적화", "md 통합" 요청 시 사용.
---

# /tidy-docs — 문서 컨텍스트 최적화

`docs/DOCS_POLICY.md`의 Context Budget · Retiring/Deleting 절차를 자동화한다.
목표: **에이전트 시작 컨텍스트를 작게** 유지하면서 dated record와 결정 이력은 잃지 않는다.

## 안전 원칙 (먼저 읽을 것)

- **삭제는 마지막 수단.** 바로 지우지 말고 archive로 이관하거나 요약 후 링크를 남긴다.
- 내가 만들지 않은 문서를 지우거나 덮어쓰기 전, 실제 내용을 열어 설명과 일치하는지 확인한다.
- 파괴적 작업(파일 삭제, 대량 이동) 전에는 **무엇을 어디로 옮길지 계획을 먼저 제시**하고
  사용자 승인을 받는다. 이관 후에는 참조가 깨지지 않았는지 검증한다.

## 절차

1. **진단** — 라인 예산 초과와 중복을 측정한다:
   - `wc -l docs/AGENT_BRIEF.md docs/STATUS.md docs/NEXT_PLAN.md docs/PROGRESS_LOG.md`
   - 예산: AGENT_BRIEF ≤60, STATUS ≤120, NEXT_PLAN ≤120, PROGRESS_LOG ≤120, DESIGN은 압축 요약 유지.
   - 어떤 문서가 초과인지, 어떤 내용이 중복/낡음인지 목록화해 사용자에게 보고.

2. **PROGRESS_LOG 분리** — 120줄 초과 시:
   - 최신 3-5개 항목만 `docs/PROGRESS_LOG.md`에 남긴다.
   - 나머지는 `bin/docs/archive/progress-YYYY-MM.md`로 **이동(append)**. 같은 월 archive가 있으면 합친다.
   - PROGRESS_LOG 상단에 archive 링크 안내가 있는지 확인/갱신.

3. **완료 체크리스트 압축** — current docs(STATUS/NEXT_PLAN/dated plan)에 완료된 task checklist가
   오래 남아 있으면 → `COMPLETED_SUMMARY.md`에 목적·산출물·검증으로 압축하고 current docs에선 링크만 남긴다.

4. **dated plan 정리** — `docs/plans/`의 완료된 plan은 삭제하지 말고:
   - 핵심을 `COMPLETED_SUMMARY.md`에 요약했는지 확인.
   - 완료 plan은 `bin/docs/plans/`(또는 `bin/docs/archive/`)로 이관, `docs/README.md`의 on-demand 목록 갱신.

5. **중복/낡은 md 통합·은퇴** — `docs/README.md` 인덱스와 실제 파일을 대조:
   - 같은 내용이 두 current doc에 있으면 권위 문서 하나로 통합하고 다른 쪽은 링크.
   - 은퇴 절차: ①핵심을 COMPLETED_SUMMARY/DECISIONS/DESIGN/STATUS 중 맞는 곳에 요약 →
     ②`docs/README.md`에서 상태를 `Retired`/`Archive`로 표시 → ③`rg "<문서명>"`으로 참조 잔존 확인 →
     ④보존 가치 있으면 `bin/docs/archive/`로 이동 → ⑤중복+요약완료+무참조면 삭제.

6. **DESIGN.md 다이어트** — 상세 설계 원문이 끼어들었으면 압축 요약만 남기고 원문은 `bin/docs/archive/`로.

7. **인덱스/링크 정합성 검증** — 작업 후:
   - `rg -l "<옮긴 파일명>" docs/ src/ README.md`로 깨진 참조 확인.
   - `docs/README.md`의 current/on-demand 목록과 실제 파일이 일치하는지 확인.
   - 옮긴/지운 문서의 "최종 갱신" 날짜와 README 갱신 날짜 반영.

8. **요약 출력** — 이동/압축/은퇴/삭제한 파일을 표로, before→after 라인 수, 남은 초과 항목.

## 규칙

- 보존: 설계 근거, 의사결정 맥락, 과거 milestone 상세 기록.
- 삭제 가능: 같은 내용이 다른 current doc에 요약됨 + 앞으로 직접 업데이트 안 함 + 코드/README 무참조.
- Current docs에는 "현재 판단에 필요한 압축 상태"만. 상세 이력은 복사하지 않고 archive 링크로.
- 이 skill은 정리만 한다. 새 작업 내용 기록은 `/checkpoint`, 컨텍스트 복원은 `/sync` 소관.
