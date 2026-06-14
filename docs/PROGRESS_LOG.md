# Progress Log

최종 갱신: 2026-06-14

이 파일은 **최신 증분 요약만** 유지한다. 긴 2026-06 상세 로그(route-node 세션 단계별 상세 포함)는
`bin/docs/archive/progress-2026-06.md`, 2026-05 로그는 `bin/docs/archive/progress-2026-05.md`를 본다.

## 2026-06-14 — 조우 무결성 invariant 추가 ([auto], QA seed #4)

- Status: overnight `[auto]` 1회차 — Overnight QA Seed #4(조우 무결성) 박제. green.
- Changed: `tests/test_content_integrity.py`에 `ContentEncounterIntegrityTest` 2건 추가. route map 두 빌더(full+dynamic) ×24 seed의 모든 combat node type이 비어있지 않은 `route_map.combat_encounters` 풀에 매핑되고, 선택된 encounter/pool 항목이 `combat.encounters`에 실재하는지 검증. 모든 encounter enemy가 bestiary id를 resolve하고 `idle/attack/guard/skill/hit` combat action sheet 파일을 실제 리소스 경로에서 찾는지도 검증.
- Verified: `tests.test_content_integrity` 6 tests OK. `make check` EXIT=0 — ruff All passed + eslint + mypy Success(111 files) + frontend build + 316 tests OK(skipped 2).
- Blockers: 없음.
- Next: 남은 QA seed `[auto]` 2종(조우 승률 밴드·진행도 경제).

## 2026-06-14 — overnight 루프 Codex 엔진 추가

- Status: Claude 전용이던 무인 루프를 Codex(`codex exec`)에서도 동일 LOOP로 돌 수 있게 함. setup 완료·실측 검증·커밋.
- Changed:
  - `bin/overnight/run.sh`: `ENGINE`(claude|codex) 분기 — LOOP 제어 로직 단일 소스 유지, 호출 줄/프롬프트/권한 경계만 분기. claude 경로 불변. codex는 `</dev/null` 필수(stdin freeze 방지).
  - `bin/overnight/PROMPT.codex.md` 신설: claude PROMPT와 동일 절차, 단 Skill 호출 불가 → `.agents/skills/*/SKILL.md` 절차를 읽어 수행.
  - `Makefile`: `overnight-codex`/`-watch`/`-once`(ENGINE=codex 위임). stop/logs/status/clean 공용.
  - `AGENTS.md`: Codex 자동 로드 대상에 CORE_MANDATES·sync/checkpoint·루프 포인터 추가. `docs/LOOP_ENGINEERING.md` §3.1/§3.6/§4/§6 갱신.
  - 안전 경계: 전역 `~/.codex/config.toml`(danger-full-access/YOLO)을 회차마다 CLI로 덮어씀 — `--sandbox workspace-write` + `network_access=false` + `approval_policy=never`.
- Verified: **`codex exec`로 직접 실측** — 전역 YOLO에도 회차 내 `curl`이 exit 6(DNS 차단)으로 실패(네트워크 봉쇄 확정). stdin freeze 버그 발견·수정(`</dev/null`), rc=0 성공 경로 확인. `bash -n`·`make -n overnight-codex*` 통과. 최종 상태 `make check` rc=0(skipped 2). 작업 중 **Claude overnight 회차가 이 변경을 "동시 작성자"로 정확히 감지해 대신 커밋하지 않고 graceful STOP** — 동시작성 안전 동작 실증(이번 커밋 후 STOP 제거·재개 가능).
- Blockers: 워크스페이스 내 로컬 파괴(`rm -rf`/`git reset --hard`)는 샌드박스가 못 막음 → `PROMPT.codex.md §0` 명시 금지로만 차단(회차당 커밋 = 폭발 반경 ≤1회차).
- Next: clean 트리에서 `make overnight-codex-once`로 첫 회차 체감 확인.

## 2026-06-14 — 플래그 참조 무결성 invariant 신설 ([auto], QA seed #3)

- Status: overnight `[auto]` 1회차 — Overnight QA Seed #3(플래그 참조 무결성) 박제. green.
- Changed: `tests/test_content_integrity.py` 신설(4 invariant). neo-seoul 소비 flag(route node
  `gate`·perspective `when`·`playability.route_branches[].trigger_flags`·story_bible `flags_any`)가
  recognized producer로 모두 생산되는지 검증 — (1) gate flag는 authored `effect.flags` 또는 엔진
  온보딩(`met_se_rin`/`refused_se_rin`)으로 생산 가능(하드 도달성), (2) route_branch
  `story_bible_entry` 전부 실재 bible id로 resolve, (3) **미생산 flag 0**: 모든 소비 flag가
  authored effect ∪ 엔진 ∪ `NARRATIVE_DRIVEN_FLAGS`(Director가 `world_delta`로 emit하는 가치축/서사
  상태 flag 12종, 명시 등록)에 속함(신규 orphan=dead branch면 ratchet fail), (4) 레지스트리 무부패(등록
  flag는 모두 실소비 + authored effect와 비중복). 코드 변경 없음(테스트만). **발견**: seed가 든 "choice
  `requires`"는 실제론 스킬 id prereq(flag 아님), chapter_gates는 산문 요약 → 둘 다 구조적 flag 소비자
  아니라 스캔 제외(테스트 docstring에 명시).
