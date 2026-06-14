---
name: overnight-seed
description: 무인 overnight 루프를 켜기 전에 돌릴 [auto] seed 분량을 판단하고 백필한다. 레인별 actionable 백로그 집계 + 후보 메뉴 live survey + wall-clock 추산 + 부족분 고지, 승인 시 NEXT_PLAN에 기록. "overnight seed", "밤샘 준비", "seed 판단", "백로그 충전" 요청 시 사용.
---

# /overnight-seed — 무인 루프 사전 시드 판단·백필

overnight 무인 루프(`scripts/overnight/run.sh`, `docs/engineering/mythos/LOOP.md`)를 켜기 전에,
**밤새 돌릴 `[auto]` seed가 얼마나 있는지 판단하고 부족분을 채운다**. 아침 검수는 `/overnight-report` 소관.

> **먼저 바로잡을 현실(매번 사용자에게 고지):** 이 루프는 "N시간 연속 가동"하는 물건이 아니다.
> 한 회차 = `[auto]` 1개 = 1커밋, **실측 회차당 ~3.5분**(`make check`, 30s pause 포함). 백로그가
> 드레인되면 시간을 채우려 돌지 않고 **멈춘다**(`MAX_NO_PROGRESS`→`DONE`). 즉 목표 시간을 채우려면
> 그만큼 seed가 있어야 한다 — 시간이 아니라 **seed 공급이 binding constraint**다.

## 절차

1. **목표 창·레인 확인:**
   - 가동~검수 시각(예: 자정~06시 ≈ 6h)과 레인을 인자로 받거나 사용자에게 묻는다.
   - 레인: **claude 단독**(최근 운영) vs **3레인 병렬**(claude+codex+agy, worktree 격리로 ~3배 처리량).

2. **현재 백로그 집계:**
   - `docs/NEXT_PLAN.md`에서 레인별 actionable 수를 센다 — `[auto]`/`[auto:claude|codex|agy]` 중
     **non-`[blocked]`·non-`[manual]`**. 드레인(0) 여부를 명시.
   - 새로 `[blocked]` 된 항목은 **선행조건**을 메모(해제되면 seed 후보로 부활).

3. **후보 메뉴 live survey** (하드코딩 금지 — 매 실행 재수집해 스테일 방지). 소스별로 훑는다:
   - **기존 invariant 테스트 패턴** → 아직 안 지킨 데이터 속성(dangling ref / set 일치 / 수치 경계 /
     enum closure). `tests/test_content_integrity.py`·`test_route_integrity.py`·`test_progression.py`·
     `test_encounter_balance.py`를 읽고 `resources/<scenario>/{scenario.json,story_bible/}`에서 미보증
     속성을 찾는다(loot_table↔items, npc_agenda 타깃, arena 좌표 경계, item.kind enum, route node-type↔pool,
     bible entry flags/related_npcs/unlocks 등). → `[auto:claude]`(테스트 신설)/`[auto:codex]`(데이터 검증).
   - **lint/type 부채·deprecated API·codemod**: `rg 'type: ignore|TODO|FIXME|XXX|HACK'`, `xfail`/`skip`,
     FastAPI `on_event`(`src/mythos_api/app.py`), dotenv `type:ignore` 중앙화, `_map` 제거(선행 충족 시). → `[auto:claude]`.
   - **문서 압축**(`docs/DOCS_POLICY.md` 라인 예산 초과·완료 체크리스트): `NEXT_PLAN.md`/`COMPLETED_SUMMARY.md`/
     `docs/plans/*`. → `[auto:codex]`.
   - **agy 이미지 백로그**: `outputs/agy/*/VERDICT.md`(반려분), `NEXT_PLAN.md` agy 항목. → `[auto:agy]`.
   - 각 후보 = {레인, **1줄 완료기준**, 검증 게이트(`make check` / `make smoke-local` / 이미지 무결성)}.

4. **분량 추산:**
   - 회차당 **~3.5분**(`make check`; `make check-auto`면 ~2분) 가정. 단일 레인 = `N × 3.5분`,
     3레인 병렬 ≈ `max(레인별 시간)`.
   - 목표 창과 비교해 **"현재 ~X분치 · 목표 <창>엔 ~Y개 부족"**을 1줄로 명시.
   - **반드시 고지**: ① 드레인하면 멈춤(시간 못 채움 — 정상), ② `MAX_ITER`(기본 20)를 **seed 수 이상**으로 올릴 것.

5. **제안 출력 + 승인 시 기록:**
   - 레인별 후보를 표로 제시(레인 · 완료기준 · 게이트 · 효과/우선순위).
   - **사용자가 고른 것만** `NEXT_PLAN.md`의 `## Overnight QA Seed` 섹션에 한 줄씩 append:
     `- [ ] [auto:<lane>] <설명>. 완료 기준: <1줄>.`
   - 승인 안 된 후보·무태그 라인·다른 레인 줄은 **건드리지 않는다**.

6. **가동 명령 출력:**
   - 단일: `MAX_ITER=<seed수+여유> make overnight` (관찰 `make overnight-logs`, 중단 `make overnight-stop`).
   - 병렬: `make overnight-worktrees` → 각 worktree에서 `make overnight` / `make overnight-codex` / `make overnight-agy`.
   - 아침 검수: `/overnight-report`.

## 규칙

- 후보는 **deterministic·offline**(`make check`/`make smoke-local`)으로 검증 가능한 것만. feel·콘텐츠 저작·
  밸런스·프롬프트 튜닝은 `[manual]`로 분리하고 `[auto]` 금지(무인 검증 불가가 최대 리스크).
- **무태그 → `[auto]` 임의 승격 금지.** 사용자 승인분만 기록한다.
- 메뉴는 **하드코딩하지 말 것** — 매 실행 live survey(코드/데이터가 바뀌면 후보도 바뀐다).
- 추산은 실측 회차시간(~3.5분) 기반, 낙관 금지. **드레인=정상 종료(시간 미충족)**임을 항상 고지.
- 이 스킬은 **NEXT_PLAN seed 기록 외에 코드/문서 수정·커밋 금지**(실제 구현은 overnight 루프가 한다).
- 추측 금지. 백로그/소스에 없으면 "없음"이라고 적는다.
