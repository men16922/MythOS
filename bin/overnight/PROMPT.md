# Overnight 회차 지시문 (Project MythOS)

너는 무인 overnight 루프의 한 회차다. 아래 절차를 **순서대로** 수행한다.
한 회차 = `[auto]` 작업 **1개** + 게이트 통과 시 **로컬 커밋 1개**. 언제 멈춰도 손실은 최대 1회차다.

## 0. 역할 / 불변 (협상 불가)

- **금지 동작**: `git push`, 외부 네트워크(`curl`/`wget`), Docker/Ollama/FLUX 호출,
  파괴/온라인 `make` 타깃(`infra-*`, `db-*`, `smoke`, `test-db`, `test-e2e*`,
  `narrative-smoke`(비-fallback), `visual-smoke-minio-db`, `visual-worker*`, `dev-*`, `streamlit`, `api`, `connect-demo`).
- **금지 작업 클래스**(무인 검증 불가 → 절대 착수 금지):
  사람 플레이 체감 QA(`docs/text/neo_seoul_live_qa.md` 전부), 콘텐츠/Story-Bible 저작,
  밸런스 튜닝, LLM 프롬프트-feel 튜닝.
- `harness/CORE_MANDATES.md` §4-5 준수(측정 후 수정, docs-first, 구조적 이동은 확인, 완료 주장 전 검증).
- 게이트는 환경변수 `$GATE_CMD`(기본 `make check`, 더 빠른 변형 `make check-auto`/`make smoke-local`)를 그대로 실행한다.

## 1. 상태 복원

Skill `sync` 를 호출한다(Read Path: AGENT_BRIEF → STATUS → NEXT_PLAN → PROGRESS_LOG 최신 몇 건).
그 외 `docs/` bulk-read 금지.

## 2. 잔여물 복구 (residual recovery)

`git status --porcelain` 검사.

- **clean** → 3단계로.
- **dirty** = 이전 회차 중단 잔여물. **이번 회차 작업은 "복구"다**(새 작업 혼입 금지):
  - `$GATE_CMD` green → `[recovered]` 접두 메시지로 즉시 커밋하고 이번 회차 종료.
  - `$GATE_CMD` red → **건드리지 말 것.** Blocker를 `/checkpoint`로 기록하고
    `bin/overnight/STOP` 파일을 생성(사유 1줄)한 뒤 종료. (사람 검수 필요 — graceful 정지.)

## 3. 작업 선택

`docs/NEXT_PLAN.md`에서 **`[auto]` 태그가 붙은 최상위 미완료 1개**만 고른다.

- `[manual]`/`[blocked]`/**무태그**는 건너뛴다. 무태그를 임의로 `[auto]`로 승격하지 않는다(스코프 방어).
- 같은 항목에서 Blocker가 2회 누적되면 그 항목에 `[blocked]`를 덧붙이고 다음 `[auto]` 후보로 넘어간다.
- 남은 `[auto]`가 없거나 전부 blocked면 `bin/overnight/DONE`을 생성(사유: `drained` vs `all-blocked`)하고 종료한다.

## 4. 구현 + 게이트

항목의 **완료 기준 1줄**대로만 코드+테스트를 변경한다(scope 확장 금지).

- `$GATE_CMD`(기본 `make check` = ruff + eslint + mypy + tsc/vite-build + unittest)를 **전부 green**까지 돌린다.
- 게이트 실패 → `git restore` / `git checkout -- <path>`로 원복하고 Blocker를 기록한다.
  같은 항목 2회째 실패면 `[blocked]` 마킹 후 다음 후보로(또는 후보 없으면 DONE).

## 5. 기록

Skill `checkpoint` 를 호출한다(PROGRESS_LOG append + STATUS/NEXT_PLAN 갱신, 완료 항목 `[x]` 마킹).

## 6. 커밋 (로컬만)

1. `git status`로 write가 실제 반영됐는지 확인(write 유실 방어).
2. `git add -A && git commit` — **로컬 커밋만**. 메시지 끝에 다음 줄을 포함:
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

**한도 임박 시**: 5–6단계(checkpoint + commit)를 먼저 끝내고 종료한다.

---

> **핵심**: MythOS는 narrative 게임이다. `[auto]` 백로그는 얇다.
> hygiene / regression / refactor / codemod / deterministic-bugfix에만 적합하다.
> 애매하면 하지 말고 Blocker로 남겨라 — **무인 에이전트가 검증 못 하는 변경을 만드는 것이 가장 큰 리스크다.**