- Verified: `make check` EXIT=0 — ruff All passed + eslint + mypy Success(111 files) + frontend build +
  314 tests OK(skipped 2, 310→314). 위반 0 → 기계적 수정/Blocker 불요.
- Blockers: 없음.
- Next: 남은 QA seed `[auto]` 4종(스킬·아이콘/조우 무결성·승률 밴드·진행도 경제).

## 2026-06-14 — 엔딩 도달성 invariant 추가 ([auto], QA seed #2)

- Status: overnight `[auto]` 1회차 — Overnight QA Seed #2(엔딩 도달성 invariant) 박제. green.
- Changed: `tests/test_route_integrity.py`에 2건 추가(`build_route_map` full + `build_route_seed`
  dynamic ×24 seed) — (1) `scenario.endings`의 모든 엔딩 id가 route perspective `ending_influence`로
  도달 가능: 그 엔딩을 미는 노드가 start→boss 가시 경로 위에 ≥1개 존재(boss뿐 아니라 전 경로에서 누적 가능),
  (2) 참조 무결성: 모든 `ending_influence` 문자열이 실재 엔딩 id를 가리킴(오타/dangling push 0).
  헬퍼 `_influence_nodes`로 노드별 영향 수집. 코드 변경 없음(테스트만). 현재 neo-seoul 4 엔딩 전부 충족.
- Verified: `make check` EXIT=0 — ruff All passed + eslint + mypy Success(110 files) + frontend build +
  310 tests OK(skipped 2, 308→310). 위반 0 → 기계적 수정/Blocker 불요.
- Blockers: 없음.
- Next: 남은 QA seed `[auto]` 5종(플래그/스킬·아이콘/조우 무결성·승률 밴드·진행도 경제).

## 2026-06-14 — 루트 도달성 invariant 테스트 신설 ([auto], QA seed #1)

- Status: overnight `[auto]` 1회차 — Overnight QA Seed #1(루트 도달성 invariant) 박제. green.
- Changed: `tests/test_route_integrity.py` 신설. neo-seoul `route_map`을 두 빌더(`build_route_map`
  full + `build_route_seed` dynamic) × 24 seed로 생성해 4 invariant 검증 —
  (1) 고아 노드 0(start에서 전 노드 도달), (2) 모든 노드가 boss 레이어까지 경로 보유,
  (3) 모든 앵커가 start로부터 도달 가능(gate는 제한만 하므로 layered 연결성 = 어떤 flag 조합서 도달),
  (4) combat-taking·combat-avoiding 경로 공존(`route_map_paths_summary`). 코드 변경 없음(테스트만).
- Verified: `make check` EXIT=0 — ruff All passed + eslint + mypy Success(110 files) + frontend build + 308 tests OK(skipped 2, 304→308). 위반 0 → 기계적 수정/Blocker 불요.
- Blockers: 없음.
- Next: 남은 QA seed `[auto]` 6종(엔딩 도달성·플래그/스킬·아이콘/조우 무결성·승률 밴드·진행도 경제).

## 2026-06-14 — overnight 운영 도구 + 콘텐츠/밸런스 QA seed + 가동 준비 + 문서 정리

- Status: 하네스 검증 후 실가동 준비 — 운영 make 타깃·QA seed·push 준비(main ff)·tidy-docs.
- Changed:
  - 운영 타깃(`Makefile`): `make overnight`(백그라운드: 가드+절전+nohup+stale 정리), `overnight-watch`(가동+로그 follow 한 방에), `overnight-once/-stop/-logs/-status/-clean`. `LOOP_ENGINEERING §4`를 make 타깃 기준으로 재작성.
  - **Overnight QA Seed 7종 `[auto]`**(NEXT_PLAN): 루트/엔딩 도달성·플래그/스킬·아이콘/조우 무결성·조우 승률 밴드(시뮬)·진행도 경제. "재밌는가"(사람) 대신 **"안 깨지는가"(봇, 결정론)** 콘텐츠/밸런스 QA fodder.
  - push 준비: 로컬 `main`을 현재 작업으로 fast-forward(101커밋 뒤처져 있던 것). private repo push는 안전 분류기 하드블록 → 사용자가 `gh repo create … --push` 직접 실행(men16922 본인 계정).
  - tidy-docs: PROGRESS_LOG 167→74(10개 archive 이동), NEXT_PLAN 149→117(완료 `[x]` 압축), COMPLETED_SUMMARY M42, DECISIONS 하네스 항목 추가.
