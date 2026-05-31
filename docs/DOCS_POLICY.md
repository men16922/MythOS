# Documentation Policy

최종 갱신: 2026-05-31

이 문서는 Project MythOS 문서를 계속 업데이트하기 위한 운영 규칙이다. 목표는 현재 상태를 빠르게 파악하면서도, 날짜별 계획과 완료 이력을 잃지 않는 것이다. 토큰 사용을 줄이기 위해 에이전트용 압축 진입점을 별도로 유지한다.

## Core Principle

문서는 세 종류로 나눈다.

1. **Current docs**: 지금 봐야 하는 문서.
2. **Dated records**: 특정 날짜의 계획, 진행, 검증 기록.
3. **Archive/retired docs**: 더 이상 직접 업데이트하지 않는 과거 문서.

## Current Docs

항상 최신 상태로 유지한다.

- `STATUS.md`: 현재 구현 상태, active focus, open risks.
- `AGENT_BRIEF.md`: 에이전트가 먼저 읽는 압축 문맥, 현재 초점, 읽기 순서.
- `NEXT_PLAN.md`: 지금부터 진행할 rolling plan.
- `README.md`: 실행/사용 안내와 주요 docs index.
- `docs/README.md`: docs 전체 navigation.

규칙:

- 작업 묶음이 끝나면 `AGENT_BRIEF.md`와 `STATUS.md`를 갱신한다.
- 다음 작업 방향이 바뀌면 `NEXT_PLAN.md`를 갱신한다.
- README에는 상세 계획을 길게 넣지 않고 링크만 둔다.

## Dated Plans

작업할 때마다 새 계획이 생길 수 있으므로 날짜별 계획 스냅샷을 남긴다.

위치:

- `docs/plans/YYYY-MM-DD-<topic>.md`

예:

- `docs/plans/2026-05-30-post-mvp.md`
- `docs/plans/2026-06-01-streamlit-polish.md`

규칙:

- 큰 작업을 시작하기 전, 그 시점의 계획을 dated plan으로 남긴다.
- `NEXT_PLAN.md`는 최신 rolling plan으로 유지한다.
- 완료된 dated plan은 파일을 지우지 않고 완료 여부를 체크하거나 `COMPLETED_SUMMARY.md`에 요약한다.
- 계획이 크게 바뀌면 기존 dated plan을 덮어쓰기보다 새 dated plan을 만든다.

## Incremental Progress

증분 작업은 `PROGRESS_LOG.md`에 최신 항목을 위로 append한다. current log는 짧게 유지하고, 긴 상세 이력은 월별 archive로 옮긴다.

항목 형식:

```text
YYYY-MM-DD
- Status:
- Changed:
- Verified:
- Blockers:
- Next:
```

규칙:

- 모든 작은 편집을 기록하지 않는다.
- 사용자에게 의미 있는 작업 단위가 끝났을 때 기록한다.
- 검증 명령이나 브라우저 확인이 있으면 `Verified`에 남긴다.
- `PROGRESS_LOG.md`가 길어지면 월별 archive로 분리하고 current log에는 archive 링크와 최신 항목만 남긴다.

월별 archive 예:

- `docs/archive/progress-2026-05.md`
- `docs/archive/progress-2026-06.md`

## Completed Summary

완료된 milestone은 `COMPLETED_SUMMARY.md`에 짧게 요약한다.

규칙:

- 세부 체크리스트는 완료 후 계속 유지할 필요가 없으면 summary로 압축한다.
- 완료된 milestone의 목적, 산출물, 검증만 남긴다.
- 새 작업자가 5분 안에 완료 범위를 이해할 수 있게 유지한다.

## Decisions

되돌리기 어려운 선택은 `DECISIONS.md`에 기록한다.

기록 대상:

- provider 선택
- infra 변경
- 데이터 모델 변경
- 문서 운영 정책
- public workflow 변경

기록 형식:

- Decision
- Reason
- Impact

## Retiring Or Deleting Docs

더 이상 필요 없는 문서는 바로 삭제하지 않는다.

절차:

1. 문서의 핵심 내용을 `COMPLETED_SUMMARY.md`, `DECISIONS.md`, `DESIGN.md`, 또는 `STATUS.md` 중 맞는 곳에 요약한다.
2. `docs/README.md`에서 해당 문서의 상태를 `Retired` 또는 `Archive`로 표시한다.
3. 링크가 남아 있는지 `rg "문서명"`으로 확인한다.
4. 보존 가치가 있으면 `docs/archive/`로 이동한다.
5. 중복이고 요약이 끝났으며 참조가 없으면 삭제한다.

삭제 기준:

- 같은 내용이 다른 current doc에 요약되어 있다.
- 앞으로 직접 업데이트하지 않는다.
- 코드나 README에서 참조하지 않는다.
- 원문 보존 가치보다 유지 비용이 크다.

보존 기준:

- 설계 근거가 남아 있다.
- 의사결정 맥락이 중요하다.
- 과거 milestone 상세 기록으로 유용하다.

## Recommended Update Sequence

작업 시작:

1. `AGENT_BRIEF.md` 확인.
2. `STATUS.md` 확인.
3. `NEXT_PLAN.md` 확인.
4. 필요하면 `docs/plans/YYYY-MM-DD-<topic>.md` 작성.

작업 완료:

1. `PROGRESS_LOG.md`에 짧은 증분 로그 추가.
2. `AGENT_BRIEF.md`와 `STATUS.md` 갱신.
3. milestone 완료 시 `COMPLETED_SUMMARY.md` 갱신.
4. 결정이 생겼으면 `DECISIONS.md` 갱신.
5. 오래된 계획/문서가 중복되면 요약 후 archive/delete 여부 판단.
