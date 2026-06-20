# 2026-06-19 — Claude Code `/goal`을 overnight 루프 내부에 활용 (설계)

## Context / 배경

질문: Claude Code 내장 **`/goal`**(조건 충족까지 자동 턴 진행, v2.1.139+)을 자작 overnight 플러그인
(`scripts/overnight/`, 외부 bash 루프 방식) **내부에서 활용해 루프를 강화·개선**할 수 있는가.

핵심 구분 — 두 메커니즘은 층위가 다르다:
- **overnight 러너** = 외부 bash `while` 루프(`run.sh:188`). 반복마다 `claude -p` **1회 호출 = 1 항목**(`run.sh:236-239`),
  게이트는 invocation **안에서** Claude가 산문 지시로 실행(`PROMPT.md §4`), bash는 결과 JSON만 분류(`run.sh:140`
  `is_error==false→success`) + HEAD-diff phantom 가드(`run.sh:277-289`) + 캡(MAX_ITER/MAX_CONSEC_FAIL/MAX_NO_PROGRESS).
- **`/goal`** = invocation **내부**의 조건충족 자동연장. Haiku가 매 턴 조건을 독립 평가.

결론: `/goal`은 **claude 레인의 "게이트 green까지 수렴" 내부엔진 + 공짜 2차평가자**로는 유효. 다만 **외부 루프·
worktree 격리·멀티엔진 중재의 대체는 아니며**, 진짜 신뢰 강화(phantom-success 차단)는 외부 게이트 재실행이 담당.
→ 두 워크스트림을 **병행**해야 의미가 크다.

## 실측 — `claude -p "/goal …"` 호환성 (2026-06-19, 격리 temp dir)

러너의 실제 플래그 그대로 2회 측정.

| 항목 | Probe A (bare) | **Probe B (러너 플래그)** |
|---|---|---|
| 플래그 | `--output-format json`만 | `--permission-mode acceptEdits --settings overnight-settings.json --output-format json` |
| `/goal` 인식·실행 | ✅ (literal 아님) | ✅ |
| 자동 연장 | ✅ num_turns=**9** (막혀서 재시도) | ✅ num_turns=2 (완료까지) |
| 실제 작업 | ❌ Write 거부(권한 미부여) | ✅ **GOAL_OK.txt 생성(PASS)** |
| 권한 경계 | — | ✅ `permission_denials: []` |
| 종료 | ✅ | ✅ `stop_reason=end_turn`/`terminal_reason=completed` |
| JSON 형태 | 러너 분류키 일치 | `is_error=false`→`run.sh:140` "success"와 일치 |
| 비용/시간 | 9턴/48s | 2턴/7s/$0.07 |

**확정**: `claude -p "/goal …"`는 러너의 `--settings`/`acceptEdits` 경계와 완전 호환. 권한거부 0, 정상 종료,
run.sh가 파싱하는 JSON 그대로 반환 → §4를 `/goal`로 감싸는 건 기술적 차단 없음.

### 실측이 드러낸 두 함정 (설계에 필수 반영)

1. **`is_error:false` ≠ "목표 달성".** Probe A는 파일을 **못 만들었는데도** `is_error=false, subtype=success`였다
   (권한벽에 막혀 포기). 러너 분류(`run.sh:140`)에 `/goal`을 그냥 물리면 **실패한 목표를 success로 오분류**.
   → 목표 달성 판정은 `/goal` JSON이 아니라 **외부 검증**(HEAD-diff + 외부 `make check`)이 권위여야 한다.
2. **"stop after N turns" 바운드는 soft.** "stop after 2 turns"를 줬으나 Probe A는 **9턴** 돌았다(실패 재시도 중
   바운드 무시). → `/goal` 자체 바운드를 런어웨이 방지로 신뢰 금지. **run.sh `ITER_TIMEOUT`/`MAX_ITER` 하드 실링 유지.**

## 설계 — 두 워크스트림 (병행)

### WS-α (신뢰 앵커, **우선**): 외부 게이트 재실행 = NEXT_PLAN WS5 ①

`/goal` 도입과 무관하게 **진짜 신뢰 ROI**. 엔진 무관(claude/codex/agy 공통)이라 신뢰가 대칭으로 유지된다.