- Verified: make 타깃 dry-run + `make overnight-status` 동작 확인. `make check` green 유지(직전). 진입점 4종 라인 예산 내(60/100/117/74).
- Blockers: push는 사용자 직접 실행(분류기 하드블록). `gtimeout` 부재 시 회차 타임아웃 비활성(`brew install coreutils` 권장 — 사용자 설치 완료).
- Next: 사용자가 `make overnight-watch`로 무인 가동 → 몇 시간 후 `/overnight-report` 검수(7 seed 박제 vs Blocker).

## 2026-06-14 — CLAUDE.md stale 린터/CI 서술 정정 ([auto])

- Status: `[auto]` 트랙 — `CLAUDE.md`의 "There is no linter or CI configured ... neither pytest nor ruff is a dependency" 문장이 현행과 불일치 → 정정.
- Changed: 해당 문장을 실측 기준으로 교체 — ruff(`[tool.ruff]`)+mypy는 dev 의존성(`.[dev]`), eslint=frontend, `make lint/typecheck/check/check-auto` 존재, **CI 존재**(`.github/workflows/ci.yml`가 push/PR to main에서 lint/typecheck/test 실행). 테스트는 stdlib `unittest`(pytest 아님)라 `make clean`의 `.pytest_cache`는 잔재로 명시. docs-only.
- Verified: `make check` green(ruff "All checks passed!" + mypy + frontend build + 304 tests OK, skipped 2).
- Blockers: 없음.
- Next: 남은 `[auto]` 백로그 거의 소진 — Maintenance의 `[manual]`/Priority 1 `[/]` 잔여는 무인 검증 불가.

## 2026-06-14 — overnight 하네스 `--once` 첫 실검증(REPO_ROOT 버그 발견·자동 복구)

- Status: 헤드리스 무인 회차를 처음 실제 실행. 정적 검증만 됐던 `run.sh`의 런타임 버그를 즉시 포착.
- 발견·수정: `REPO_ROOT="$(… git rev-parse --show-toplevel || cd .. && pwd)"`가 연산자 우선순위로 git 성공 시에도
  `&& pwd`가 실행돼 **두 줄**(toplevel+pwd) 출력 → `cd "$REPO_ROOT"` 실패(EXIT 1). 폴백을 별도 라인으로 분리.
- 재실행 검증: 미커밋 수정이 있는 dirty 트리에서 헤드리스 에이전트가 **잔여물 복구 경로**를 정확히 수행 —
  `make check` green 확인 후 `[recovered] fix(harness): REPO_ROOT …`(`94f77fc`) 자동 커밋, classify_outcome=success,
  HEAD-diff 감지, `--once` 정상 종료. 러너↔`claude -p` 연동·settings 로드·sync·게이트·커밋·로그 전 체인 실증.
- Verified: `bin/overnight/run.sh --once` EXIT=0, iter-1.log `is_error:false`(77s/16턴). `make check` green 유지.
- Blockers: 없음. 머신에 `gtimeout` 부재 → 회차 타임아웃 비활성(LOOP_ENGINEERING §5에 기록, `brew install coreutils` 권장).
- Next: 다회차 무인 가동은 사용자 판단. `[auto]` 백로그 소진 상태라 seeding 후 가동 권장.

## 2026-06-14 — bin/ 보관소 검토(read-only) — 프루닝 후보 목록

- Status: `[auto]` read-only 검토 완료. 삭제 없음(승인은 `[manual]` — archive README 정책 + CORE_MANDATES §5).
- 분석: bin/ 568K, 설계상 정책-거버넌스 아카이브(`bin/docs/archive/README.md`가 큐레이트 인덱스 + 삭제 정책 보유).
  활성 문서(docs/·CLAUDE.md, bin/ 밖) inbound 참조를 파일명별로 집계.
- **보존 필수**(활성 참조 있음): `DRAFT.md`·`IMPLEMENTATION_M0_M10.md`(CLAUDE.md), `progress-2026-05/06.md`(PROGRESS_LOG),
  `decisions-2026-05.md`(DECISIONS), `DESIGN_FULL/GAMEPLAY_FULL_2026-06-06.md`, 참조 있는 dated plan 다수(route-node·
  progression-inventory·combat-portrait·progression-skills·party-controllable·combat-darkest-dungeon·web-ui-decoupling 등).
