# LOOP_ENGINEERING — Project MythOS
최종 갱신: 2026-06-14

> 이 repo에 적용된 자율 LOOP(overnight 무인 실행) 엔지니어링 설명서.
> "자는 동안 Claude Code 헤드리스가 NEXT_PLAN의 `[auto]` 작업을 스스로 구현·검증·기록·커밋한다."
> 코드 근거: `bin/overnight/{run.sh,PROMPT.md,overnight-settings.json}`, `.claude/skills/`, `docs/NEXT_PLAN.md`.

---

## 0. ⚠️ 핵심 전제 — MythOS는 게임이다 (이 LOOP의 적용 한계)

이 LOOP는 원래 결정론적 백엔드 서비스용으로 설계됐다. MythOS는 **narrative 게임**이라
백로그의 대부분이 **사람 플레이 체감 QA**(`docs/neo_seoul_live_qa.md` 전부)·**콘텐츠/Story-Bible 저작**·
**밸런스 튜닝**·**LLM 프롬프트-feel 튜닝**으로, 무인 에이전트가 검증할 수 없다.

→ 따라서 이 LOOP는 **hygiene / regression / refactor / codemod / deterministic-bugfix** 에만 적합하다.
창의·체감 작업에는 쓰지 않는다. `[auto]` 백로그는 본질적으로 얇아 금방 소진된다(2026-06-14 기준,
초기 `[auto]` 묶음은 이미 거의 소진 — §6). 흔한 종료 사유는 `DONE`(소진)이거나 **`MAX_NO_PROGRESS`** 이며,
**그게 정상이다**. 효율을 내려면 **실행 전에 `[auto]` 항목을 한 묶음 seeding** 하라(회귀 테스트 백필,
codemod, lint/type 부채 정리, stale-doc 정리 등). seeding 없이 돌리면 즉시 무진행으로 멈춘다.

## 1. 한 줄 요약
프롬프트 1개를 헤드리스로 반복 호출하되, 매 회차가 작은 컨텍스트로 상태를 복원하고(`/sync`) →
NEXT_PLAN에서 `[auto]` **작업 1개**를 구현·게이트 통과시키고 → 기록하고(`/checkpoint`) → **로컬 커밋**한다.
한 회차가 곧 하나의 원자적 작업 단위이며, 회차마다 커밋되므로 **언제 멈춰도 손실은 최대 1회차**다.

## 2. 왜 이렇게 설계했나 (핵심 원리)
| 원리 | 이유 |
| --- | --- |
| **회차당 fresh context** | 매 회차 새 프로세스(`claude -p`) → 컨텍스트 비대/요약 문제 없음. Read Path(`/sync` ~130줄)만 다시 읽으면 복원됨. |
| **회차 = 작업 1개 + 즉시 커밋** | 한도/크래시가 언제 닥쳐도 미커밋 손실은 1회차뿐. 다음 회차가 `/sync`로 이어받음. |
| **offline 게이트가 커밋 게이트** | `$GATE_CMD`(기본 `make check`=ruff+eslint+mypy+tsc/vite-build+unittest) green 못 하면 커밋 안 함 → 깨진 코드가 쌓이지 않음. Docker/Ollama/FLUX/네트워크 불필요. |
| **상태는 파일에** | `NEXT_PLAN.md`(백로그) · `PROGRESS_LOG.md`(이력) · git history. 메모리가 아니라 디스크가 source of truth. |
| **최소 권한 무인 실행** | `overnight-settings.json` allow/deny → 자는 동안 `git push`·네트워크·파괴 동작 차단. interactive 설정은 불변. |

## 3. 구성 요소

### 3.1 러너 — `bin/overnight/run.sh`
무인 루프(bash, macOS bash 3.2 호환). 회차마다 `claude -p "$(cat PROMPT.md)" --permission-mode acceptEdits --settings bin/overnight/overnight-settings.json --output-format json` 실행.

루프 1회 흐름:
```
STOP/DONE 파일 검사 → MAX_ITER 검사 → claude -p 회차 실행 → classify_outcome → 분기 → (pause) → 반복
```

