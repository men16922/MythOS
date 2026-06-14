# LOOP_ENGINEERING — 자율 무인 루프 운영 (바이블)

> **범용 개념 문서(bible).** 이 repo 적용(러너·env·make 타깃)은 → [`mythos/LOOP.md`](mythos/LOOP.md).

## 정의
프롬프트 1개를 헤드리스로 반복 호출해, 매 회차가 **작은 컨텍스트로 상태를 복원 → 작업 1개를 구현·게이트
통과 → 기록 → 로컬 커밋**하는 자율 실행 루프. 한 회차 = 하나의 원자적 작업 단위. 회차마다 커밋되므로
**언제 멈춰도 손실은 최대 1회차**.

## 1. 핵심 원리
| 원리 | 이유 |
| --- | --- |
| **회차당 fresh context** | 매 회차 새 프로세스 → 컨텍스트 비대/요약 문제 없음. Read Path 만 다시 읽어 복원. |
| **회차 = 작업 1개 + 즉시 커밋** | 한도/크래시가 언제 닥쳐도 미커밋 손실은 1회차뿐. 다음 회차가 이어받음. |
| **offline 게이트 = 커밋 게이트** | 결정론 게이트(lint+type+build+test) green 못 하면 커밋 안 함 → 깨진 코드가 쌓이지 않음. 네트워크 불필요. |
| **상태는 파일에** | 백로그·이력·git history. 메모리가 아니라 디스크가 source of truth. |
| **최소 권한 무인 실행** | allow/deny 경계로 push·네트워크·파괴 동작 차단(`HARNESS_ENGINEERING §4`). |

## 2. 루프 1회 흐름 (loop-once)
```
상태 복원 → 잔여물 복구(이전 회차 중단분) → 백로그에서 작업 1개 선택
  → 구현 + 게이트 통과까지 → 기록 → 로컬 커밋 → (pause) → 반복
```
- **잔여물 복구**: 시작 시 dirty tree = 이전 회차 중단 잔여물. 게이트 green 이면 복구 커밋, red 면 무수정 + 중단 신호.
- **결과 분류**: 회차 결과를 success/limit/failure 로 구조화 판정(자유 텍스트 grep 금지 — false 오판 방지).
  limit→대기 후 재시도, failure→연속 실패 카운트, success→커밋 생겼는지(HEAD diff) 확인해 무진행 카운트.

## 3. 백로그 태깅 — 무인 대상 표시
상태 박스와 **별개 축**으로 자동화 태그를 단다:
- `auto` = 로컬·결정론·offline 검증 가능. **완료 기준 1줄 필수**(scope 폭주 방지).
- `manual` = 사람 체감/콘텐츠/밸런스/feel 판단 → 무인 검증 불가.
- `blocked` = 실패 누적 또는 선행 조건 미충족.
- 무태그 = 무인 대상 아님(안전 기본값). 러너는 `auto*` 만 소비, 임의 승격 금지.
> **얇은 백로그가 정상**: 창의·체감 작업이 많은 repo 일수록 `auto` 백로그는 금방 소진된다. 무진행 종료가
> 잦은 게 정상이며, 효율을 내려면 실행 전 `auto` 항목을 **seeding**(회귀 백필·codemod·lint/type 부채·stale-doc 정리)한다.

## 4. 종료 조건 (백스톱)
백로그 소진(DONE) · 수동/red 잔여물(STOP) · 최대 회차 · 연속 실패 N · 무진행 N. **완료 시 멈춘다**(추가 토큰 0).

## 5. 적용 한계
이 루프는 **hygiene/regression/refactor/codemod/deterministic-bugfix** 에 적합하다. 창의·체감·콘텐츠 저작에는
쓰지 않는다 — 무인 게이트가 검증 못 한다(그건 `manual`, 사람 QA).

## 6. 형제 개념 (바이블)
- 상위 하네스: [`HARNESS_ENGINEERING.md`](HARNESS_ENGINEERING.md) · 병렬 다중엔진: [`AGENTIC_ENGINEERING.md`](AGENTIC_ENGINEERING.md)
- 컨텍스트 복원: [`CONTEXT_ENGINEERING.md`](CONTEXT_ENGINEERING.md) · 회차 프롬프트: [`PROMPT_ENGINEERING.md`](PROMPT_ENGINEERING.md)
- 이 repo 적용: [`mythos/LOOP.md`](mythos/LOOP.md)
