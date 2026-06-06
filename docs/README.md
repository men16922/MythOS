# Project MythOS Docs

이 디렉터리는 기획, 설계, 진행 상태, 증분 작업 로그를 분리해서 관리한다. AI 에이전트는 먼저 `AGENT_BRIEF.md`를 읽고, 필요한 상세 문서만 추가로 연다. `docs/` 전체를 한 번에 읽는 방식은 피한다.

## Context-First Read Path

1. 기본 진입: `AGENT_BRIEF.md` -> `STATUS.md` -> `NEXT_PLAN.md`.
2. 최근 변경 확인이 필요할 때만 `PROGRESS_LOG.md` 최상단 최신 항목을 읽는다.
3. 구조 변경 전에는 `DESIGN.md`, 게임 규칙 변경 전에는 `GAMEPLAY.md`, 콘텐츠 변경 전에는 해당 `scenarios/` 또는 `resources/*/story_bible/`만 연다.
4. `plans/`, `archive/`, `feedback/`는 historical/on-demand 문서다. 현재 작업의 근거가 필요할 때만 파일명을 지정해서 연다.

## Document Map

| Document | Role | Update Timing |
| --- | --- | --- |
| `AGENT_BRIEF.md` | 에이전트용 압축 문맥, 현재 초점, 읽기 순서 | 작업 묶음 완료 후 |
| `PROJECT_OVERVIEW.md` | 현재 게임 프로젝트에 대한 핵심 요약 및 기획/기술 소개 | 메인 아키텍처나 핵심 메커니즘이 크게 바뀔 때 |
| `DESIGN.md` | 시스템 설계, 아키텍처, 데이터 모델, 주요 설계 원칙 | 구조나 경계가 바뀔 때 |
| `GAMEPLAY.md` | 게임플레이/TRPG 기획, 스탯/자율성 시스템 및 튜토리얼 설계 | 게임 규칙/플레이어 경험이 바뀔 때 |
| `DOCS_POLICY.md` | 문서 운영, 날짜별 계획, archive/delete 정책 | 문서 관리 방식이 바뀔 때 |
| `ADULT_VISUAL_POLICY.md` | 성인 분위기 캐릭터 이미지의 허용/금지 경계와 생성 도구 정책 | 비주얼 정책이나 캐릭터 이미지 제작 기준이 바뀔 때 |
| `STATUS.md` | 현재 구현 상태와 바로 다음 초점 | 작업 묶음 완료 후 |
| `NEXT_PLAN.md` | 앞으로 할 phase/task 계획 | 새 phase 시작 전, 우선순위 변경 시 |
| `PROGRESS_LOG.md` | 최신 증분 작업 로그 | 의미 있는 작업 단위 완료 시 |
| `COMPLETED_SUMMARY.md` | 완료된 milestone 요약 | milestone 완료 시 |
| `DECISIONS.md` | 결정 기록과 근거 | 되돌리기 어려운 선택을 할 때 |
| `archive/DRAFT.md` | 세계관 및 제품 비전 기획 초안 | 과거 기획 참조용 (Retired) |
| `archive/DESIGN_SYSTEM_STATS.md` | 구 스탯/자율성 상세 설계서 | `GAMEPLAY.md` 통합에 따른 Archive (Retired) |
| `archive/ARCH_MAP.md` | 구 아키텍처 맵 | `PROJECT_OVERVIEW.md` 통합에 따른 Archive (Retired) |
| `archive/IMPLEMENTATION_M0_M10.md` | M0-M10 상세 구현 추적 archive | 과거 상세 기록 조회용 |
| `archive/progress-YYYY-MM.md` | 월별 상세 진행 로그 archive | `PROGRESS_LOG.md`가 길어질 때 |
| `scenarios/NN-<topic>.md` | 게임플레이 시나리오 바이블(세계/캐릭터/세션) | 새 플레이 시나리오 작성 시 |
| `plans/YYYY-MM-DD-<topic>.md` | 날짜별 계획 스냅샷 | 큰 작업 시작 전 |
| `../harness/` | AI 에이전트 연동용 루트 하네스 설정 폴더 (`CONTEXT_BRIDGE.md`, `CORE_MANDATES.md`) | 에이전트 작업 간 맥락 전달 및 코어 제약 준수용 |
| `archive/` | 요약 완료된 과거 문서/월별 로그 | current doc에서 제외할 때 |

## Update Workflow

1. 작업 시작 전 `AGENT_BRIEF.md`, `STATUS.md`, `NEXT_PLAN.md`를 확인한다.
2. 큰 작업이면 `plans/YYYY-MM-DD-<topic>.md`로 날짜별 계획 스냅샷을 만든다.
3. 새 작업이 기존 계획에 없으면 `NEXT_PLAN.md`에 task를 먼저 추가한다.
4. 작업 중 세부 증분은 코드와 테스트에 집중하고, 문서는 완료 시점에 정리한다.
5. 작업 완료 후 `PROGRESS_LOG.md`에 Changed/Verified/Next를 짧게 남긴다.
6. milestone이 닫히면 `COMPLETED_SUMMARY.md`에 요약을 추가하고 `STATUS.md`를 갱신한다.
7. 아키텍처, provider, infra, 데이터 모델 선택이 바뀌면 `DECISIONS.md`에 기록한다.
8. 필요 없어진 문서는 `DOCS_POLICY.md`의 retire/delete 절차에 따라 요약 후 archive 또는 삭제한다.

## Status Tags

- `[ ]` Not started
- `[/]` In progress
- `[x]` Done
- `[!]` Blocked
- `[~]` Deferred

## Writing Rules

- `AGENT_BRIEF.md`는 1분 안에 읽히는 압축 문맥으로 유지한다.
- `STATUS.md`는 짧게 유지한다. 현재 상태, 검증 상태, 다음 초점만 적는다.
- `PROGRESS_LOG.md`는 최신 로그만 유지한다. 길어지면 `archive/progress-YYYY-MM.md`로 분리한다.
- `NEXT_PLAN.md`는 살아있는 계획이다. 끝난 항목은 체크하고, 장기 보관은 `COMPLETED_SUMMARY.md`로 옮긴다.
- `archive/IMPLEMENTATION_M0_M10.md`는 M0-M10 상세 archive로 유지하고, 새 작업의 주 관리 문서로 쓰지 않는다.
- 날짜별 계획은 덮어쓰지 않고 `plans/`에 새 파일로 남긴다.
- current docs가 길어지면 새 상세 문서를 만들기 전에 먼저 `COMPLETED_SUMMARY.md` 또는 월별 archive로 압축할 수 있는지 확인한다.