제어 파일 / 환경변수(기본값은 `run.sh` 상단 `: "${VAR:=...}"` 블록):
| 항목 | 기본값 | 역할 |
| --- | --- | --- |
| `bin/overnight/STOP` | — | 존재하면 다음 회차 진입 전 **graceful 종료**(현재 회차는 마침). 운영자 `touch` 또는 red 잔여물 회차가 생성. |
| `bin/overnight/DONE` | — | `[auto]` 백로그 소진/전부 blocked 시 에이전트가 생성(사유 기록) → 러너 종료. |
| `GATE_CMD` | `make check` | 커밋 게이트(swappable) = ruff+eslint+mypy+tsc/vite-build+unittest. 더 빠른 변형: `make check-auto`(mypy 제외)·`make smoke-local`. PROMPT.md가 `$GATE_CMD`로 참조. |
| `MAX_ITER` | 20 | 폭주 방지 백스톱(총 회차 상한). |
| `ITER_TIMEOUT` | 1800s | 회차당 최대 실행 시간(`gtimeout`/`timeout`; 없으면 타임아웃 비활성). |
| `LIMIT_WAIT` | 1800s | usage/session limit 감지 시 대기 후 재시도. |
| `PAUSE` | 30s | 회차 간 간격. |
| `MAX_CONSEC_FAIL` | 3 | 연속 실패 N회 시 안전 중단. |
| `MAX_NO_PROGRESS` | 2 | success인데 **새 커밋 없음** 연속 N회 시 안전 중단(얇은 백로그의 주 종료 사유 — 무진행 루프 차단). |
| `KEEP_ITER_LOGS` | 30 | `bin/overnight/logs/iter-*.log` 최근 N개만 보존(`runner.log`는 항상 보존). |
| `--once` | — | 1회차만 실행(체인 검증용). |

> 런타임 산출물(`logs/`·`STOP`·`DONE`)은 `.gitignore` 처리됨. 추적되는 하네스는 `run.sh`·`PROMPT.md`·`overnight-settings.json` 3종뿐.

### 3.2 결과 분류 — `classify_outcome` (run.sh 내 python3, read-only)
limit을 자유 텍스트 grep이 아니라 구조화 신호로 판정한다(false 오판 방지):
1. `--output-format json`의 객체 **`is_error == false`** → `success`
   (성공 회차 텍스트에 "rate limit" 등이 언급돼도 무시 — 정상 회차 오판 차단).
2. 성공이 아닐 때만 limit 텍스트(`usage/session limit`, `rate limit`, `overloaded`, `hit your …`, `quota` 등) 검사 → `limit`.
3. 그 외 → rc≠0이면 `failure`, 아니면 `success`.

분기: `limit`→consec_fail 리셋·`LIMIT_WAIT` 대기 후 재시도 / `failure`→consec_fail++·한계 시 중단 /
`success`→consec_fail 리셋 + **HEAD 전후 비교**(새 커밋 있으면 no_progress 리셋·해시 로깅, 없으면 no_progress++·한계 시 중단).

### 3.3 회차 지시문 — `bin/overnight/PROMPT.md`
헤드리스 에이전트가 매 회차 수행하는 고정 절차:
1. **상태 복원**: Skill `sync`.
2. **잔여물 복구**: `git status --porcelain`. dirty = 이전 회차 중단 잔여물 → 복구가 이번 회차 작업.
   `$GATE_CMD` green이면 `[recovered]` 커밋 직행, red면 건드리지 않고 Blocker 기록 + `STOP` 생성(사람 검수 필요).
3. **작업 선택**: `NEXT_PLAN.md`의 `[auto]` 최상위 1개만(`[manual]`/`[blocked]`/무태그 건너뜀, 임의 승격 금지).
   같은 항목 Blocker 2회면 `[blocked]` 덧붙이고 다음 후보로. 남은 `[auto]` 없으면 `DONE` 생성 후 종료.
4. **구현 + 게이트**: 완료 기준대로 코드+테스트 → `$GATE_CMD` 전부 green까지. 실패 시 `git restore` 후 Blocker.
5. **기록**: Skill `checkpoint`.
6. **커밋**: `git status`로 반영 확인 → `git add -A && git commit`(로컬만).

