# Project MythOS Docs

최종 갱신: 2026-06-14

이 디렉터리는 현재 작업 문맥을 작게 유지하기 위해 current docs와 archive를 분리한다.
에이전트는 `docs/` 전체를 읽지 말고 아래 순서만 따른다.

## Read Path

1. `AGENT_BRIEF.md` — 1분 압축 문맥.
2. `STATUS.md` — 현재 baseline, active focus, risks.
3. `NEXT_PLAN.md` — 열린 작업만 있는 rolling plan.
4. `PROGRESS_LOG.md` — 최신 증분 요약. 긴 로그는 archive.
5. 필요할 때만 `DESIGN.md`, `GAMEPLAY.md`, scenario/story bible, dated plans.

## Current Docs

| File | Role |
| --- | --- |
| `AGENT_BRIEF.md` | 에이전트 진입점 |
| `STATUS.md` | 현재 상태와 검증 baseline |
| `NEXT_PLAN.md` | 다음 구현 우선순위 |
| `PROGRESS_LOG.md` | 최신 짧은 작업 로그 |
| `DESIGN.md` | 현재 아키텍처 압축 요약 |
| `GAMEPLAY.md` | 게임플레이/TRPG 설계 |
| `API.md` | FastAPI REST/WS 계약 |
| `COMPLETED_SUMMARY.md` | 완료 milestone 압축 기록 |
| `DECISIONS.md` | 되돌리기 어려운 결정 |
| `DOCS_POLICY.md` | 문서 운영 규칙 |
| `IMAGE_POLICY.md` | 이미지 생성 규칙·로컬 파이프라인 |
| `REFERENCES.md` | 디자인 레퍼런스 게임과 적용 포인트 |

## On-Demand Docs

- `docs/engineering/`: **에이전트 운영 하네스 5개 개념**(HARNESS/LOOP/AGENTIC/CONTEXT/PROMPT). 무인 루프·멀티에이전트·컨텍스트·프롬프트 작업 시 `docs/engineering/README.md`부터. (`LOOP_ENGINEERING.md`·`AGENTIC_ENGINEERING.md`는 옛 `docs/LOOP_ENGINEERING.md`·`docs/MULTI_AGENT.md`에서 이동.)
- `docs/test/`: **사람이 직접 수행하는 체크리스트**(에이전트 기본 컨텍스트 아님 — 사용자가 연다).
  - `neo_seoul_live_qa.md`: Neo-Seoul 사람 플레이 QA 체크리스트.
  - `bible/overnight-review-checklist.md`: overnight 루프 종료 후 사람 검수 체크리스트 **바이블(정적 템플릿)**.
  - `<MMDD-HHMM>-overnight-review-checklist.md`: `/overnight-report`가 런마다 생성하는 **런별 인스턴스**(바이블 B~E를 그 런 사실로 채움). gitignore — 재생성 가능한 산출물.
- `docs/plans/`: 활성 작업의 날짜별 설계 스냅샷(현재 neo-seoul playability/live-feedback). 완료된 plan은 `bin/docs/plans/`로 이관. 최신 상태가 아닐 수 있으므로 `NEXT_PLAN.md`를 우선한다.
- `docs/scenarios/`: 시나리오 기획 문서. 콘텐츠 변경 시에만 읽는다.
- `bin/docs/archive/`: 장문 설계/로그/과거 기획 보존소. 기본 컨텍스트에 넣지 않는다.
- `bin/docs/feedback/`: 과거 피드백 원문.

## Update Rules

- Current docs에는 현재 필요한 결정/상태만 남긴다.
- 완료 체크리스트는 `COMPLETED_SUMMARY.md`로 압축한다.
- `PROGRESS_LOG.md`는 최신 3-5개 항목만 유지하고 월별 archive로 이동한다.
- `DESIGN.md`는 상세 설계서가 아니라 현재 구조 요약이다. 긴 원문은 archive에 둔다.
- `plans/` 파일은 historical snapshot이므로 상태가 낡을 수 있다. 구현 전 `STATUS.md`와 `NEXT_PLAN.md`로 확인한다.

## Status Tags

- `[ ]` Not started
- `[/]` In progress
- `[x]` Done
- `[!]` Blocked
- `[~]` Deferred
