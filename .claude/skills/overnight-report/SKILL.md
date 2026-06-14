---
name: overnight-report
description: 무인 overnight 루프의 아침 검수 보고. 러너 상태·회차·시작 이후 커밋·게이트 재실측·잔여 [auto] 백로그를 읽고 검증만 한다. "overnight 보고", "아침 검수", "overnight-report", "밤새 뭐 했어" 요청 시 사용.
---

# /overnight-report — 무인 루프 아침 검수

무인 overnight 루프(`bin/overnight/run.sh`, `docs/engineering/mythos/LOOP.md`)가 밤새 한 일을
**읽고 한 번 재검증**한다. 코드/문서를 고치지 않는다(그건 `/checkpoint` 소관). 추측하지 않는다.

## 절차

1. **종료 사유 확인:**
   - `bin/overnight/logs/runner.log` 마지막 줄에서 종료 사유 파악(DONE/STOP/MAX_ITER/consec-fail/no-progress).
   - `bin/overnight/STOP`·`bin/overnight/DONE` 파일 존재 여부와 그 안에 적힌 사유를 읽는다.

2. **회차/커밋 집계:**
   - `runner.log`에서 실행된 회차 수와 시작 시점 HEAD(`HEAD_BEFORE` 로깅)를 찾는다.
   - `git log --oneline <start>..HEAD`로 루프가 만든 커밋을 나열한다. **현재 브랜치를 명시**(예:
     `feat/poc-ux-visual-combat-batch`). `[recovered]` 접두 커밋은 따로 강조(중단된 회차 복구분).

3. **작업 트리:**
   - `git status -sb`로 미커밋 잔여물 확인. 잔여물이 있으면 **red 잔여물 가능성**으로 경고
     (PROMPT.md 2단계: red 잔여물은 사람 검수 필요 → STOP 트리거).

4. **게이트 재실측:**
   - `$GATE_CMD`(기본 `make check`; 런타임-flow 야간은 `make smoke-local`) 1회 직접 실행해
     **현재 HEAD가 실제로 green인지** 독립 확인(루프의 게이트 결과를 신뢰하지 않고 재검증).
   - 실패 시 어느 단계(ruff/eslint/mypy/tsc/test)에서 깨졌는지 보고. 미실행이면 "미검증" 명시.

5. **잔여 백로그:**
   - `docs/NEXT_PLAN.md`에서 남은 `[auto]`/`[blocked]` 항목 수와 목록, 이번 밤 새로 자동
     `[blocked]` 마킹된 항목을 집계한다.

6. **요약 출력(한국어 5-10줄):**
   - 종료 사유 · 만든 커밋 N개(해시·브랜치) · 게이트 green/red(어느 단계) ·
     잔여 `[auto]` M개 · **사람 검수 필요 항목**(red 잔여물·새 `[blocked]`·STOP 사유).

## 규칙

- **읽기 + 게이트 1회 실행만.** 코드/문서 수정·커밋·태그 변경 금지(`/checkpoint`가 담당).
- 파괴/온라인 make 타깃 금지(`infra-*`/`db-*`/`smoke`/`test-db`/`test-e2e*`/`dev-*` 등).
  허용은 `make check`·`make smoke-local`·`make test`뿐.
- 게이트 결과는 **실제 실행한 것만** 보고한다. 돌리지 않았으면 "미검증"이라고 쓴다.
- 추측 금지. `runner.log`/git/`NEXT_PLAN.md`에 없으면 "없음/문서에 없음"이라고 적는다.