불변: `git push` 금지, Docker/Ollama/FLUX·네트워크 금지, 파괴/온라인 make 금지, **금지 작업 클래스**(플레이 QA·콘텐츠·밸런스·프롬프트-feel) 착수 금지, 작업 1묶음 초과 금지, 한도 임박 시 5–6단계 우선. `harness/CORE_MANDATES.md` §4-5 준수.

### 3.4 백로그 태깅 — `docs/NEXT_PLAN.md`
러너가 소비하는 작업 큐. 상태 박스(`[x]`/`[/]`/`[ ]`/`[~]`)와 **별개 축**으로 inline 자동화 태그를 붙인다:
- `[auto]` = 로컬·결정론·offline 검증 가능 — 반드시 **완료 기준 1줄**.
- `[manual]` = 사람 플레이/콘텐츠/밸런스/프롬프트-feel.
- `[blocked]` = Blocker 2회 누적(러너 자동 마킹) 또는 선행 조건 미충족.
- 무태그 = 무인 대상 아님(안전 기본값). 러너는 `[auto]`만 소비.

**품질 리뷰 회차 패턴**: 구현 체인 뒤에 read-only 리뷰형 `[auto]` 항목을 끼워 넣어, 커밋 range를
타입/단순화 관점으로 리뷰하되 **코드 수정 금지**, findings는 NEXT_PLAN `[auto]`로 환류한다.

### 3.5 문서 하네스 스킬 (`.claude/skills/`)
경계가 겹치지 않게 분리 — LOOP의 각 단계를 담당:
| 스킬 | 단계 | 책임 |
| --- | --- | --- |
| `/sync` | 회차 시작 | Read Path만 읽고 상태 복원. **읽기만** |
| `/checkpoint` | 회차 종료 전 | PROGRESS_LOG append + STATUS/NEXT_PLAN 갱신. **기록만** |
| `/tidy-docs` | 예산 초과 시 | archive 분리·압축. **정리만** |
| `/overnight-report` | 아침 검수 | 러너 상태·회차·커밋·게이트 재실측·잔여 `[auto]` 백로그 보고. **읽기+검증만** |

> 스킬은 `.claude/`(gitignore) 하위라 **git 미추적·머신 로컬**. 다른 에이전트(codex/antigravity)용 공용 미러가
> `.agents/skills/`(역시 gitignore)에 있으며 4종을 `.claude/skills/`와 동기화해 둔다. 새 머신에선 둘 다 다시 둬야 한다.

### 3.6 무인 권한 — `bin/overnight/overnight-settings.json`
`claude -p … --settings bin/overnight/overnight-settings.json`로만 로드되는 **전용 권한 경계**.
`defaultMode: acceptEdits` + allowlist(Read/Edit/Write/Skill, **열거된** 안전 make 타깃,
`git add|commit|status|diff|log|restore|checkout --`, `python3` 등). **deny(실제 안전 경계 — deny가 우선):
`git push`·`git reset --hard`·`curl`/`wget`·`rm -rf`·`sudo`·파괴/온라인 make(`infra-*`/`db-*`/`smoke`/`test-db`/
`test-e2e*`/`narrative-smoke`(비-fallback)/`visual-worker*`/`dev-*`/`streamlit`/`api`/`connect-demo`)·Web*·MCP(github/playwright)**.
`Bash(make *)` 전체 허용은 금지(새 파괴 타깃 자동 허용 방지). **interactive 설정
(`~/.claude/settings.json`, `.claude/settings.local.json`)은 건드리지 않는다.**

## 4. 운영 (실사용)
```sh
# 사전 1: 워킹 트리를 깨끗이 — dirty tree면 1회차가 잔여물 복구로 빠진다(또는 red면 STOP).
# 사전 2: GATE_CMD 기본 make check 가 현재 HEAD 에서 green 인지 한 번 확인.
# 사전 3: [auto] 항목을 한 묶음 seeding(없으면 즉시 MAX_NO_PROGRESS 로 멈춤).

caffeinate -dimsu bin/overnight/run.sh &              # Mac 절전 방지 + 백그라운드
bin/overnight/run.sh --once                          # 1회차만 (체인 검증)
GATE_CMD="make smoke-local" bin/overnight/run.sh &   # 런타임-flow 야간(mypy/tsc 대신 런타임 smoke)
touch bin/overnight/STOP                              # graceful 중단
tail -f bin/overnight/logs/runner.log                # 관찰
# 아침에: claude 세션에서 /overnight-report
```
종료 조건: `DONE`(소진/전부 blocked) · `STOP`(수동/red 잔여물) · `MAX_ITER` · 연속 실패 N회 · 무진행 N회.