- `run.sh`: 커밋 발생(HEAD 전진) 회차에 한해 bash가 `$GATE_CMD`를 **새 HEAD에서 외부 재실행** →
  `gate_exit`/`commit_verified`를 `status.tsv`에 기록(`emit_status` 확장, `run.sh:72-79`).
- 재게이트 RED인데 invocation은 success였다면 = **phantom-success** → 플래그(자동 `git revert`/`[blocked]`/`notify.sh`).
- 비용: **커밋 회차만** 재게이트(무진보 회차 skip) → 추가 게이트 비용 최소화.

### WS-β (수렴 레이어, **opt-in**): claude 레인 `/goal` 래핑

`/goal`은 invocation-level이라 "§4만" 따로 못 감싼다 → **반복 1회 전체**가 목표지향이 된다.

- `PROMPT.md`(claude 전용) 맨 앞에 `/goal` 디렉티브를 **러너가 주입**(env 플래그 on일 때만; 파일 원본은 불변 유지).
- 종료조건(초안, 측정가능하게):
  > `/goal` (a) 선택한 `[auto]`/`[auto:claude]` 항목 구현 + `$GATE_CMD` exit 0(완전 green) + 커밋(HEAD 전진,
  > Co-Authored-By) **OR** (b) `[blocked]`로 phase+근거 기록 후 트리 `git restore` clean **OR** (c) 소비할
  > `[auto]` 항목 없음(DONE). **무조건 N턴 후 정지.**
- `PROMPT.codex.md`/`PROMPT.agy.md`는 **그대로**(codex/agy엔 `/goal` 없음) → 비대칭 의도적. claude 레인만
  수렴 강제 + 2차평가를 얻고, **신뢰 대칭은 WS-α가 담당**.

## 가드레일 (실측 함정 직결)

- **권위 = 외부.** `is_error:false`/`/goal` 자체 판정을 달성으로 신뢰 금지. run.sh의 HEAD-diff + WS-α 외부게이트가
  권위, `/goal` JSON은 보조 신호.
- **하드 실링 유지.** N-turn soft → `ITER_TIMEOUT`(하드 timeout)·`MAX_ITER` 필수. `TIMEOUT_BIN` 해소 여부 점검
  (실측 시 `gtimeout` 래퍼 오작동 EXIT 127 경험 — run.sh의 탐지 로직이 실제로 바인딩되는지 확인).
- **토큰.** `/goal`은 막히면 스핀(9턴/48s) → 하드 timeout이 실질 실링.
- **롤아웃.** `OVERNIGHT_GOAL=1` env 플래그로 **opt-in(기본 off)**. 현 prose 흐름과 A/B, `--once`로 1회 검증 후 무인 투입.

## 변경 파일

- `scripts/overnight/run.sh` — WS-α: 커밋 회차 외부 재게이트 + `emit_status`에 `gate_exit`/`commit_verified` 컬럼.
  WS-β: `OVERNIGHT_GOAL` 분기로 claude PROMPT_CONTENT 앞에 `/goal` 라인 주입.
- `scripts/overnight/PROMPT.md` — β 조건문안은 run.sh 주입이므로 본문 불변(또는 주석으로 조건 SSOT 1곳).
- `scripts/overnight/status.sh` — (선택) 새 컬럼 표시.
- `docs/NEXT_PLAN.md` — WS5 ① 항목을 본 설계로 갱신.

## 검증 (end-to-end)

1. `OVERNIGHT_GOAL=1 make overnight-once`(claude 레인) + 시드된 `[auto]` 1건:
   `/goal` 수렴→green+commit, **외부 재게이트 green**, `status.tsv`에 `gate_exit=0`/`commit_verified=1`,
   `ITER_TIMEOUT` 미발동, `num_turns` 합리.
2. **Fault-injection**: 게이트 green 불가 항목 시드 → `/goal`이 `[blocked]`로 종료(phantom 아님) + 일부러 red 커밋을
   심어 **외부 재게이트가 RED 포착**하는지(phantom-success 플래그 발동).
3. **회귀**: 플래그 off(기본)일 때 기존 prose 흐름 무변화.

## 권고

- **WS-α 먼저** (외부 재게이트 = 진짜 신뢰 ROI, 엔진 무관). **WS-β는 그 위 opt-in 수렴 개선.**
- **β 단독 도입은 비권장** — `/goal`의 soft judgment/soft bound가 외부검증 없이는 오히려 신뢰를 약화시킨다(실측 함정 ①②).