- **가장 깨끗한 프루닝 후보**(활성 0-ref + 인덱스 미등재, COMPLETED_SUMMARY로 대체된 retired dated plan):
  `bin/docs/plans/2026-05-31-*`(causality/combat-single-iframe/engine-decoupling/narrative-pacing/roguelike-combat/story-bible-save-load, 6),
  `2026-06-03-*`(frontend-slice4/p2-p3-implementation/poc-parity-roadmap/poc-ux-improvement, 4), `2026-06-06-combat-visual-effects.md`,
  `bin/docs/feedback/0530-1.md`.
- **정책-게이트 후보**(0-ref이나 archive 인덱스 등재 → 삭제 전 요약 필요): `STREAMLIT_VS_API.md`·`PROJECT_OVERVIEW.md`·`DESIGN_SYSTEM_STATS.md`·`ARCH_MAP.md`, `archive/2026-05-30-*`.
- 권고: 총량 568K로 **ROI 낮음 → 프루닝 보류**가 합리적. 진행 시 위 "가장 깨끗한 후보" ~11개만 삭제(승인 필요).
- Blockers: 없음. Next: 삭제 진행 여부는 사용자 승인(`[manual]`).

## 2026-06-14 — Codex Skill UX 버튼 상태 결정론화(+선행 미충족 클릭 버그 픽스)

- Status: `[auto]` 트랙 — Codex 스킬 트리 버튼 상태 로직을 순수 함수로 추출하고 첫 플레이어용 안내 보완.
- Changed: `skillState.ts` 신규 `deriveSkillAction(skill, interactive, busy)` — show/disabled/label/blocked(`prereq`|`insight`|null)
  discriminated union으로 추출(prereq>insight 우선순위, 결정론). `SkillTreePanel.tsx`가 이를 렌더:
  - **버그 픽스**: 기존 `canAct`는 통찰만 충분하면 선행 미충족이어도 버튼 활성→클릭→백엔드 거부. 이제 선행 미충족 시 비활성.
  - **공백 보완**: 통찰 부족 시 "통찰 부족 · 보유 {n}p / 필요 {c}p" 안내 추가(기존엔 이유 없는 회색 버튼).
  - 버튼 텍스트(`습득/강화 -Np`·`처리 중...`)는 보존(E2E 셀렉터 영향 없음). 상태 문구 wording polish는 `[manual]`.
- Verified: `make check` EXIT=0(ruff + mypy 109 + frontend tsc/vite build + 304 tests). 프론트 테스트 러너 부재로 JS 유닛테스트는 보류(순수 함수 추출로 회귀 안전성 확보).
- Blockers: 없음.
- Next: 남은 `[auto]`(bin/ 검토 read-only)·사람 필요 작업(Neo-Seoul 플레이 QA, 하네스 --once).

## 2026-06-14 — overnight 무인 루프 하네스 + mypy 부채 정리 완료(게이트 make check 승격)

- Status: 타 프로젝트 LOOP_ENGINEERING을 MythOS에 이식 + 첫 `[auto]` 작업으로 src 타입 정리.
- Changed:
  - 하네스: `bin/overnight/{run.sh,PROMPT.md,overnight-settings.json}`(무인 전용 권한 경계 --settings,
    git push/네트워크/파괴 make/Web/MCP deny), `/overnight-report` 스킬, `docs/LOOP_ENGINEERING.md`
    MythOS 재작성(게임이라 `[auto]` 백로그 얇음 caveat). NEXT_PLAN `[auto]/[manual]/[blocked]` 태깅.
  - 게이트: `make check`가 mypy 선행 부채(~129 errors)로 red였어서 임시로 `make check-auto`(lint+frontend-build+
    smoke-local, mypy 제외) 신설. **부채 정리 후 기본 게이트를 `make check`로 승격**(run.sh `GATE_CMD`); check-auto는 더 빠른 변형으로 잔존.
  - **mypy 0**: `mypy src tests` 0 errors/109 files(이전 ~129). src(config `or` 체인·visual_queue/prompts/
    route_map/route_runtime/session `isinstance` 재평가→지역변수·Optional 주석·director provider 확장 API getattr/cast +
    kwargs `dict[str,Any]`) + tests(route_* `_rm`/`_seed` assert 헬퍼·`dict[str,Any]` 주석, playwright snapshot/list 주석·
    request 핸들러 def화). 전부 동작 불변.
  - `.agents/skills` 공용 미러를 `.claude/skills` 기준 동기화(4종).
- Verified: `mypy src tests` Success(109 files), **`make check` EXIT=0**(ruff All passed + mypy Success + frontend
  built + 304 tests OK). route+singleton 테스트 62개 직접 재실행 green(동작 불변 확인).
- Blockers: 없음.
- Next: 하네스 `--once` 실검증(사용자 실행 — 헤드리스 claude 중첩 회피).