## 5. 한계 / 알려진 동작
- **얇은 `[auto]` 백로그(§0)**: 가장 중요한 한계. 무진행 종료가 잦은 게 정상. 실행 전 seeding 권장.
- **헤드리스 회차 end-to-end 검증됨(2026-06-14)**: `--once` 1회차로 러너↔`claude -p` 연동·settings 로드·
  잔여물 복구·게이트·`[recovered]` 커밋·종료 분기까지 실증(첫 실행서 REPO_ROOT 폴백 버그 발견·수정 — §6). 첫 가동은 항상 `--once`로 한 회차만 확인할 것.
- **이 머신엔 `gtimeout`/`timeout` 부재** → 회차 타임아웃 비활성. 장시간 가동 전 `brew install coreutils` 권장(없으면 `ITER_TIMEOUT` 미적용).
- **Mac 절전/덮개**: `caffeinate` 필수, 전원 연결 권장(배터리+덮개 닫힘은 잠듦). `gtimeout`은 `brew install coreutils`.
- **회차 단위 손실**: 한도가 회차 중간에 닥치면 진행 중이던 1회차는 미커밋 손실 가능(직전까지는 커밋됨,
  다음 회차가 `/sync`로 복원). 잔여물은 PROMPT 2단계가 처리(green=`[recovered]` 커밋, red=무수정+STOP).
- **dirty tree 오발**: 시작 시 워킹 트리가 dirty면 1회차가 잔여물 복구로 빠진다(또는 red면 STOP). 첫 실행 전 트리를 비울 것.
- **브랜치 드리프트**: 커밋은 체크아웃된 브랜치에 쌓인다. `/overnight-report`가 브랜치를 명시한다. 전용 브랜치 권장.

## 6. 이 repo 적용 범위 / 이력
- **2026-06-14 — 하네스 구축**: 타 repo의 LOOP_ENGINEERING을 MythOS에 이식(`bin/overnight/` 3종 + `/overnight-report`
  스킬 + NEXT_PLAN `[auto]/[manual]/[blocked]` 태깅). 게이트는 `make check`(mypy 부채 정리 후 `check-auto`→`check` 승격).
- **2026-06-14 — 첫 `[auto]` 묶음을 인-세션 수행**(헤드리스 무인이 아니라 대화형으로 직접): mypy 부채 src+tests 0
  (게이트 `make check` green화), stale dated-plan 헤더 정합, Codex 스킬 버튼 상태 결정론화+버그픽스, bin/ 보관소 read-only
  검토 + 프루닝. → 이 작업들이 곧 LOOP가 잘하는 `[auto]` 작업 클래스의 실증이며, 그 결과 `[auto]` 백로그는 거의 소진됨.
- **2026-06-14 — 헤드리스 `--once` 첫 실검증**: 러너 실행 중 REPO_ROOT 폴백 버그(`git rev-parse … || cd .. && pwd`
  연산자 우선순위로 두 줄 출력 → `cd` 실패)를 발견·수정. 재실행 시 헤드리스 에이전트가 미커밋 수정을 잔여물로 인식
  → `make check` green → `[recovered]` 커밋(`94f77fc`)으로 자동 복구. 전체 체인(연동·sync·잔여물 복구·게이트·커밋·종료) 실증.
  다회차 무인 가동(밤샘)은 사용자 판단. 회차별 실측 효과는 `docs/PROGRESS_LOG.md`에 회차 커밋과 함께 기록한다.

`[auto]` 후보의 정직한 triage는 항상 `docs/NEXT_PLAN.md`의 자동화 태그가 권위다.

## 7. 관련 문서
- 설계 불변: `harness/CORE_MANDATES.md` · 핸드오프: `harness/CONTEXT_BRIDGE.md`
- 문서 운영(Read Path/Context Budget): `docs/DOCS_POLICY.md` · `docs/README.md`
- 백로그: `docs/NEXT_PLAN.md` · 이력: `docs/PROGRESS_LOG.md`
