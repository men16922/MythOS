---
name: overnight-report
description: 무인 overnight 루프의 아침 검수 보고. 러너 상태·회차·시작 이후 커밋·게이트 재실측·잔여 [auto] 백로그를 읽고 검증한 뒤, 런별 사람 검수 체크리스트 파일을 생성한다. "overnight 보고", "아침 검수", "overnight-report", "밤새 뭐 했어" 요청 시 사용.
---

# /overnight-report — 무인 루프 아침 검수

무인 overnight 루프(`scripts/overnight/run.sh`, `docs/engineering/mythos/LOOP.md`)가 밤새 한 일을
**읽고 한 번 재검증**한다. 코드/문서를 고치지 않는다(그건 `/checkpoint` 소관). 추측하지 않는다.

> **바이블 ↔ 런별 인스턴스 분리:**
> - 정적 템플릿(반복 프로세스 A~E)은 `docs/test/bible/overnight-review-checklist.md`(바이블).
> - 이 스킬은 그 바이블의 B~E를 **이번 런 사실로 채운** 체크리스트를 `docs/test/history/<MMDD-HHMM>-overnight-review-checklist.md`
>   **파일로 생성**한다(런별 인스턴스). 이 파일들은 gitignore — 재생성 가능한 산출물이라 커밋하지 않는다.

## 절차

1. **종료 사유 확인:**
   - `scripts/overnight/logs/runner.log` 마지막 줄에서 종료 사유 파악(DONE/STOP/MAX_ITER/consec-fail/no-progress).
   - `scripts/overnight/STOP`·`scripts/overnight/DONE` 파일 존재 여부와 그 안에 적힌 사유를 읽는다.

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

7. **런별 사람 검수 체크리스트 파일 생성:**
   - 파일명: `docs/test/history/<MMDD-HHMM>-overnight-review-checklist.md`. 타임스탬프는 **검수 대상 런의 종료 시각**
     (runner.log 마지막 줄 / `DONE`·`STOP` 파일 시각)을 쓰고, 못 구하면 현재 시각. 형식은 `MMDD-HHMM`
     (예 `0614-2333`) — **콜론 금지**(파일시스템 안전). 같은 분에 재실행 시 덮어쓴다.
   - 내용: `docs/test/bible/overnight-review-checklist.md`의 B~E를 **이번 런 사실로 채운 체크박스**.
     정적 바이블을 베끼지 말고 위 1~5에서 모은 사실(커밋 해시·새 `[blocked]`·ahead 수·잔여 seed)을 넣어
     **바로 실행 가능한 줄**로 만든다. 해당 없는 줄은 생략. 최소 골격(있는 것만):
     - `[ ]` **(B) 커밋별 자가 점검** — 각 커밋마다 `git show <hash>`/`git diff`로 실제 diff를 읽고 **두 줄**을 적는다:
       ① **무엇이 바뀌었나** — 건드린 파일·추가/수정된 테스트·동작 변화를 구체적으로(예 "`X.py`에 `FooTest` 3건
       추가, 프로덕션 코드 무변경"). ② **무엇을 확인하면 되나** — 그 변경에 맞는 검증 동작(예 "단언 임계값이
       시나리오 데이터와 일치하는지", "리팩터면 동작 불변인지", "산문 주장이면 실제 파일을 열어 사실 확인 — 테스트
       아닌 문장은 `make check`가 못 잡는다"). 커밋 종류별로 ②가 다르다: **테스트 추가**→무엇을 보장하나·과검출/허위 green
       아닌가, **리팩터/codemod**→동작·공개 API 불변인가, **버그픽스**→근본 원인과 재현·회귀 테스트 동반인가, **docs**→문장이 사실인가.
     - `[ ]` **(C) 새 `[blocked]` triage** — `<항목>`이 잡은 게 실제 콘텐츠/밸런스 버그인가(게임이 깨지는
       것부터: 막다른 루트/도달 불가 엔딩/누락 에셋/못 이기는 전투/죽은 진행도 우선).
     - `[ ]` **(D) push 결정** — 브랜치 `main` ahead K. 결과 좋으면 `git push`(사람 직접 — 러너는 push 금지).
     - `[ ]` **(E) 다음 seed** — 잔여 `[auto]` 또는 새 묶음 seeding(소진 시 즉시 무진행 종료). `make overnight-clean` 후 재가동.
   - 파일 머리에 종료 사유·게이트 결과·대상 HEAD 범위를 1줄 메모로 적는다. 생성 후 경로를 채팅에 echo한다.

## 규칙

- **읽기 + 게이트 1회 실행 + 런별 체크리스트 파일 1개 생성만.** 그 외 코드/문서 수정·커밋·태그·`make overnight-clean` 금지(`/checkpoint`·사람이 담당).
  바이블(`docs/test/bible/`)은 수정하지 않는다 — 런별 인스턴스만 새로 쓴다.
- 파괴/온라인 make 타깃 금지(`infra-*`/`db-*`/`smoke`/`test-db`/`test-e2e*`/`dev-*` 등).
  허용은 `make check`·`make smoke-local`·`make test`뿐.
- 게이트 결과는 **실제 실행한 것만** 보고한다. 돌리지 않았으면 "미검증"이라고 쓴다.
- 추측 금지. `runner.log`/git/`NEXT_PLAN.md`에 없으면 "없음/문서에 없음"이라고 적는다.
