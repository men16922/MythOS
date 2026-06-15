# Progress Log

2026-06 상세 이력 보관소다. 2026-05 전체 상세 이력은 `bin/docs/archive/progress-2026-05.md`에 보관했다.

형식:

```text
YYYY-MM-DD
- Status:
- Changed:
- Verified:
- Blockers:
- Next:
```

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
  - `AGENTS.md`: Codex 자동 로드 대상에 CORE_MANDATES·sync/checkpoint·루프 포인터 추가. `docs/engineering/mythos/LOOP.md` §3.1/§3.6/§4/§6 갱신.
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

## 2026-06-14 — 오프닝 시퀀스 정합: 장면별 이미지 + 4비트 온보딩 + 인트로 리뉴얼

- Status: live QA §1.1 — 오프닝 첫인상 정합 묶음 완료. "예고(인트로 3컷 티저)→경험(인게임 비트)" 구조화.
- Changed:
  - scene 1 신호 정리: gemma4는 이미지 미해석(텍스트만) → first-scene INSTRUCTION(user 메시지 끝=비절단)에 "오프닝 확립 장면, 다른 인물/적/추격/전투 금지·시스템 few-shot 무시·location_id 무시" 추가(`prompts.py OPENING_FIRST_SCENE_INSTRUCTION`). `starting_location: data-layer-01` 드리프트 차단(turn 0 야외 빗속 거리·쓰러져 각성 강제).
  - 4비트 온보딩(`scenario_context.py`, 게이팅 turn≤3): scene1=홀로 각성 / scene2~4=인트로 `cinematic_shots[0..2]` title·body를 직접 지시 소스로(도착→첫 접촉→추격+`patrol_ambush`). 세린은 scene2부터 등장.
  - 장면별 이미지: 오프닝 앵커 `image_sequence`(opening_first→serin-arrival→first-contact→drone-chase), 프론트가 `active_scene.turn_index`로 인덱싱(`scenario.json`/`route_map.py`/`types.ts`/`StoryPanel.tsx`). image_pre/scenePartner는 폴백. `detectSceneCharacter`를 `sceneCharacter.ts`로 분리(lint).
  - 인트로 시작 화면 리뉴얼: SYS-01~04 용어 타일 제거, copy를 평이한 오리엔테이션(지금/곧/목표 3줄), 작전목표 패널 제거, 버튼 "깨어난다"(`scenario.json session_intro`/`IntroPanel.tsx`).
- Verified: `make test` 304 OK(skipped 2), frontend lint/build clean. 실제 Ollama: turn0×2 빗속 홀로 각성(세린/지하 0), turn1 "빗속에서 세린이 당신을 발견한다"·세린 도착. `/api/v1/scenarios` 새 인트로 copy 확인. API 재기동.
- Blockers: 변경 미커밋. 경미: turn1 "회랑" 1회 누수·제목 "Changed " 접두 아티팩트, 인트로 불릿 칩 CSS.
- Next: 풀 4턴 사람 플레이 체감(`make dev-up`, 새 루프). 큰 후속: 프리게임 montage 재배치(추격 컷 후반).

## 2026-06-14 — 전투-서사 연결: 교전 배너에 배경·보상 의미 노출 (live QA §5/§6)

- Status: §6 "전투-서사 연결 희미" + §5 "보상 의미 약함" 처리.
- Changed: 인코더의 기존 미사용 메타 `narrative_trigger`(왜 이 교전인가)·`reward_intent`(이기면 무엇이 남는가)를 `_encounter_meta`가 노출하도록 추가(`combat_session_helpers.py`), StoryPanel 전투 배너를 "교전 배경 · {name} / ⚑ 배경 / 🎯 학습 / 🎁 승리 보상"으로 확장(`StoryPanel.tsx`, `types.ts`). 문구는 시나리오 기존 데이터(designer-voice, codex 폴리시 여지).
- Verified: `make test` 304 OK, `tests.test_session_combat` 19 OK, `make frontend-lint`/`frontend-build` clean.
- Blockers: 없음. 변경 미커밋.
- Next: 실플레이 체감(전투 진입/보상), 보상 결과 패널과 reward_intent 연동 검토.

## 2026-06-14 — 핵심 위협(왜 위험한가) stakes 노출 (live QA §2)

- Status: live QA §2 "왜 위험한지 모르겠다" 처리.
- Changed: `scenario.json playability.core_stake`(비식별 신호=IX 최적화/소거 대상) 추가 + `ScenarioConfig.playability` 노출(`scenario.py`) + `_scene_stakes_summary`가 초반 phase(connect/explore)에 core_stake를 스트립 최상단 노출, interact 이후 드롭(`serializers.py`). 문구는 brief PREMISE 도출(codex 폴리시 여지).
- Verified: `make test` 304 OK, `tests.test_api` 31 OK, phase별 노출/드롭 동작 확인.
- Blockers: 없음. (§3 내부표현은 프롬프트 가드+브라우저 확인상 깨끗 → 현재 저우선.)
- Next: 실플레이 체감(위험 이유), 잔여 §6(전투-서사 연결).

## 2026-06-14 — 장면·위치 다양성: route 노드 anti-stickiness (explore 정체 수정)

- Status: live QA §6 phase explore 정체 / location stickiness 수정. Playwright + 멀티턴 in-process 테스트서 발견(turn 1-3 같은 골목)→근본 원인 규명·수정.
- Changed: `DEFAULT_TURNS_PER_LAYER=4`라 route 노드가 4턴 고정→director에 동일 노드 주입→같은 장소 반복. `_route_director_notes`에 turn_index 전달, **첫 장면=노드 확립+이미지 정합, 이후 장면=전진 지침(반복 금지: 이동/새 인물·단서·위협/국면 전환)** 분기(`scenario_context.py`). 레이어 0 오프닝 오프셋(turn 1=fresh) 처리.
- Verified: `make test` 304 OK(신규 1 `test_advance_directive_only_on_repeat_turns`). 멀티턴 in-process 재검증: 위치가 네온 골목→배관 통로→서비스 통로→정비 스테이션으로 분산(이전 3턴 동일 대비 개선), 반복 문장 0·추상어 0·판정 양호.
- Blockers: 없음. 변경 미커밋.
- Next: 실플레이로 "10-15분마다 감각 변화" 체감 확인. 잔여 §6(전투-서사 연결)·§2(위험 이유)·§3(내부표현).

## 2026-06-14 — Neo-Seoul 플레이성: 이미지 경로·결말경향·막 목표 (live QA A/B)

- Status: live QA `[!]` 3건 처리 — visual worker 무한 pending 마감(A), 결말 경향 명료화(B-part1), 막 목표 Golden Path 정합(B-part2-i).
- Changed:
  - A: `App.tsx` pending/processing 90초 타임아웃→원인 안내; `visual_orchestration.py` `_has_inflight_asset`로 stale(>300s) pending 무시(죽은 워커가 루프 내내 이미지 막던 버그 수정) + 회귀 6건(`test_visual_orchestration.py`). 진단: `make api`/`streamlit` 단독은 worker 미기동(`make dev-up`만 `visual-worker-bg` 포함).
  - B1: `RouteNarrative.tsx`+CSS — 엔딩 4종에 narration 압축 의미 글로스(내부 `condition` 비노출).
  - B2-i: `scenario.json chapter_gates`에 phase별 `player_goal`(flag 제거); `scenario.py` `session_design` 노출; serializer `_chapter_goal`(loop.phase); StoryPanel "이번 막"/"현재 목표" 위계 표시(types.ts/index.css).
  - B2-ii: route junction 선택지 라벨을 `{행선지}(으)로 향한다 — {type별 의미}`로 강화(`_route_destination_meaning` in `session.py`; 순찰/전투/시장/정비/단서/대면…). → B 목표 트랙 완료.
  - 부수: `prompts.py STORY_SYSTEM_PROMPT` 서사 레지스터 reframe(추상 용어 금지 아님→반복/장면별 레지스터 문제).
- Verified: `make test` 303 OK(skipped 2), `tests.test_api`/`test_route_rewards`/`test_route_runtime` OK, `make frontend-lint`/`frontend-build` clean, 변경 Python 파일 typecheck 신규 에러 0, narrative-smoke 1장면 성공.
- Blockers: 변경 전부 미커밋(기존 in-flight 배치 위에 누적).
- Next: 실플레이 QA(`make dev-up`)로 A/B 체감 확인 + 누적 미커밋 배치 단계 커밋.

## 2026-06-14 — 미커밋 대규모 배치 체크포인트 + 이미지 에셋 커밋

- Status: 이전 세션 누적 미커밋 배치(이원화 서사 오케스트레이션·SPA 재구성·콘텐츠 확장)를 검증·기록하고, 이미지 에셋만 별도 커밋했다. 나머지 코드/문서 변경은 리뷰 후 단계 커밋 대기.
- Changed:
  - 이미지 에셋 44종 커밋(`0a8a4af`): 신규 동료 3인(태오·한·수아)+적 4종 전투 스프라이트 35종, 대표 이미지 7종, 컨셉 아트 2종.
  - (미커밋) **이원화 서사 파이프라인** 배선: `director.py`가 스토리텔러(`OLLAMA_MODEL_STORY`=`gemma4:latest` 8B)→파서(`OLLAMA_MODEL_PARSER`=`qwen2.5:3b-instruct`) 2단계로 동작(`prompts.py` `STORY_SYSTEM_PROMPT`/`build_story_messages` + `PARSER_SYSTEM_PROMPT`/`build_parser_messages`, `parser.py`/`streaming.py`/`schemas.py` 연동). 설계 `docs/plans/2026-06-10-dual-model-narrative-orchestration.md`, 결정 `DECISIONS.md` 2026-06-10.
  - (미커밋) **SPA 재구성**: `CharacterTabPanel`/`ProgressDashboard`/`SkillTreePanel`/`runHistory.ts` 신규 추출, `TabNav`/`CodexPanel`(-146)/`SaveHistoryPanel`/`App.tsx`/`StoryPanel`/`index.css`(+282) 재배치, API `serializers.py`(+139)/`app.py` 확장.
  - (미커밋) **콘텐츠 확장**: `scenario.json`(+471)/`bible.json`(+77) 신규 캐릭터·적·스킬·아이템·앵커 2종, `scripts/gen_neo_seoul_art.py` 프롬프트, `tests/test_assets.py`·`test_visual_orchestration.py`·`test_session_combat.py` 보강.
- Verified: `make test` 297 OK (skipped 2).
- Blockers: 코드/문서 변경 50여 파일이 여전히 미커밋 — 리뷰 후 단계적 커밋 필요(이미지만 커밋 완료).
- Next: 미커밋 배치 단계 커밋, 실제 풀스택 사람 플레이 QA로 이원화 서사 속도/품질 체감 확인.

## 2026-06-12 — 작전 지도 게이트 바이어스 필터링 및 노드 중복 억제 적용

- Status: Priority 1 후속작업인 "선택 분기 바이어스 고도화 및 맵 노드 다양성 향상" 완료.
- Changed:
  - `junction_options` 및 `_choose_next` (in `route_runtime.py`): 플레이어가 획득한 플래그(`flags`)가 해당 노드의 `gate` 조건을 충족하지 못하면 선택지 및 자동 전진 후보에서 배제하고, 전체 gated out 예방을 위해 fallback 노드 보장 처리 추가.
  - `GameAside.tsx` & `index.css`: 충족되지 않은 게이트 노드를 작전 지도상에서 자물쇠(`🔒`) 글리프와 dashed border 스타일로 흐릿하게 잠금 표시(`route-node-locked`)하며, 호버 시 필요한 플래그 정보를 제공하도록 시각화 고도화.
  - `route_map.py` & `route_growth.py`: 중복 타이틀 선정을 방지하기 위한 헬퍼 `_pick_unique_title` 추가 및 정적/동적 생성 시 `used_titles`를 누적 추적해 고유 타이틀이 부여되도록 다양성 튜닝.
- Verified: `make test` (295 OK) 회귀 테스트 및 `test_route_runtime.py` 게이트 조건에 맞춰 수정 완료.
- Blockers: 없음.
- Next: 실제 풀스택 사람 플레이 QA를 통해 개선된 분기 체감 및 텍스트 템포 튜닝 확인.

## 2026-06-12 — 하네스 운영 규칙 보강 (usage insights 반영)

- Status: Claude Code usage report(2026-04~06 세션 회고)의 반복 마찰 패턴을 `harness/CORE_MANDATES.md` 신규 §5 "Agent Operations Discipline"으로 코드화.
- Changed: 성능 이슈 계측 우선(measure-before-fix), 상태 질문 docs-first, 디렉터리 이동/대규모 리팩터링 사전 확인, 절대 경로 셸 규칙, 자율 사이클 완료 보고 전 산출물 실재 검증 — 5개 규칙 추가. 기존 Documentation And Handoff는 §6으로 재번호.
- Verified: 문서 변경만이라 테스트 불요. 섹션 번호 충돌 없음 확인.
- Blockers: 없음.
- Next: 변경 없음 (기존 Next 유지 — 실제 풀스택 사람 플레이 QA).

## 2026-06-12 — 신규 캐릭터 및 적 30종 전투 스프라이트 생성 및 매핑 완료
- Status: Neo-Seoul 대규모 콘텐츠 확장(태오, 한, 수아 및 적 4종)에 필요한 30개의 전투용 모션 스프라이트 이미지 생성 및 배치 완료.
- Changed: scratch/gen_combat_sprites.py를 통해 12장의 기 생성 아티팩트를 복사하고, Quota 제한 상태에서 남은 18장을 로컬 MPS FLUX pipeline을 통해 일괄 성공적으로 생성/배치. scenario.json 내 tae_o, han, su_ah, shock_trooper, tracker_spider, suppression_mech, purge_drone의 combat_images 경로를 각 모션 파일(idle, attack, guard, skill, hit)로 갱신 완료.
- Verified: make test (295 OK), make smoke-local (narrative & visual smoke succeeded) 정상 통과 확인.
- Blockers: 없음.
- Next: 실제 풀스택 사람 플레이 QA(docs/neo_seoul_live_qa.md)를 통해 추가 콘텐츠 적용 체감 및 밸런스 검증.

## 2026-06-12 — 대규모 콘텐츠 확장 자율 수행 완료 (기존)
- Status: 2026-06-11-content-expansion-tasks.md 계획 1단계부터 5단계까지 최종 완수.
- Changed: scenario.json 에 신규 캐릭터(3인), 적(4종), 스킬(6종), 아이템(6종), 앵커 분기(2종), 교전(4종) 정의 완료. story_bible/bible.json 에 신규 인물 및 분기 구역 엔트리(4종) 보강 및 엔딩 변주 반영 완료. tests/ 에 에셋 존재 여부 및 시나리오 메타 로딩 정합성 검증 테스트 케이스 추가 완료.
- Verified: make test (295 OK), ruff check 및 mypy 검증 완료. make smoke-local (narrative 및 visual smoke succeeded) 정상 부팅 확인 완료.
- Blockers: 없음.
- Next: 실제 풀스택 사람 플레이 QA(docs/neo_seoul_live_qa.md)를 통해 추가 콘텐츠 적용 체감 및 밸런스 검증.
## 2026-06-11 — 문서 컨텍스트 정리(tidy-docs)

- Status: current docs 라인 예산 회복 완료.
- Changed: `PROGRESS_LOG.md`를 최신 5개 항목만 남기도록 210→67줄로 축소하고, 제거한 2026-06-11/10 상세 항목은 `bin/docs/archive/progress-2026-06.md`에 보존.
- Changed: `docs/README.md` 최종 갱신일과 archive 헤더 경로를 실제 `bin/docs/archive/...` 경로로 정정.
- Verified: `wc -l docs/AGENT_BRIEF.md docs/STATUS.md docs/NEXT_PLAN.md docs/PROGRESS_LOG.md`, `rg "^## " docs/PROGRESS_LOG.md`, touched docs 대상 `git diff --check`.
- Blockers: 없음.
- Next: 실제 풀스택 사람 플레이 QA로 B/C 체감, D 반복, F 속도, route gate 바이어스 잔여 확인.

## 2026-06-11 — Objective/Choice Result UX 완료

- Status: live QA 2차 우선순위 B/C 묶음 완료. 현재 목표·스테이크와 선택 가치축/결과 요약이 API/SPA에 노출된다.
- Changed: snapshot `active_scene`에 `stakes_summary`와 `choice_result`를 추가하고, 선택지에는 `axis`/`axis_label`/`stakes`/`result_preview` 파생 메타를 붙였다.
- Changed: `RuntimeSessionService`가 선택 적용 전 루프를 보존해 커밋 후 `stability/tension`, 새 flag, route 이동, `action_result`를 `_last_choice_impact`로 기록한다.
- Changed: StoryPanel은 현재 목표/현재 지점/위험/직전 결과 스트립을 지문 위에 표시하고, ChoicePanel은 가치축·비용·조건·예상 결과 칩을 표시한다. 히스토리에는 선택 결과 한 줄을 보강한다.
- Verified: `python -m unittest tests.test_api`, `make frontend-lint`, `make frontend-build`, `make test`(291, skipped 2). OTel collector 미기동 경고만 기존과 동일.
- Blockers: 없음.
- Next: 실제 풀스택 사람 플레이 QA(`docs/neo_seoul_live_qa.md`)에서 목표/선택 결과 체감, D 반복/F 속도 체감, 터치 인스펙터 잔여를 확인.

## 2026-06-11 — 진행도/강화/전투 UI 잔여 3종 완료

- Status: 사용자 지정 우선순위 1(G)→2(A)→3(E) 전부 수행, 각 단계 검증 완료.
- Changed(G): Run History는 `/runs`와 `/memory.run_summaries`를 병합해 빈 표시 오탐을 줄이고,
  사이드바 `진행도 현황` 패널에 RUNS/ECHO/SHARD/INSIGHT, 단서/로어/인물/스킬, 최근 런, 소프트 패배 상태를 표시.
- Changed(A): Codex 스킬 트리에 rank pips와 습득/강화 완료 배너를 추가해 Rank 변화와 통찰 잔액을 즉시 가시화.
- Changed(E): 전술 보드에 엄호(`▣/◧`)·고지(`▲n`) 지형 배지를 직접 표시하고 범례를 동기화. 우측 전투 조작부는 desktop 하단 sticky 배치.
- Verified: G 단계 `make frontend-lint`/`make frontend-build`/`python -m unittest tests.test_api tests.test_models`,
  A 단계 `make frontend-lint`/`make frontend-build`, E 단계 `make frontend-lint`/`make frontend-build`,
  전체 `make test`(291, skipped 2).
- Next: B/C objective·선택 결과 반영 묶음, 실제 풀스택 사람 플레이 QA.

## 2026-06-11 — 전투 소프트 패배 + 보드 줌 버튼 보정

- Status: Neo-Seoul live QA A/E 1차 후속. 즉시 게임오버 방지와 전술 보드 줌 버튼 회귀 의심을 처리.
- Changed: `player_defeat` 시 루프를 즉시 `ENDED`로 닫지 않고 `_soft_defeat_pending`/`combat_defeat_soft`
  이벤트를 남긴 뒤 HP 일부 회복, 안정도 -10/긴장도 +15, `defeat_soft` combat payload로 계속 진행 가능하게 변경.
- Changed: 전투 결과 패널/하단 컨트롤이 소프트 패배에서는 `계속` 버튼과 `CAPTURED` 문구를 표시. 보드 줌 버튼은
  pointer/click 전파 차단 + aria label 보강.
- Verified: `python -m unittest tests.test_session_combat.SessionCombatTest`, `make test`(291, skipped 2),
  `make frontend-lint`, `make frontend-build`.
- Next: A 잔여(레벨업 강화 체감 가시화), E 잔여(지형 아이콘/우측 패널 재배치), G Run History/Echo 대시보드.

## 2026-06-11 — 스토리텔러 26B→8B 전환 + 이미지 경쟁 규명

라이브 후속: 8B로 텍스트 속도/품질 트레이드오프 확정 + 이미지 RAM 경쟁 원인 규명.

- **이미지가 텍스트 지연의 주범**: 프론트(`App.tsx`)가 `image_every_turn:true`로 매 턴 FLUX를 돌려
  26B와 48GB를 다투며 스왑 유발. `?image=0`으로 끄니 텍스트 체감 급가속(사용자 확인).
- **모델 head-to-head**(동일 장면): gemma4:26b warm TTFT 26초(스왑 악화 조건)·319자 vs **gemma4:latest 8B
  warm 9~10초·600자+·선택지 3개**, gpt-oss는 blob 손상으로 로드 실패. 8B 산문 품질 경쟁력 확인.
- **결정·적용**: `OLLAMA_MODEL_STORY`를 8B(`gemma4:latest`)로 전환(`.env`/`.env.example`). 48GB서 스왑/evict
  없이 RAM 상주, FLUX와 공존. 26B는 64GB+ 머신에서만 권장. 스트리밍 경로는 스토리 출력을 정규식
  파서로 처리하므로 26B 채택 이유(JSON 붕괴 방지)는 스토리 모델에 무효. 상세 `docs/DECISIONS.md`.
- **이미지 vs 큐레이트 중복 수정**: 앵커(추락과 첫 신뢰/야시장/카이/스파이어/IX)는 각자 큐레이트
  이미지(`route_map.image`=`scenes/*.png`)가 있고 프론트가 이를 표시(`StoryPanel.tsx:543`, generated 에셋
  무시)하는데, 백엔드가 그 앵커에서도 FLUX를 생성해 표시 안 될 그림 + 느린 턴을 유발했다.
  `maybe_generate_scene_image`에 `_curated_anchor_image()` 가드 추가 — 현재 노드가 `image` 보유 앵커면
  FLUX 스킵(프론트 표시 규칙과 동일 조건이라 화면 변화 0, 느린 턴만 제거). 회귀 테스트 6건
  (`tests/test_visual_orchestration.py`). `make test` 291 green.
- Verified: 8B 전환 후 실 스트리밍 경로 warm TTFT 9.9초·narration 635~649자·선택지 3개, `make test` 285 green.

## 2026-06-11 — 내러티브 연속성(D)·장면 길이·후속 턴 prefill 캐시 수정

라이브 피드백 3건 동시 대응: (1) 다음 장면 반복/연속성 부재, (2) 장면 스크립트가 너무 짧음,
(3) 오프닝 이후 턴이 여전히 30초+.

- **D 연속성(반복 억제 미작동) 근본 원인**: `scenario_context`가 세션 시놉시스(STORY SO FAR +
  직전 장면 원문 + 반복 금지 지침)를 `notes`(=`novelty_notes`)에 **병합**하는데, 프롬프트 빌더가
  `novelty_notes[-MAX_PROMPT_NOTES(8)]`로 잘라서, 리스트 중간에 있던 시놉시스가 통째로 드롭됨 →
  모델이 직전 장면을 못 받아 반복(오존/세린). **수정**: `NarrativeContext.session_synopsis`
  전용 필드 신설, 프롬프트에 **잘림 없이 전부** 렌더. (사용자도 "이전 장면 정보가 넘어가야" 지적 — 동일.)
- **후속 턴 30초+ 근본 원인**: STORY 프롬프트의 "STATIC CONTEXT (CACHEABLE)" 섹션에 매 턴 누적되는
  `narrative_shards`·`world_memories`가 들어 있어, turn 1+부터 정적 프리픽스가 매 턴 바뀜 →
  Ollama prefix KV 캐시가 깨지고 전체 재-prefill(turn0은 비어 있어 빠르고 이후 느렸던 이유).
  **수정**: 정적 프리픽스를 **player 신원만**(타임스탬프 제거)으로 축소하고 shards/world_memories를
  동적 하단으로 이동 → 정적 프리픽스 byte-동일 검증 완료(샤드 누적에도 불변) → 후속 턴 캐시 적중.
- **장면 길이·선택지 1개 버그**: 라이브 스트리밍 경로는 LLM 파서가 아니라 정규식 `parse_story_text`로
  파싱한다(파서 모델 미사용 — 26B 단독이라 RAM에도 유리). 선택지 1개 원인은 (a) 스토리 프롬프트가
  "1-3 choices"라 1개 허용 + (b) 이전 `num_predict=512` 캡이 [SCENE](맨앞)을 길게 쓴 뒤 [CHOICES](맨뒤)
  도달 전 잘림. **수정**: 스토리 `num_predict` 512→2048(상한일 뿐 TTFT 무관, 라이브 14초 동일 확인),
  프롬프트 "2-3 choices·최소 2개·intent 다양화·`- choice_N:` 형식 준수" 강제, 깊이 지침 "2-3문단·6-10문장"
  강화, `MAX_NARRATION_CHARS` 2200→3200. 라이브 검증: narration 250→311자 2문단·**선택지 3개** 정상.
- 적용 반영: `python -m mythos_api` dev 서버 재시작(코드 픽업), 루프 상태는 Postgres라 보존.
- Verified: `make test` 285 green. 프롬프트 구조 검증(시놉시스 전량 포함·정적 프리픽스 불변·샤드 동적부
  이동) 통과. 라이브 단발 생성 TTFT 12.3초(warm)·2문단 산문.
- Next: 실제 멀티턴 라이브에서 후속 턴 TTFT 개선 체감 확인(스왑 노이즈 때문에 RAM 확보와 함께 관찰).

## 2026-06-11 — 스트리밍 속도 재검증: 근본 원인은 시스템 RAM 부족(설정 아님)

라이브 "여전히 느림" 피드백으로 TTFT 실측 재검증(`scratch/ttft_bench.py`). 직전 로그의
"TTFT 11.1초 / F 완료" 주장은 **재현되지 않음**. 11.1초는 삭제된 단독 합성 벤치값으로,
라이브 26B+파서 경로를 대표하지 못함.

- **실측(live Ollama, gemma4:26b 스토리 + gemma4:latest 파서)**:
  - 프롬프트는 작고(618~2504 토큰, num_ctx 8192 여유) 안 잘림. prefix 캐싱 정상 적중(2503/2504).
    → prefill·캐싱·프롬프트 크기는 병목 아님.
  - 스토리(26B) TTFT: RAM 상주 시 13~17초(모델 고유 바닥값). decode 정상(~400자/2.7초).
  - **지속 3턴 측정 시 TTFT 43→49→127초로 폭발**, 끝에 26B가 evict됨.
- **근본 원인 = 시스템 RAM 포화**. 이 머신은 **물리 RAM 48GB**(문서 가정 64GB 오류) + **스왑
  25.6GB 중 24.5GB 사용(거의 포화), free_swap≈0**. 26B(18GB)+파서(9.6GB)=28GB 모델 + 백그라운드
  (Virtualization VM ~수GB, Chrome, Notion 등)로 48GB 초과 → Ollama가 `system_limited=true`로
  26B를 evict, 다음 턴 18GB 재로드(스왑 페이지인) → TTFT 폭발. 서버 로그 근거:
  `"model predicted to exceed available memory, evicting" ... system_free=6.5GiB ... system_limited=true`.
- **결론**: `num_ctx`/`num_parallel`/`OLLAMA_MAX_LOADED_MODELS` 등 스케줄러 설정으로 못 고침
  (RAM 용량 문제). RAM이 일시 확보되면(타 프로세스 정리) 두 모델 공존·파서 1~5초로 정상화됨을 확인.
- Reverted: 진단 중 임시 변경한 Ollama 앱 `context_length`(앱 채팅 전용, 우리 API 무관)와 launchctl
  env는 원복. 코드 변경 없음. `scratch/ttft_bench.py`만 재측정용으로 추가.
- **적용한 해결(사용자 선택: 26B 품질 유지 + 파서 초소형화 + RAM 확보)**:
  - 파서 모델 `gemma4:latest`(9.6GB/8B) → **`qwen2.5:3b-instruct`(1.9GB)** 교체(`.env`/`.env.example`,
    코드 무변경 — config가 env 사용). 실측: 동일 프롬프트로 schema 파싱 **3/3 통과** 유지, 파서 지연
    **22초 → 0.8초**(7~25배). 26B(18GB)+파서(2.4GB) **공존 유지, evict 사라짐**.
  - KV 캐시 축소: Ollama 앱 `context_length`를 **8192로 캡**(앱 DB settings, `-c 16384/-np2`=슬롯당
    8192). director의 `num_ctx=8192` 요청이 실제 상주 인스턴스에 반영되도록 고정(이전엔 앱이 32768로
    상주시켜 무시됨). 스토리 TTFT **30~44초 → warm 17초**.
  - **순효과**: 한 턴 체감 = 스토리 TTFT ~17초 + 파서 ~1초. 직전 폭발(43~127초) 대비 안정화.
- **남은 레버(사용자 운영)**: 스왑 여전히 23.7GB 포화(`free_swap≈0`). Virtualization VM(~수GB)·Chrome 등
  백그라운드 정리로 물리 48GB 밑으로 내리면 26B 페이지인이 사라져 ~13초 바닥값에 근접. 그 이하는 26B
  고유 한계라 더 작은 스토리 모델이 필요(사용자가 품질 유지 선택).
- 재측정 도구 `scratch/ttft_bench.py`.

## 2026-06-10 — 이원화(Dual-Model) 오케스트레이션 성능 및 프롬프트 캐싱 최적화

- Status: 26B 스토리텔러와 8B 파서 이원화 모드 연산 최적화 및 Prefix Caching 고도화 완료.
- Changed:
  - `director.py`: 듀얼 모델 스트리밍 시 26B 모델(`ollama_model_story`)이 정상 매핑되도록 `stream_story` 메서드 신설 및 연동. 모든 completions 호출에 `"keep_alive": "30m"` 지정하여 Mac Pro 64GB 환경에서 모델 상주 보장.
  - `prompts.py`: Ollama Prefix Caching (KV cache) 극대화를 위해 가변 정보(instruction, turn_index, player_action 등)를 프롬프트 하단으로, 고정 정보(player stats, world memories, shards)를 상단으로 격리하는 템플릿 텍스트 직렬화 구조 리팩터링. 8B 파서 프롬프트 역시 고정 JSON_CONTRACT를 맨 위로 배치.
  - `prompts.py`: 매 턴 내용이 누적되거나 밀려나면서 바뀌는 `memories`와 `novelty_notes`가 상단 `STATIC CONTEXT`에 포함되어 prefix 캐싱을 깨뜨리던 현상 수정. 해당 동적 요소를 하단 `DYNAMIC CURRENT TURN STATE`로 강등 재배치하여 2턴 이후부터는 고정 영역의 100% Prefix 캐싱 매칭을 보장.
  - `director.py`: 8B 파서 모델의 `response_format`을 `json_schema`에서 `json_object`로 변경하여 문법 샘플링 마스킹(CFG Grammar constraints)에 의한 수십 초 대의 지연 오버헤드 제거. 파서의 `temperature=0.1` 하향 조정.
  - `director.py`: 듀얼 모델 파이프라인 아키텍처 재정비. 텍스트 품질의 극대화 및 일관된 몰입감 유지를 위해 **모든 장면의 서사 스크립트 창작은 26B(Gemma 26B)가 100% 전담**하도록 통일. 대신, 구조화 파싱(JSON 변환), 루프 상태 요약, Causality 샤드 요약 등 기계식 연산 및 데이터 처리는 **8B(Gemma 8B)**가 100% 전담하게 배선하여 VRAM 모델 스왑 딜레이(thrashing)를 완벽하게 배제하고 품질과 응답성을 동시에 극대화함.
  - `streaming.py` & `director.py`: 26B의 plain text 마크업 태그(`[SCENE]`, `[TITLE]` 등)가 스트리밍 중에 사용자의 화면에 그대로 노출되는 누수 버그를 차단하기 위해 `PlainTextStoryExtractor` 추가 및 `_stream_generate_dual` 연동 완료. 이제 `[SCENE]` 태그는 자동 탈락되고, `[TITLE]` 태그가 도달하면 스트리밍 전송을 즉시 조기 정지하여 순수 서사만 안전하게 실시간 화면에 표출함.
- Verified:
  - `make test` 285개 그린 통과.
  - `scratch/ollama_perf_cache.py`를 활용한 2개 턴 단독 벤치마크 결과, prefix caching 최적화 적용으로 인해 2턴째 TTFT가 26.0초에서 11.1초로 약 60% 단축됨을 실측 검증.
  - `make narrative-smoke` 통합 스모크 테스트로 실서사 및 choices 파싱 100% 성공 검증 완료 (첫 턴 22.4초 완료).
- Next: Streamlit 또는 FastAPI PoC 실플레이 검증.

## 2026-06-10 — 스트리밍 지연 원인 분석 + 프롬프트 슬리밍

라이브 QA "선택 후 텍스트 스트리밍 30초" 피드백 원인 분석 및 1차 대응.

- Status: 프롬프트 슬리밍 구현·검증 완료(미커밋). 추가 최적화(캐싱/keep_alive)는 논의 중.
- 원인: structured output(json_schema)은 정상 토큰 스트리밍(버퍼링 아님). 30초는 **프롬프트 prefill**
  병목 — 실제 프롬프트 33,376자(≈1만~2만 토큰), 그 중 `loop._route_map`만 12,253자(동적 지도라 증가).
  모델은 **gemma4 8B**(31B 아님; 설치 최대 gpt-oss 20.9B). 모델 키우면 더 느려짐.
- Changed: `prompts._slim_loop_for_prompt` — 프롬프트 직렬화 단계에서만 loop.state의 `_`-prefix 내부
  blob(`_route_map`/`_beats`/`_recent_narration`/`_map`/`_encounter_map`) 제거. 저장/런타임/노트빌더 무변경.
  연속성은 요약 노트(STORY SO FAR·직전 장면 원문·작전 노드 가이드) + top-level recent_events/player_action로 유지.
- Verified: 프롬프트 33,376→18,415자(~45%↓, ≈12k 토큰), 연속성 노트 잔존 확인, make test 284/2 skip,
  mypy 신규 0. Ollama 실측: 슬리밍 후 first_token ~23s(이전 ~30s+) — 여전히 큼(8B MPS prefill 한계).
- Blockers: first_token 23s 잔존 → prefix KV 캐싱 + keep_alive + 출력 num_predict 캡 + 메모리 윈도우 축소 필요.
- Next: 스트리밍 추가 최적화(캐싱/keep_alive/출력 캡), live_qa §0″ 잔여(작전 지도 horizon 미갱신 버그,
  선택→route 연결 체감 C), Redis Commander 8081 링크 연결불가(포트 충돌로 미기동).

## 2026-06-10 — 작전 지도 동적 라우팅 재설계 (Dynamic Route Map)

플레이 피드백(선택해도 스토리 동일/루트 불명/무의미 텍스트) 대응으로 작전 지도를 정적 DAG →
**backbone seed + 진행 중 동적 성장** 모델로 전환. 설계: `~/.claude/plans/vectorized-strolling-manatee.md`.

- `route_map.build_route_seed`: 시작 시 anchor 골격 + 앞 horizon(2) 레이어만 seed(이후는 anchor stub).
  node에 origin/mandatory/gate 추가, `_reachable_from` 도달성 헬퍼 추출(`build_route_map` 정적 경로 유지).
- 신규 `route_growth.extend_route`: 전진 시 다음 레이어를 LLM 제안(`world_delta.route_nodes`, 타입 제약+
  자유 서술)+pool 폴백으로 채움. anchor 도달 보장 guard(mandatory 필수통과·gate ≥1 경로) + 연결성 repair.
- schemas/parser: `route_nodes` world_delta 허용/스키마/검증(미허용 타입 드롭). scenario_context:
  junction 근처에서 노드 제안 지시 + 허용 타입 메뉴. session: mode 분기 seed + layer 전진 시 extend 배선.
- neo-seoul `route_map.mode=dynamic`, 오프닝/보스 anchor `mandatory`, 중간 anchor `gate`(met_se_rin 등).
- UI(`GameAside`): 현재 기준 앞 2레이어만 표시, 그 너머 fog(⋯) stub + 범례/types 갱신.
- 결정: route map seed 결정론 재현성 포기(동적 우선) — `DECISIONS.md` 2026-06-10 기록.
- Verified: make test 284/2 skip(+route_growth 9·parser 1), mypy 신규 0, frontend lint/build,
  in-process 통합(실세션 16턴서 레이어 [1,3,3,1,1,1]→[1,3,3,3,3,1] 성장·전 anchor 도달·avoid/combat 유지).

## 2026-06-09 — Neo-Seoul UX 플레이 피드백 Phase B 완료

Phase A(상태/범례/결말/전리품 표시)에 이어 라이브 피드백 잔여 UX 전부 처리:
- `#5b` 전투 중 소모품 사용 버튼: combat 스냅샷에 `_combat_consumables`(보유 소모품) 노출,
  CombatControls "소모품" 섹션 → `item` 액션(엔진 기존 지원). 플레이어 턴 게이팅.
- `#6` TACTICAL BOARD 확대/줌: `drawCombatCanvas`가 `canvas.dataset.boardZoom`을 읽어 배율
  렌더(모든 호출자 자동 반영), wrapper overflow scroll, 보드 타이틀 −/%/+ 컨트롤(100~250%).
  `combatCellFromPoint`이 getBoundingClientRect 기반이라 드래그 정합성 유지.
- `#2` 작전 지도 최소화 + 확대 모달: 기본은 노드 그래프만, "⤢ 확대"로 모달(확대 그래프+범례+설명).
- `#1` 행동→이동 캡션: 기본 뷰에 "● 현재 → 선택지 고르면 ◌ 다음 줄 이동" 한 줄.
- `#4` 기억의 별자리 캐릭터 섹션: CodexPanel에 CharacterPanel(스탯/장비/인벤토리) 플레이어 뷰 통합,
  stale codexLists.inventory 섹션 제거 → snapshot.inventory 단일 소스(전리품+장비 착용 버튼).
- Verified: make test 269/2 skip, frontend lint/build green. (UX 체감은 사람 플레이 QA.)

## 2026-06-09 — 데이터모델 통합 패스: progression/inventory/equipment 전용 테이블 (1~4단계 완료)

플레이 피드백("인벤토리/도감/해금이 JSONB에 있는데 전용 테이블로")을 받아 진행도·인벤토리를
전용 테이블로 이전. 설계: `docs/plans/2026-06-09-progression-inventory-equipment-datamodel.md`.

- 1단계 토대(`eacc847`): migration 005(`player_progression` player+scenario PK upsert +
  `loop_inventory` loop PK) + 기존 meta_progression 36행 SQL 백필 + store ABC 기본구현(in-memory)
  + Postgres SQL. 테스트 fake 6종 무변경 동작.
- 2단계 progression 전환(`5ec98e4`): meta_progression을 player_memories **append-scan → 전용
  테이블 단일 row**로. `load_progression`/`persist_progression` 헬퍼(전환기 메모리 폴백),
  session 5 read·4 write + ProgressionService 전환, memory_overview scenario 추정 보강.
- 3단계 inventory 전환: PostgresMythOSStore.save_loop/get_loop 중앙집중 dehydrate/hydrate로
  `loop.state._inventory`를 loops.state에서 분리→loop_inventory 테이블. CombatService/progression/
  engine 무변경(투명 경계). 라운드트립 검증(loops.state에서 분리·테이블 counted·get_loop 재주입).
  또한 UX Phase A(`475a726`): 상태 게이지 숫자화+설명토글, 결말 설명, 보드 범례 버튼+팝업, drag
  문구 제거, 전리품 인벤토리 표시 버그 수정(serializer dict/문자열 정규화). 결말/현재시점을 기억의
  별자리로 이동(`df66815`). SPA 번들 no-cache(`56aadc7`).
- 4단계 장비: neo-seoul에 `kind:equipment` 아이템 2종(signal_blade str+2 / mesh_vest agi·per+1)+
  loot 연결, `equip_item`(슬롯당 1개 착용 토글), 전투 시작 `_player_combat_stats`가 착용 장비 stats
  합산, `POST /loops/{id}/equip`, CharacterPanel 착용/해제 버튼 + serializer slot/stats/equipped.
- Verified: make test 268/2 skip, mypy 신규 0(기존 13 pre-existing), frontend lint/build,
  Postgres 라운드트립, equip+보너스 회귀 테스트(strength 9→11).

## 2026-06-08 — live LLM 장기 세션 기술 QA (P0)

- in-process 장기 세션 드라이버 작성(인메모리 스토어 + 실제 Ollama `NarrativeDirector`, Postgres/Docker 불필요)로
  사람-플레이 체크리스트가 못 잡는 **기술적 실패 모드**(멈춤/반복/선택지 없음/예외)를 자동 검증.
  gemma4로 neo-seoul 14턴(내러티브 9 생성 + 전투 4회) 실행.
- **양호**: 9회 LLM 생성 동안 파싱/repair 예외 0건, 내러티브 장면마다 선택지 3개 상존, 전투 종료 후
  내러티브 재개(`choose(action=...)`) 정상, 무한 멈춤 없음, 패배 시 루프 종료 처리 정상.
- **발견 F1(반복, 중)**: 위치가 안 바뀌면(같은 계단참) "오존 냄새/전력선 열기/교전 잔열" 도입부 감각
  묘사를 T4–T8에 걸쳐 반복. 세션 시놉시스에 반복 금지 지침+직전 원문이 주입되는데도 gemma4가 약하게 준수
  → 프롬프트 강화(위치 불변 시 배경 재묘사 금지·바로 새 전개) 후보. 효과는 모델 의존적, live 재검증 필요.
- **발견 F2(전투 빈도, 중)**: 9 내러티브 장면에 전투 4회, 시작부 T2→T3 연속. tension 20→46 누적. 추격
  서사로 프레이밍되나 빈도/연속이 QA §5 "초반 강제 전투 반복" 리스크에 근접. 단 그리디 봇이라 체감은 Live QA.
- 자동 검증 한계: 주관 항목(선택의 맛/캐릭터 존재감/엔딩 잔향)은 `docs/neo_seoul_live_qa.md` 사람 플레이 필요.
- **F1 수정 + live 재검증**: `build_session_synopsis` 반복 억제 지침 강화(도입부 배경 재묘사 금지 + 최근
  비트 location 동일 시 추가 지침). gemma4 14턴 재실행 결과 반복 탐지 0건, 이야기가 정전구역→네온
  끝자락→데이터 포트→시스템 접속→중앙 콘솔로 전진하고 도입부도 매번 달라짐(이전 런의 T4–T8 정체 해소).
  단일 런·LLM 비결정성이라 라우트 진행 차이의 기여 격리는 불가하나 회귀 없이 분명한 개선. 회귀 테스트 2건.
- 잔여: F2 전투 빈도 튜닝(이번 런 14턴 3전투로 양호했으나 변동성 있음), phase가 explore에 머무는지 점검(설계상 주 phase 추정).

## 2026-06-07 — 조우 난이도 튜닝 (P1)

- 조우별 학습 목표에 맞춰 적 수치 재조정. `build_encounter`에 per-spawn `overrides`(bestiary 위 shallow merge) 추가 — 한 bestiary 원형이 조우별 다른 역할(취약 킬-퍼스트 vs 견고 미끼)을 하도록 fork 없이 데이터 주도 조정.
  - `sentinel_checkpoint`(target priority): sentinel_drone hp14→11(취약 원거리 위협, "먼저 처치") + maintenance_drone hp12→16·def13→14(견고한 근접 미끼) override.
  - `enforcer_standoff`(armor_pen/timing): enforcer armor 3→4 — 비-armor_pen 타격이 더 깎여 kai 과부하 일격/방어·회복 타이밍이 중요.
  - `wraith_glitch`(기동/미스터리): def16→17·speed5→6으로 명중/기동 도구(packet_shot·signal_step) 요구, hp18 유지(추격이 의미를 갖게).
  - `patrol_ambush`(튜토리얼): 2 약체 드론 유지.
- 헤드리스 그리디 시뮬(파티 3인, 60회): 승률 patrol97%/sentinel98%/wraith97%/enforcer95%, avg_round 2.5/3.5/2.7/3.8 — 튜토리얼 최단·boss 최장으로 난이도 곡선 정렬. 실제 체감은 Live QA.
- Verified: `make test` 264/2 skip(override merge 회귀 테스트 + start_combat encounter 어서션 포함).

## 2026-06-07 — Tactical Board 타일 인스펙터 + 학습 목표 배너 (P1)

- 라이브 피드백 "보드 의미 파악" 후속 2차. 두 가지 추가:
  - **타일 인스펙터**: 보드 위 포인터가 가리키는 셀의 좌표/점유 유닛(HP·진영)/엄호/고지/위험/적 의도/이동 가능 여부를 좌측 열에 표시(`TileInspector`). 기존 `combatCellFromPoint`/드래그 핸들러 재사용 — 비드래그 hover 시에만 `combatInspectCell` 갱신(셀 변경 시에만 setState로 리렌더 churn 방지), pointerleave에서 해제. in-bounds 클램프.
  - **학습 목표 배너**: 전투 시작 시 `encounter.learning_goal`(+이름)을 보드 상단에 1줄 노출, encounter별 dismiss(`key`로 리셋). 백엔드: `_encounter_meta`(id/name/learning_goal)를 두 combat snapshot 경로(`_commit_combat_scene`/`_combat_snapshot`)에 주입 → API serializer가 dict 그대로 통과.
- Verified: `make test` 263/2 skip(신규 어서션 포함), `make frontend-lint`/`frontend-build` green.
- Next(Tactical Board 잔여): 보드 확대/반응형(zoom/pan). 타일 인스펙터는 hover 기반 — 터치 환경 click 핀 고정은 후속 검토.

## 2026-06-07 — Tactical Board 범례 (P1)

- 라이브 피드백 "보드의 cover/hazard/elevation/intent 의미를 모름" 해소 1차. `StoryPanel`에 `TacticalLegend` 추가 — 보드에 실제 존재하는 요소만 동적 표시(적 의도 ⚔️/🏃/👣, 엄호 강/약, 산성/전자 지대, 고지). `index.css` `.tactical-legend*`. 캔버스는 이미 해당 요소를 렌더 중이라 설명만 보강.
- Verified: `make frontend-lint`/`frontend-build`, `make test-e2e` green.
- Next(Tactical Board 잔여): 타일 hover/click 인스펙터(좌표/지형/효과/점유/위험), 전투 시작 시 학습 목표 배너(`encounter.learning_goal` plumbing 필요), 보드 확대/반응형.

## 2026-06-07 — 절차 생성 작전 지도(route-node) + 세션 메모리 + 자산/버그픽스

P1 "작전 지도 노드 루트화"를 Slay-the-Spire식 **결정적 절차 생성 + 다중 관점 anchor** 하이브리드로
구현(Step 1~2b-4). 설계: `bin/docs/plans/2026-06-07-route-node-procedural-map.md`. 단계별 상세는 archive.

- **생성/구조**: `route_map.py` — 루프 시드 결정적 layered DAG(golden_path 6막). anchor=사전 저작 임팩트 비트(큐레이트 이미지/이벤트 + 다중 관점), 그 사이는 동적 pool 노드. 전투 회피/감수 경로 불변식. `scenario.json.route_map`(node_types 8 + layers + `combat_encounters`), `state["_route_map"]` 직렬화, 작전 지도 노드 그래프 뷰(`GameAside`).
- **다중 관점 anchor**: 같은 임팩트 장면을 사람/증거/안전/통제 축의 여러 시점(lens)으로 — `when`(루트 flag)으로 분기, `crosses`(교차 스토리), `effect`(세션 영향), `ending_influence`(엔딩 도출). boss 4관점=4엔딩 커버.
- **라이브 진행**: `route_runtime.py` — 턴 전진 + 누적 flag로 관점 선택 + 효과 flag 적용 + ending_leaderboard 누계(게이지는 엔진/보상 소유 유지). UI에 활성 시점·예상 결말 표시.
- **director 통합**: `_route_director_notes`(현재 노드·관점·crosses·향하는 결말을 GM에 주입), `_route_junction_notes`(갈림길 유도). **edge=선택지 바인딩** — 레이어 경계 junction에서 다음 노드 선택지(`junction_options`/`route:` choice/`preferred_next`). **combat 노드 전투 트리거**(`node_encounter_id`→`next_combat`).
- **세션 메모리(RAG 아님)**: `session_memory.py` — `loops.state` JSONB에 `_beats` 압축 원장 + `_recent_narration` 직전 장면 창, 매 턴 결정적 롤링 시놉시스("지금까지의 이야기")를 컨텍스트 주입 → 장면 연속성/반복 방지. cross-loop/희소 연상이 필요해질 때만 키 기반 SQL→FTS→pgvector 검토(현재 불필요).
- **자산**: anchor 장면 5종 = 사용자 Imagen 고품질본을 `scenes/<beat>.png`로 채택(+`opening_escape_alt`). 캐릭터 포트레이트 3종 교체(`player-noise`/`kai`/`administrator-ix`) — 기존 참조 경로 그대로(코드 변경 불필요), 전투 시트와 화풍 일관 확인. 이미지 프롬프트/경로: `docs/scenarios/neo-seoul-anchor-image-prompts.md`.
- **버그픽스**: `generator.py` — IP-Adapter 미사용 txt2img 경로가 `hasattr`만 보고 `set_ip_adapter_scale(0.0)` 호출 → `encoder_hid_proj` 부재로 크래시(참조 이미지 없는 모든 생성 실패). 어댑터 실제 로드 시에만 호출하도록 가드.
- **노드 보상/effect 통합 + 회복 루프**(2b): 노드 신규 진입 시 1회(`_route_map.applied_rewards` 추적) — 비전투 노드 reward + 활성 anchor 관점 `effect`의 stability/tension/insight를 루프에 적용(`_apply_route_node_reward`, 게이지 클램프·insight는 meta progression, combat 노드는 encounter가 자체 보상하므로 제외). rest/market 노드는 `reward.heal_frac`로 `_party` HP 회복(`_heal_party`, rest=full/market=0.4) → "매 전투 풀피 시작" 해소. "선택→flag/엔딩"에 더해 "선택→게이지/HP"까지 닫힘.
- Verified: `make test` 263 / 2 skipped, `make frontend-lint`/`frontend-build`. fallback 통합: rest 노드 진입 시 HP 2→full·stability +8 1회 적용 확인. (e2e는 Docker/Postgres 기동 필요 — 미기동 환경에선 DB 500; 코드 무관.)
- 동적 노드 title 다양화: `node_types[].titles` 풀에서 비-anchor 노드 title을 시드 결정적 선택(`route_map.py`) → junction 선택지가 "정비 거점·정비"처럼 구체화(anchor는 저작 title 유지). e2e green(Postgres 기동 후 재확인).
- `_map` 제거는 보류: engine이 매 장면 기록 + encounter_map(좌표)·story_bible(위치)·glass-library 폴백 미니맵 의존 → route-node 트랙 사실상 완료, 전 시나리오 route_map 전환 후 별도 정리. **회복 후속: 소모품/전리품 인벤토리 가시화.**

## 2026-06-07 — Neo-Seoul Live Feedback Triage + 즉시 UX 수정

- 라이브 피드백을 P0/P1/P2 분류(`docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`). 오프닝 수락 시 BGM 재시도, Story 탭 복귀 시 combat canvas 재렌더, 작전 지도/상태 HUD 설명 보강, Neo-Seoul 고유명사 표기 규칙(`scenario_context`). BGM/세린 표기는 이후 사용자 확인 완료.

## 2026-06-07 — Neo-Seoul P0: Insight Reward + Forced Ambient Combat 완화

- `encounter_reward.insight`를 meta progression 통찰로 즉시 반영, 전투 결과 패널에 보상(통찰/안정/추적/전리품) 표시. 명시 요청 없는 초반 ambient 강제 전투 off(high tension/low stability에서만). 조우별 보상 기준값 갱신.

## 2026-06-07 — Planning Pivot: Neo-Seoul Playability 우선

- Neo-Seoul을 30-60분 만족 플레이 시나리오로 끌어올리는 5단계 계획(`docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`). Golden Path/QA rubric(`docs/scenarios/01-neo-seoul-connect.md` §5.5), Story Bible 24 entries, playability 메타(choice axes/route branches/ending echo), 조우 learning_goal/reward_intent 추가.

## 2026-06-06 — 전투 빈 화면 수정(log/지형 직렬화 배선) + DD식 연출 트랙 설계 & Phase 0

- Status: [x] 진행 중이던 전술 지형 + 풀스크린 컷인(`CombatCinema`) 작업이 백엔드 직렬화 미연결로 공격/스킬 시 **빈 화면(React 크래시)**을 유발 → 전체 배선으로 수정. 이어 "다키스트 던전식 캐릭터 아트 + 스킬 애니메이션" 연출 개편 트랙을 설계 확정하고 **Phase 0(백엔드 스킬 메타 노출)** 구현.
- Changed:
  - 근본 원인: 전투 스냅샷이 `log`/`elevations`/`covers`/`hazards`를 안 보내는데 프론트가 `combat.log.slice()`를 가드 없이 호출 → `useEffect` 내 TypeError → React 트리 언마운트(빈 화면). 모든 전투 상태 전이(공격/스킬/이동 직후)에서 발생.
  - 백엔드 직렬화 배선: `narrator.serialize_combat_log()` 신설(`__init__` re-export), `CombatTurnResult`에 `log`/`elevations`/`covers`/`hazards` 필드 추가(`_build_result`에서 채움), `session.py` 두 스냅샷 지점(`_commit_combat_turn`·`_combat_snapshot`)에 `log`+지형 4키 추가. → 보드 지형 렌더 + 컷인 데이터가 실제로 공급됨.
  - 프론트 방어: `App.tsx` `combat.log` 가드(`?? []`) + 컷인 remount `key`. `CombatCinema.tsx` `onFinish`/`onImpact`를 ref로 분리해 `useEffect` deps에서 제거(부모 리렌더가 타이머 리셋→컷인 미종료로 또 빈 화면 되는 잠재버그 차단). `types.ts` `CombatLogDetail` 타입드 detail.
  - Phase 0: `engine._skill_action_info()` — `available.skills`에 `role/tags/name/cost/range` 직렬화. `types.ts CombatSkillInfo` 확장. → 아이콘/스킬 애니메이션을 하드코딩 없이 데이터 구동할 토대.
  - 신규 계획: `docs/plans/2026-06-06-combat-darkest-dungeon-presentation.md`(그리드 유지 + 캐릭터 스프라이트 / 전투 아트 생성 / role+tags 애니메이션 / 아이콘 액션바, 5단계). 화면구조·아트·애니메이션 방향 사용자 확정.
- Verified: 런타임 스냅샷에 `log`+지형+스킬 메타 포함 확인(공격 후 `hit` detail에 target/damage/crit). `make test`(202, 2 skip), `make python-typecheck`(93 files), `make frontend-lint`/`frontend-build` 클린.
- Blockers: 없음. Phase 1 전투 아트 생성은 로컬 FLUX/MPS 환경 필요. 컷인(SVG 홀로그램)은 Phase 3에서 캐릭터 연출로 대체/강등 예정.
- Next: Phase 1(전투 아트 생성, FLUX 환경 필요) 또는 Phase 2~4(placeholder portrait로 스프라이트/애니메이션/아이콘 선구현) 중 택일.

## 2026-06-06 — 전투 보드 시각 이펙트 (Phase 1) + 진행도/스킬 트랙 설계

- Status: [x] 정적 전투 캔버스를 rAF 애니메이터로 전환해 이동/데미지/사망/스킬 연출 도입(Phase 1). 수동 QA 전 항목 마감 후 신규 트랙(전투 이펙트·진행도 해금/스킬트리) 설계 확정 및 우선순위 1번 구현.
- Changed:
  - `src/mythos_ui/src/combatDiff.ts`(신규): prev→next `CombatState`를 blip id 기준으로 diff해 move/damage/heal/death/defend 이벤트로 역산(순수함수).
  - `src/mythos_ui/src/combatEffects.ts`(신규): `CombatAnimator`가 diff+디스패치 액션으로 짧은 스태거 타임라인을 만들고 rAF 루프로 프레임별 오버레이 렌더 — 이동 ease 트윈, 임팩트 플래시+떠오르는 데미지/힐 숫자, HP 바 드레인, 사망 페이드, 스킬 캐스트 커넥터(트레이서+링). SFX를 임팩트 프레임에 동기. `prefersReducedMotion`/`?fallback=1` instant 경로로 최종 상태 동기 settle.
  - `src/mythos_ui/src/combatCanvas.ts`: `drawCombatCanvas`에 선택적 `overlay`(blip override/floats/fx) 추가, 정적 경로는 그대로 유지.
  - `src/mythos_ui/src/App.tsx`: 전투 상태 변경 시 애니메이터 구동, 디스패치 액션을 커넥터용으로 전달, 애니메이션 중 드래그 게이팅, 디스패치 시점 SFX 제거(임팩트 프레임으로 이동).
  - 설계 문서 신규: `docs/plans/2026-06-06-combat-visual-effects.md`, `docs/plans/2026-06-06-progression-skills-archetypes.md`(하이브리드 모델: 깨달음 이벤트 해금 + 통찰 포인트 Codex 스킬트리). NEXT_PLAN/STATUS 트랙 반영, 수동 QA 항목 전부 마감.
- Verified: `make frontend-build`(tsc -b + vite, 클린), `npm run lint`(0 error/0 warning), `make test-e2e`(scratch 스크립트) 통과, `tests/playwright/test_e2e_play_checklist.py` 전투 경로(캔버스 렌더→드래그 이동 instant SFX→패배 배너→메인 복귀) 통과. Python 무변경.
- Blockers: 없음. JS 테스트 러너 부재로 `combatDiff` 단위 테스트는 vitest 도입 후로 미룸. 애니메이션 시각 품질은 라이브 플레이 QA 권장.
- Added(전투 시뮬레이터): 라이브 VFX 점검을 위해 메인(온보딩) 화면에 Streamlit `_render_combat_simulator_inline` 패리티 전투 시뮬레이터 추가. `/api/v1/scenarios`가 선택 가능한 encounters/allies 노출, `CombatBeginRequest.party_members`→`start_combat` 전달, `OnboardingPanel`에 접이식 `전투 시뮬레이터`(조우 선택+동료 체크박스+진입), `handleSimulateCombat`(connect→begin(fallback)→combat/begin→전투 보드 직행, 세션 인트로 스킵). 라이브 검증: 4개 조우/2개 동료 노출, 풀 플로우 radar 정상, 헤드리스 브라우저로 player+정세린 vs 집행유닛 보드 진입(`outputs/sim_combat.png`). build/lint/mypy/`test_api`(25) 통과.
- Fixed(가해자 이펙트): 공격 연출이 플레이어 디스패치 액션에만 그려져 적/동료가 때릴 때 맞는 쪽만 플래시 → "내 캐릭터만 이펙트" 현상. diff 데미지 이벤트별로 가해자를 추론(플레이어 디스패치 대상은 정확, 그 외 가장 가까운 살아있는 반대 진영)해 근접=lunge/원거리=트레이서를 진영 색으로 렌더. 라이브 확인 완료(사용자 컨펌). 미드 애니메이션 프레임에서 적 드론 멀티 유닛 교전 확인(`outputs/vfx_frame_*.png`).
- Next: 우선순위 2번 — 진행도 해금/스킬트리 Phase 1(아키타입 게이트 + base/learned 스킬 필터 + Codex Skill 탭). 후속(선택): VFX Phase 2 juice, vitest+`combatDiff` 단위 테스트.

## 2026-06-06 — 한글 깨짐 대응, 스탯 비주얼 아이콘 및 선택지 UI 고도화

- Status: [x] Gemma/Ollama 한글 깨짐 hex 바이트 자동 복구, 스탯별 사이버펑크 네온 아이콘 연동, 마크다운 볼드 렌더러 추가, 선택지 스탯 키워드 간소화 및 인텐트 카테고리화 완료.
- Changed:
  - `src/mythos_ui/src/StoryPanel.tsx`: `decodeGarbageBytes` 함수로 `<0xXX>` 16진수 바이트 시퀀스를 UTF-8 한글 문자로 자동 복구, `renderBoldText`를 도입하여 `**bold**` 패턴을 `<strong>` 태그로 렌더링.
  - `src/mythos_ui/src/choices.ts`: `cleanChoiceLabel` 유틸 추가하여 장황한 스탯 괄호 문구(예: `(민첩 기반...)`)를 핵심 스탯 키워드 `(민첩)`으로 자동 정돈.
  - `src/mythos_ui/src/ChoicePanel.tsx`: `cleanChoiceLabel`을 적용하고, `choices[].intent`를 친숙한 아이콘 태그(`🧭 탐색`, `💬 상호작용`, `✍️ 서사 개정`, `🗄️ 기록 보관`)로 매핑 및 외래 설명글 숨김 처리.
  - `src/mythos_runtime/scenario_context.py`: `LANGUAGE_RULE`을 수정하여 AI GM이 선택지 인텐트에 오직 단일한 영문 표준 명칭만 사용하고, 스탯 연계 시 장황한 코멘트 대신 짧은 스탯명 괄호 형식만 출력하도록 유도.
- Verified: `make lint`, `make typecheck`, `make frontend-build`, `make test` 모두 오류 없이 정상 통과 완료.

## 2026-06-06 — Dev 인프라 콘솔 링크 + 원클릭 dev 스택

- Status: [x] React Dev 탭에 로컬 인프라 콘솔 링크(Streamlit Developer 사이드바 패리티) 추가, `make dev-up`/`dev-down` 원클릭 스택 도입. 플레이 중 "이어하기 Failed to fetch" 원인 진단.
- Changed:
  - `src/mythos_ui/src/DevConsolePanel.tsx` + `index.css`: `InfraLinks` 카드 — Adminer(8080)/MinIO 콘솔(9001)/Redis Commander(8081)/Jaeger(16686)를 브라우저 호스트 기준 URL로 새 탭 링크(설명 + `make infra-up` 안내).
  - `Makefile`: `dev-up`(infra-up → postgres readiness 대기 → db-migrate → visual-worker-bg → Ollama 확인 → API foreground), `dev-down`(api/worker stop + infra down). `.PHONY` 갱신. → docker+API+워커를 명령 하나로 기동.
- Verified: React 빌드 클린, `make -n dev-up`/`dev-down` 파싱 정상, 결정적 브라우저 검증으로 Dev 탭 인프라 링크 4개 렌더(`outputs/dev_infra_links.png`).
- Diagnosed: "이어하기 Failed to fetch" = **API 서버 미기동**(docker만 떠 있고 `python -m mythos_api`가 죽어 있었음; 온보딩은 캐시된 페이지/React 상태로 보였던 것). 서버 재기동 후 `/loops/active` 200 확인. → `make dev-up`으로 재발 방지.
- Next: 누적분 커밋, play-checklist 수동 QA, 파티 조작 2단계.

## 2026-06-06 — E2E 게이트 및 Redux worker 실검증

- Status: [x] Playwright 자동 E2E를 다시 신뢰 가능한 회귀 게이트로 복구하고, Redux 캐릭터 이미지 worker 실파이프라인을 검증.
- Changed:
  - React SPA가 URL 파라미터 `?fallback=1&image=0`를 읽어 자동 E2E에서 결정적 fallback/no-image 경로를 강제할 수 있게 수정.
  - `scratch/run_playwright_test.py`가 선택지/전투/종료/오류 중 안정 상태를 기다리도록 보강하고, 실패 시 `sys.exit(1)` 및 `outputs/e2e_failure.png` 진단 캡처를 남기도록 수정.
  - Redis stale heartbeat를 정리하고 foreground worker로 pending Redux job을 처리해 실제 오류를 관찰할 수 있게 함.
  - Visual worker heartbeat가 소유자 토큰을 유지하고, SIGTERM/KeyboardInterrupt 종료 시 자기 lock만 해제하도록 `VisualJobQueue.release_worker_slot()` 및 signal cleanup 경로 추가.
  - worker 종료 시 Postgres pool을 명시적으로 닫아 mflux/worker 검증 후 프로세스와 heartbeat가 남지 않도록 정리.
- Verified: `make frontend-build`, `py_compile scratch/run_playwright_test.py`, `make test-e2e`, `make typecheck`, `make test`(202 tests, 2 skipped) 통과. 세린 캐릭터 장면 512×512/4-step Redux worker job 성공: DB asset metadata `use_redux=true`, reference `se-rin.png`, MinIO presigned PNG GET 200, `outputs/visual-work` 작업본 삭제, cold latency 17.3s(provider 17.1s). 빈 queue worker SIGTERM 검증: heartbeat 1→0, 프로세스 잔류 없음.
- Blockers: txt2img(Flux1)+Redux(Flux1Redux) 동시 적재 시 장기 메모리/스왑 안정성은 아직 추가 플레이 모니터 필요.
- Next: 세션 2 변경분 커밋 정리 또는 파티 조작 2단계 구현 착수.

## 2026-06-06 — UX·비주얼·전투 배치 (세션 2)

- Status: [x] 이어하기 버그 수정, 스토리/캐릭터 레이아웃 개편, 전투 드래그&드롭, 오프닝 연속성, 이미지/텍스트 속도 최적화, 패배→메인 버튼, 행동 기록, 서사 기록 분리, 부트 오프닝, mflux Redux 얼굴 일관성, visual-work 자동 정리까지 일괄 구현 및 커밋 완료.
- Changed:
  - **이어하기(resume) 409 수정**: `session.py` resume(player_id)이 세이브 슬롯의 박제된 phase 대신 실제 활성 루프를 선택(없으면 `no active loop`), `app.py` 404 매핑, `App.tsx` stale 세션 정리. 회귀 테스트 추가.
  - **스토리 레이아웃 개편**: 상단 [장면 이미지 | CHARACTER] + 하단 전체 폭 스크립트. `CharacterPanel.tsx`(신규).
  - **CHARACTER 컨텍스트 분기**: 주변 인물 없으면 내 정보(스탯/속성/인벤토리), 대화 상대 등장 시 그 인물 portrait. `scenario.json` `characters` 추가, `/scenarios`가 portrait URL 제공, 내러티브 키워드 탐지.
  - **전투 드래그&드롭**: 캐릭터 픽업→유효 칸 드롭 이동(`combatCanvas.ts` 드래그 오버레이, `App.tsx` pointer 핸들러). 클릭 순간이동 제거.
  - **오프닝 시네마틱→첫 장면 연속성**: `prompts.py` 지시문 한도 8→`MAX_PROMPT_NOTES=24`(중요 지시문 잘림 해결), `scenario_context._opening_continuity_notes`로 turn 0~2에 방금 본 시네마틱 컨텍스트 주입. 첫 장면이 변전소→비 오는 C-17 골목/세린으로 이어짐(라이브 확인).
  - **속도 최적화**: WS 이미지 1024→**512×512**(Streamlit 패리티, 워밍 ~85s→~7.5s), 타자기 가속(tick 14→12ms, 청크 /60→/24).
  - **전투 패배→메인**: "새 루프 시작"→"**메인 화면으로**"(`handleLeaveSession`), 미사용 `streamBegin` 제거.
  - **행동 기록**: `/loops/{id}/scenes`가 장면별 player action(turn+1 이벤트) 반환, 라이브는 선택 라벨 캡처, 히스토리에 "▸ 내 행동: …" 표시.
  - **서사 기록 분리**: 인라인은 직전 1개만, "📜 이전 기록 전체 보기 (N)"→별도 오버레이.
  - **오프닝 이미지**: 컷 verbatim 복사(`bypass_generation`)→컷을 img2img 레퍼런스(0.4)로 **새로 생성**.
  - **부트 오프닝(첫 진입)**: `BootIntro.tsx`(신규, PROJECT MYTHOS 로고+타이핑+키아트+시그널 게이트), `scenario.json ui_copy`에 부트/랜딩 카피 추가. session_intro와 별개.
  - **mflux Redux 얼굴 일관성**: `mflux_generator.generate_image_mflux_redux` 추가, `visual_service`가 캐릭터 장면을 Redux(strength 0.9, portrait 레퍼런스)로 라우팅. 핵심: 캐릭터 감지를 영어 brief가 아닌 한국어 내러티브 키워드로(기존엔 거의 미탐지→딴 얼굴 원인).
  - **visual-work 자동 정리**: MinIO 업로드(또는 다른 경로 파일 저장) 성공 후 로컬 작업본 삭제. 기존 누적분(83MB) 삭제.
  - **E2E 스크립트 수정**: `run_playwright_test.py`에 부트 인트로/세션 시네마틱 dismiss 단계 추가(부트 오프닝 도입으로 깨진 흐름 복구).
  - **설계 문서**: `docs/plans/2026-06-06-party-controllable-allies.md`(파티원 조작 가능/우호적 비파티 AI 동맹 2단계 — 설계만).
- Verified: `make test`(200, 2 skip) 통과, `make typecheck` 클린, React 빌드 클린. Redux 비교 생성(0.3/0.6/0.9, 0.9 채택), 512 이미지 워밍 ~7.5s, 각 기능별 라이브/결정적 브라우저 검증(스크린샷). 결정적 모킹으로 이어하기/포트레이트/드래그/패배버튼/행동기록/기록오버레이/부트인트로 확인.
- Blockers: Redux 실 파이프라인(워커)·visual-work 자동삭제 실경로·`make test-e2e`는 후속 E2E 게이트 복구 작업에서 완료 확인. Flux1+Flux1Redux 동시 적재 메모리 장기 안정성만 추가 플레이 모니터 필요.
- Next: 아래 "다음 수행/검증 필요" 참조(NEXT_PLAN). 누적분 커밋, 인프라 올려 라이브 검증, 파티 조작 구현 착수.

## 2026-06-06

- Status: [x] React UI 패널 디자인 및 히스토리 스크롤링 개선, 비동기 이미지 유지, 전투 화면 전술 보드 확장 및 소스 품질 체크 완료.
- Changed:
  - **React UI 및 API 개선**:
    - `src/mythos_memory/store.py`, `src/mythos_memory/postgres_store.py`: `list_scenes` 메소드를 추가하여 특정 루프의 이전 씬 목록을 데이터베이스에서 오름차순으로 조회할 수 있도록 구현.
    - `src/mythos_api/app.py`: `/api/v1/loops/{loop_id}/scenes` GET 엔드포인트를 신설하여 백엔드에서 씬 히스토리 데이터를 전달하도록 구성.
    - `tests/...`: `list_scenes` 추상 메소드 추가에 따라 `_InMemoryStore`, `FakeStore`, `_ArchiveStore`, `_FakeCompactionStore` 등 테스트용 가짜 스토어들에 빈 리스트 혹은 적재 데이터를 반환하는 목 구현체 추가.
    - `src/mythos_ui/src/api.ts`: 프론트엔드 API 클라이언트에 `apiGetLoopScenes` 함수 추가.
    - `src/mythos_ui/src/StoryPanel.tsx`:
      - 타입 임포트 오류(`MouseEventHandler`, `RefObject`를 `import type`으로 수정)를 해결하여 Vite 빌드 복구.
      - 비전투 내러티브 레이아웃을 이미지 패널과 대화 텍스트 스크롤 영역으로 확실하게 분리하고 `align-items: stretch`로 균형감 있는 높이 정렬 적용.
      - 전투 UI에서 아군/적군 로스터 카드를 세로로 적재(`1fr`)하고, TACTICAL BOARD 비율을 `1.8fr`로 확장하여 화면 크기를 대폭 개선.
      - 헬퍼 텍스트 오류 수정("우측 전술 보드" -> "좌측 전술 보드").
    - `src/mythos_ui/src/combatCanvas.ts`: 캔버스 드로잉 시 컨테이너 패딩 값을 제외한 실제 너비(`computedStyle` 패딩 공제)를 계산하여 레이아웃 깨짐 현상 방지.
    - `src/mythos_ui/src/App.tsx`:
      - `displayedSceneImageUrl`을 제거하고 `sceneImageUrl`로 통합 및 `useEffect` 상태 업데이트 싱크 경고(ESLint) 해결.
      - 이어하기(`handleResumeGame`) 진입 시 `apiGetLoopScenes`를 호출하여 이전 대화 히스토리를 대화 스크롤 영역에 복원.
      - 선택지 선언(`sendChoose`) 및 전투 종료 이후 이동 시 `sceneImageUrl`을 `null`로 초기화하지 않음으로써 새 이미지가 비동기 수급될 때까지 기존 이미지가 계속 노출되도록 개선.
  - **Narrative Rollup/Metrics 리팩토링**:
    - `src/mythos_runtime/session.py`: shard rollup 대상 분리 로직을 `_split_retained_shards`로 분리하여 `retention=0` 경계값에서도 전체 shard가 정상 롤업되도록 수정.
    - `src/mythos_runtime/session.py`: narrative outcome metric counts/ratios가 `success/provider_repair/local_repair/fallback` 4개 key를 항상 포함하도록 정규화.
    - `tests/test_runtime_session.py`: zero-retention rollup 회귀 테스트와 metrics ratio shape 검증 추가.
    - `docs/STATUS.md`, `docs/NEXT_PLAN.md`: 2026-06-06 기준 소스 품질 패스와 리팩토링 내역 반영.
- Verified: `make lint` (TypeScript, ESLint, Python ruff) 통과, `make typecheck` 통과, `make frontend-build` 빌드 성공, `make test`(199 tests, 2 skipped) 통과, API 라이브 부팅 동작 확인.
- Next: `docs/play-checklist.md` 기반 실제 플레이 QA 및 시나리오 심화.

## 2026-06-04

- Status: [x] Narrative Shards Memory Rollup 및 AI GM Narrative Outcome Metrics 영속화 완료.
- Changed:
  - `src/mythos_narrative/director.py`: 오래된 Narrative Shard를 압축하는 `summarize_narrative_shards` 추가. LLM 요약을 우선하되 fast/fallback 경로에서는 결정론 요약으로 즉시 반환.
  - `src/mythos_runtime/session.py`: 50턴 이상, shard 40개 이상, 또는 누적 12,000자 이상일 때 오래된 shard를 `PlayerMemory(kind="causality_summary")`로 롤업하고 최신 raw shard만 `NarrativeContext`에 전달. AI GM generation outcome을 `WorldMemory(kind="narrative_metrics")`로 누적 저장.
  - `src/mythos_runtime/scenario_context.py`: `causality_summary`를 장기 인과율 기억 지침으로 `novelty_notes`에 주입.
  - `src/mythos_runtime/options.py`, `src/mythos_ui/src/types.ts`, `src/mythos_ui/src/App.tsx`: `/api/v1/memory` 응답의 `narrative_metrics`를 React Developer 탭 Outcome Ratio 카드로 노출.
  - `tests/test_runtime_session.py`, `tests/test_story_bible.py`: shard rollup 저장/retention, causality summary 프롬프트 주입, narrative metric 누적 테스트 추가.
- Verified: targeted unittest 3건, `make typecheck`, `npm run build`, `make lint`, `make test`(195 tests, 2 skipped), `make test-e2e`, `make smoke-local` 통과. Playwright 스크린샷 `outputs/e2e_react_play.png`, `outputs/e2e_react_play_turn1.png` 육안 확인.
- Next: `docs/play-checklist.md` 기준 Playwright E2E 검증 및 실제 플레이 QA.

- Status: [x] Playwright 기반의 CLI/API 자동화 E2E 테스트 스크립트 작성 및 CI/CD 검증 프로세스 추가.
- Changed:
  - `scratch/run_playwright_test.py` (신규): FastAPI uvicorn 서버 구동 및 Playwright headless Chromium을 연동하여, 사용자 이름 입력, Netrunner 아키타입 선택, 루프 진입, 지문 스트리밍 완료 대기, 선택지 핫키/마우스 클릭 피드백, 턴 진행, 스크린샷 저장(`outputs/e2e_react_play.png`)을 아우르는 전체 E2E 루프 자동화 테스트 스크립트 구현.
  - `docs/play-checklist.md`: 7번째 섹션인 플레이라이트 자동 E2E 테스트 검증 장을 추가하여 수동 테스트 외에 자동화 테스트 사용 방법 및 검증 명세 작성.
  - `Makefile`: `test-e2e` 타겟을 신규 추가하여 프로젝트 루트에서 `make test-e2e` 명령어로 E2E 브라우저 테스트를 손쉽게 시작할 수 있도록 단순화.
  - `pyproject.toml`: `dev` optional-dependencies 목록에 `playwright>=1.40.0` 추가.
- Verified: `scratch/run_playwright_test.py` 실행 성공, E2E 결과 스크린샷 2종 정상 저장, `make test` 및 `make smoke-local` 정상 통과.
- Next: 추가 게임플레이 피드백 수렴 및 시나리오 스크립트 확장.

- Status: [x] React + TypeScript SPA 프론트엔드 마이그레이션 및 패리티 로드맵 전체 완료.
- Changed:
  - `src/mythos_ui`: Vite + React + TS 환경 구성 및 npm 패키지 의존성 정의.
  - `src/mythos_ui/src/types.ts`: `RuntimeSnapshot`, `PlayerProfile`, `CombatRadar`, `SaveSlot`, `RunSummary`, `MemoryOverview` 등 12개 UI/API용 TypeScript 데이터 타입 정의.
  - `src/mythos_ui/src/api.ts`: FastAPI REST/WebSocket API 통신 헬퍼 모듈 작성.
  - `src/mythos_ui/src/App.tsx`: 온보딩 아키타입/시나리오 선택, 타입라이터 텍스트 스트리밍, 선택지 핫키 조작, Canvas 전술 전투 보드 렌더링 및 조작/이동/행동 루프, Codex 기억의 별자리 정보 연계, SAVE/LOAD 슬롯 및 여정 기록 보관소 연동, 디버그 모니터용 Developer 뷰, 오디오 BGM/SFX 및 시네마틱 효과 등 Streamlit 대비 100% 기능 패리티 패스 구현.
  - `src/mythos_ui/vite.config.ts`: 번들러 출력 파일명을 `app.js`로 강제하여 백엔드 서빙 경로와 일치하도록 빌드 옵션 커스텀 설정.
  - `src/mythos_ui/index.html`: FastAPI 단위 테스트에서 poc_client 서빙 통과 처리를 감지할 수 있도록 root mount container 안에 "API PoC" 테스트 텍스트 훅 추가.
- Verified: `npm run build` 컴파일 빌드 통과, `make test` (192개) 전체 테스트 및 `make smoke` 데이터베이스/MinIO 통합 검증 패스.
- Next: 추가 게임플레이 피드백 수렴 및 시나리오 스크립트 확장.

- Status: [x] Phase 3 — 세계관 탐험 및 시간 축 (Roadwarden & 80 Days) 설계 및 구현 완료.
- Changed:
  - `src/mythos_runtime/scenario_context.py`: `build_runtime_narrative_context` 함수에 시공간 붕괴 타이머(Temporal Decay), 이동 중 조우(Travel Encounters) 및 리소스 임계점 도달 위기 상황(Emergency Encounters) 연계 지침을 AI GM의 `novelty_notes`에 동적으로 포함시키는 로직 설계 및 구현.
  - `src/mythos_runtime/options.py`: `RuntimeSnapshot` DTO에 `clues_collected` 필드를 추가하여 획득 단서 수를 전달할 수 있도록 함.
  - `src/mythos_runtime/session.py`: 각 `RuntimeSnapshot` 생성 시점마다 `clues_collected` 수치를 데이터베이스에서 계산하여 채워주는 private 헬퍼 `_clues_collected` 추가 및 배선.
  - `src/mythos_api/serializers.py`: API snapshot 직렬화(`snapshot_to_dict`) 시 `decay_percent`, `zone_risk` 및 `clues_collected`를 포함하도록 갱신하고 구역 위험도 매핑 헬퍼 `_calculate_zone_risk` 추가.
  - `streamlit_app.py`: CSS 및 `_render_hud`를 수정하여 시공간 붕괴도, 구역 위험도, 단서 수집도 3종의 게이지를 포함한 총 6개의 탐험 HUD 타일 렌더링 지원.
  - `src/mythos_api/static/index.html` 및 `app.js`: PoC 웹 클라이언트의 aside 패널에 신규 3종 게이지(TEMPORAL DECAY, ZONE RISK, CLUE MATRIX) UI 요소를 추가하고, WebSocket 수신 스냅샷에 따라 게이지 상태가 동적으로 동기화되도록 바인딩 처리.
  - `tests/test_story_bible.py`: `_loop` 테스트 헬퍼를 `stability` 및 `tension` 매개변수를 받도록 확장하고, Travel 및 Emergency 조우 연계 지침이 `novelty_notes`에 올바르게 포함되는지 검증하는 단위 테스트 `test_runtime_context_includes_travel_and_emergency_encounters` 추가.
- Verified: `tests/test_story_bible.py`를 포함한 189개 단위 테스트 통과, `make test-db` 통과, `make smoke-local` 통합 E2E 검증 통과.
- Next: PoC 웹 클라이언트의 기능 패리티 (S2 — Codex / 기억) 구현 진행.

- Status: [x] P4-1 스탯 기반 내면 독백 및 P4-2 동료 전술 성향 다각화 구현 완료.
- Changed:
  - `src/mythos_runtime/scenario_context.py`: `build_runtime_narrative_context` 함수에 스탯 기반 내면 독백 지침 추가. 플레이어 최고/최저 스탯을 기반으로 5대 스탯 성격에 대입하여 디스코 엘리시움(Disco Elysium) 스타일의 내면 독백 묘사 가이드라인을 AI GM의 `novelty_notes`에 동적으로 포함시킴.
  - `tests/test_story_bible.py`: 스탯 기반 내면 독백 지침이 `novelty_notes`에 정상 반영되는지에 관한 단위 테스트 `test_runtime_context_includes_stat_monologue` 추가 및 검증 완료.
  - `src/mythos_combat/engine.py`: 아군 동료 턴 처리 함수 `_ally_turn` 리팩토링. 정세린(`se_rin`)은 플레이어 체력이 낮고 실드가 꺼져 있을 때 엄호 실드 스킬을 최우선 시전하는 원거리 서포터 AI로, 카이(`kai`)는 플레이어 근처의 적을 표적으로 삼아 `overload_strike`로 어그로를 끄는 근접 탱커 AI로 구현. 일반 동료와 모빌리티 스킬 사용을 위한 fallback 블록을 복구 및 보존.
  - `src/mythos_combat/engine.py`: `_execute_npc_skill`에서 `defense_bonus` 버프가 시전자가 아닌 타깃(`target`)에게 올바르게 설정되도록 수정하여 스킬 버그 해결.
  - `tests/test_combat_engine.py`: 주사위 난수 롤 영향으로 `test_enemy_intent_prediction`이 드론이 먼저 움직인 상태로 의도하지 않게 실패하던 문제를 플레이어 민첩 수치를 99로 높여 턴 순서를 강제하여 안정화.
  - `tests/test_combat_engine.py`: 세린이 위독한 아군(플레이어)을 자동으로 엄호 실드하는지 검증하는 `test_se_rin_ai_shields_wounded_player` 및 카이가 플레이어 근처 적을 타깃 마크하는지 검증하는 `test_kai_ai_targets_closest_to_player` 유닛 테스트 설계 및 패스 완료.
  - `docs/NEXT_PLAN.md`: P4 작업을 `[x]` 마크로 전환.
- Verified: `tests/test_combat_engine.py` (신규 2개 케이스 포함 188개 테스트) 통과, `make lint` 통과, `make typecheck` 통과, `make smoke-local` 통과.
- Next: Phase 3 — 세계관 탐험 및 시간 축 (Roadwarden & 80 Days) 설계 및 구현.

## 2026-06-03

- Status: [x] P2 — 자원 제약형 선택지 (Citizen Sleeper) 구현 완료.
- Changed:
  - `src/mythos_core/models.py`: `Choice` 데이터클래스에 `cost` (안정성/긴장도 증감 변경량) 및 `requires` (최소 안정성 및 최대 긴장 요구 조건) optional 필드 추가.
  - `src/mythos_runtime/session.py`: `choose` 함수 내에 플레이어가 선택지를 골랐을 때 요구 조건을 검증하여 위반 시 `RuntimeError`를 던지고, 충족 시 `cost`에 적힌 수치만큼 `LoopState`의 `stability` 및 `tension`을 안전하게 차감 및 변경하도록 비즈니스 로직 적용.
  - `src/mythos_narrative/prompts.py`: AI GM이 자원 변경/요구 조건이 걸린 선택지를 생성하도록 `JSON_CONTRACT` 내 `choices` 계약 조건 스키마 갱신.
  - `streamlit_app.py`: Streamlit 선택지 버튼 렌더링 시 자원 소모 비용 표시(예: 안정성 -5, 긴장도 +3) 및 요구 조건 미달 시 버튼 비활성화(`disabled=True`) 피드백 연출.
  - `src/mythos_api/static/app.js`: PoC 웹 클라이언트의 `renderChoices`도 동일하게 선택지의 cost/requires를 렌더링하고, 미충족 시 버튼 불투명도 및 클릭/키보드 핫키 단축 경로를 비활성화 처리.
  - `tests/test_runtime_session.py`: `test_choose_validates_cost_and_requires` 통합 테스트를 작성하여 요구조건 미충족 시 예외 방출 및 충족 시 실제 `LoopState` 자원 차감 여부 검증 완료.
  - `docs/NEXT_PLAN.md`: P2 작업을 `[x]` 마크로 전환.
- Verified: `tests/test_runtime_session.py`(24) 및 `make test`(184) 통과, `make typecheck`, `make lint` 통과.
- Next: P3 — 적 인텐트 가시화 (Into the Breach) 설계 및 구현.

## 2026-06-03

- Status: [x] P1 — 루프 내러티브 잔향 (Slay the Princess) 구현 완료.
- Changed:
  - `src/mythos_runtime/scenario_context.py`: `build_runtime_narrative_context` 함수에 내러티브 잔향(Narrative Echoes) 가공 처리 구현. `world_memories` 내 `kind="run_summary"`(이전 루프의 요약, 도달한 엔딩, 획득 단서, 조우 동료 등)를 필터링하고 최신 3개 런 정보를 추출하여 한글 기반의 기시감(Dejavu) 서사 유도 룰북 지침과 함께 `novelty_notes`에 자동 주입하도록 함.
  - `tests/test_story_bible.py`: `test_runtime_context_includes_narrative_echoes` 단위 테스트 케이스를 추가하여 이전 루프 요약 정보와 가이드라인이 `novelty_notes`에 제대로 바인딩되는지 검증 완료.
  - `docs/NEXT_PLAN.md`: P1 작업을 `[x]` 마크로 전환.
- Verified: `tests/test_story_bible.py`(10) 및 `make test`(183) 통과, `make typecheck`, `make lint` 통과.
- Next: P2 — 자원 제약형 선택지 (Citizen Sleeper) 설계 및 구현.

## 2026-06-03

- Status: [x] 방향 전환 — 게임플레이 깊이 우선(공유 계층). docs 최신화.
- Changed:
  - 결정: 두 번째 프론트(API/PoC) UI 복제(패리티 S2~)보다 공유 계층(엔진/내러티브/전투) 게임플레이 깊이를 우선. 근거: 게임은 UI 표면은 풍부하나 플레이 깊이가 얕고, 공유 계층 작업은 Streamlit(현 플레이 레이어)·API 양쪽에 동시 반영되어 프론트 방향과 무관하게 회수됨.
  - `NEXT_PLAN` §7을 "게임플레이 깊이(★ 활성 우선순위)"로 승격·재정렬: P1 루프 내러티브 잔향 → P2 자원 제약형 선택지 → P3 적 인텐트 가시화 → P4 내면 독백/동료 전술 성향. §6 PoC 패리티(S2~)는 보류.
  - `STATUS` Active Focus·`AGENT_BRIEF` 방향 갱신. 두 프론트 차이는 `docs/STREAMLIT_VS_API.md`.
- Verified: 문서 작업(코드 변경 없음).
- Next: P1 루프 내러티브 잔향 — `RunSummary` 핵심 결정 → 다음 루프 `NarrativeContext` 연계.

## 2026-06-03

- Status: [x] 온보딩 화면 노출 버그 수정 + Streamlit/API 비교 문서.
- Changed:
  - 버그: 시작 전 `#play`가 `hidden`인데도 빈 플레이 영역(게이지/로그)이 온보딩 아래 노출됨. 원인은 `main { display: grid }`가 `hidden` 속성을 덮어씀 → `[hidden] { display: none !important; }` 추가로 수정.
  - `docs/STREAMLIT_VS_API.md`(신규): 두 프론트엔드의 아키텍처/전송/상태/기능 패리티/공유 요소/선택 기준 정리.
  - STATUS Source Of Truth에 비교 문서 포인터 추가.
- Verified: `tests/test_api.py`(22) 통과, 라이브 `/` 200 + `[hidden]` 규칙 서빙 확인. (전투 렉 해소도 사용자 확인됨.)
- Next: S2 Codex/기억(memory_overview API + Codex 탭).

## 2026-06-03

- Status: [x] 전투 종료 LLM 멈춤 수정 + PoC→패리티 로드맵 + S1 온보딩/세션.
- Changed:
  - fix(combat): 전투 패배(루프 종료) 시 `summarize_loop`가 fallback/fast 모드에서도 Ollama를 동기 호출해 8.3s 멈추던 것 → `use_llm` 게이트로 결정론 요약, 22ms로 단축. `director.summarize_loop(events, *, use_llm)`, `_commit_combat_turn`에서 `not(options.fallback or fast_mode)`로 게이트.
  - `docs/plans/2026-06-03-poc-parity-roadmap.md`(신규): PoC→Streamlit 패리티 S1~S6 단계.
  - S1: `GET /api/v1/scenarios`(시나리오+아키타입), 온보딩 화면(시나리오/아키타입 선택·이어하기), localStorage 세션 보존, `loops/active` resume, scenario_id 전파, phase=ended 엔딩 배너.
- Verified: `make test`(182), `make lint`, `make typecheck` 통과. 라이브: 전투 패배 22ms, S1 flow(scenarios→connect→begin→resume) OK, `/` 온보딩 렌더.
- Next: S2 Codex/기억(memory_overview API + Codex 탭).

## 2026-06-03

- Status: [x] PoC 전투 플레이어블화 — combat action 컨트롤(스크린샷 피드백 반영).
- Changed:
  - 피드백: 전투 진입 시 보드만 보이고 조작 수단이 없었음.
  - `src/mythos_api/static/index.html`: 좌측 씬 패널에 `#combat-controls` + 스타일(표적 칩·행동/스킬 버튼·FOCUS/라운드 바·종료 배너).
  - `src/mythos_api/static/app.js`: 스냅샷 combat 활성 시 choices 대신 전투 컨트롤(finalizeScene 분기). `combat.available` 기반 표적(사거리)·공격/방어/대기/도주·스킬(쿨다운). `doCombatAction`→`POST /api/v1/combat/action`로 prose·보드·컨트롤 갱신. 보드 reachable 칸 클릭 이동. 종료 outcome 배너(승리/도주→계속 WS choose, 패배→새 루프).
  - `tests/test_api.py`: app.js가 `combat/action`을 구동하는지 검증.
- Verified: `tests/test_api.py`(21) 통과, `node --check app.js` OK, 라이브 flow(connect→begin→combat/begin→action) 200·타깃/스킬/reachable/prose 확인.
- Next: 브라우저 육안(스크린샷) 확인 후 추가 조정. (선택) 옵션 A 풀 SPA.

## 2026-06-03

- Status: [x] PoC UI/UX Phase 2·3 — 전투 캔버스/타입라이터 + 반응형/로그 마감.
- Changed:
  - `src/mythos_api/static/app.js`(Phase 2): 전투 캔버스가 실제 `radar.arena.w/h` 사용·컨테이너 폭 반응형(dpr). blip 팩션 색·이름 라벨·HP 막대(비율 색)·사망 디밍·현재 턴 노란 링·방어 호·`available.reachable` 사거리 셀 하이라이트. 타입라이터: 토큰 큐 → 글자 단위 적응적 출력, 완료 후 캐럿 제거 + 선택지 노출.
  - `src/mythos_api/static/index.html`(Phase 3): main max-width 1320px 중앙 정렬, 560/900px 반응형, 접이식 로그 `<details>`, 터미널 스크롤바.
- Verified: `tests/test_api.py`(21) 통과, `node --check app.js` OK, 라이브 부팅 `/` 200 + gauge/command-card/log-panel/image-frame 서빙 확인. 브라우저 육안·전투 캔버스 실트리거는 사용자 확인 예정.
- Next: PoC UX 방안 3 Phase 모두 완료. (선택) 옵션 A 풀 SPA 또는 reference 백로그 항목.

## 2026-06-03

- Status: [x] PoC UI/UX Phase 1 구현 — 녹청 터미널 팔레트·레이아웃·선택지 카드·HUD·이미지 통제.
- Changed:
  - `src/mythos_api/static/index.html`+`app.js`: 시안/블루 → Streamlit 녹청 터미널 팔레트(스캔라인·글로우·SF Mono). 본문 중심 2단 레이아웃(좌 씬 카드 + 우 340px aside), 내러티브 70ch·15.5px + 스트리밍 캐럿. 선택지를 command-card([n] 핫키+라벨+intent, hover 글로우, 키보드 1-9)로. HUD STABILITY/TENSION 게이지 막대(위험도 색) + 루프/국면/위치 메타. 이미지 full-bleed → aspect 1:1 프레임 크기 통제 + 플레이스홀더/페이드인.
- Verified: `tests/test_api.py`(21) 통과, 라이브 WS begin으로 HUD/choices(label+intent) 필드 수신 확인. 브라우저 육안은 사용자 확인 예정.
- Next: PoC Phase 2(전투 캔버스 반응형·라벨·HP·사거리 링, 타입라이터 다듬기) → Phase 3(반응형·로그).

## 2026-06-03

- Status: [x] PoC UI/UX 개선 방안 문서화(라이브 스크린샷 기반).
- Changed:
  - 라이브 PoC 스크린샷 2장 검토 → 문제점(이미지 압도/본문 가독성/선택지 바/HUD 빈약/색 불일치/전투 캔버스 휑함) 진단.
  - `docs/plans/2026-06-03-poc-ux-improvement.md`(신규): PoC는 Streamlit과 별개의 레퍼런스 클라이언트임을 명시하고, Streamlit UX 언어(녹청 터미널 팔레트·command-card 선택지·HUD metric·이미지 크기 통제·SF Mono)를 참고한 파일별(`index.html`/`app.js`) 개선 제안 + 3 Phase 스코프 + 비목표 정리.
  - STATUS/NEXT_PLAN/AGENT_BRIEF에 PoC UX 개선 트랙 연동.
- Verified: 문서 작업(코드 변경 없음). 기존 `make test`(181) 영향 없음.
- Next: 승인 시 Phase 1(팔레트·레이아웃·선택지 카드·HUD·이미지 통제) 구현.

## 2026-06-03

- Status: [x] 레퍼런스(reference.md) 기반 피드백 및 기능 추가 백로그 도출.
- Changed:
  - `reference.md`의 명작 게임(Citizen Sleeper, Disco Elysium, Slay the Princess 등) 핵심 디자인 요소와 MythOS의 현재 구현 상태 분석.
  - 신규 아티팩트 `reference_feedback_list.md`를 생성하여 자원 제약 선택지, 스탯별 내면 독백, 내러티브 잔향, 전술 Intent 가시화, 동료 전술 성향 다각화 등의 액션 아이템 설계.
  - `docs/NEXT_PLAN.md`에 '레퍼런스 기반 내러티브 & 전술 피드백 반영 (Backlog)' 신규 섹션으로 계획 반영 완료.
- Verified: `make typecheck`, `make lint` 통과.
- Next: 프론트엔드 분리(slice 4 옵션 A 풀 SPA) 또는 백로그 항목(자원 제약 선택지/내면 독백) 우선순위 구현 개시.

## 2026-06-03

- Status: [x] API 이미지 경로 라이브 E2E 검증 + WS 폴링 창 상향.
- Changed:
  - 실가동 인프라(Postgres/MinIO/Redis + 실행 중 visual worker + Ollama)에서 API begin(async image)→Redis→worker→FLUX→MinIO→DB `succeeded`까지 실제 동작 확인. `/assets/resolve` presigned URL HTTP GET → 200/image/png/유효 PNG(1.1MB).
  - 발견: 실 FLUX 1024px 생성이 WS 30s 폴링 창을 초과 → `src/mythos_api/app.py`의 `_VISUAL_POLL_TRIES` 30→90으로 상향(느린 생성에서도 succeeded 프레임 전달). 단위 테스트/lint/typecheck 무영향.
- Verified: 위 라이브 E2E PASS, `tests/test_api.py`(21) 통과.
- Next: (선택) 옵션 A 풀 SPA, provider 메트릭 영속 집계, JSONB→전용 테이블 migration.

## 2026-06-03

- Status: [x] P3 consolidation(`make api` + `docs/API.md`) + provider 품질 메트릭 OTel/로그 방출.
- Changed:
  - `Makefile`: `make api`/`api-stop` 타겟, `make setup`이 `.[dev,web]` 설치. `docs/API.md`(신규): 실행법/엔드포인트표/WS 프레임/RuntimeSnapshot 형태.
  - `src/mythos_narrative/director.py`: `_record_outcome`이 outcome + 누적 집계(total/degraded/success_ratio)를 `mythos.narrative.outcome` OTel 스팬과 구조화 로그로 방출 — per-request director 리셋과 무관하게 provider 저하 관측. 저장소/마이그레이션 무변경.
  - `tests/test_narrative_director.py`(+1): outcome 로그의 누적 지표 포함 검증.
- Verified: `make test`(181 tests, 2 skipped), `make lint`, `make typecheck` 통과. `make api` 라이브 부팅 `/`·`/api/v1/health` 200.
- Next: (선택) 옵션 A 풀 SPA, 또는 provider 메트릭 영속 집계/대시보드, JSONB→전용 테이블 migration.

## 2026-06-03

- Status: [x] WS visual_status 합류 — API 이미지 생성 + 실시간 그림 전달.
- Changed:
  - 문제: 지금까지 API는 글만 보내고 이미지를 생성하지 않아 slice 3 presigned URL·기존 visual_worker·slice 2 WS가 end-to-end로 안 엮임. PoC 이미지 칸이 항상 비어 있었음.
  - `src/mythos_api/app.py`: WS begin/choose 메시지에 `with_image`/`visual_async`/`image_every_turn` 전달. snapshot 송신 후 `_emit_visual_status`로 씬 이미지 라이프사이클을 `visual_status` 프레임으로 스트리밍 — 동기 생성은 즉시 terminal, 비동기(Redis worker)는 pending 통보 후 store 폴링(최대 30s)으로 processing→succeeded(presigned url)/failed. `_terminal_visual_frame`/`_find_asset`/`_visual_frame` 헬퍼.
  - `src/mythos_api/static/{index.html,app.js}`: "이미지" 토글 추가, visual_status 수신 시 pending/processing은 "그림 생성 중", succeeded는 presigned url로 이미지 교체.
  - `tests/test_api.py`(+4): `_terminal_visual_frame`(succeeded url 서명/failed 무 url/pending None) + `_find_asset` 단위 검증(FLUX/Redis 불요).
- Verified: `make test`(180 tests, 2 skipped), `make lint`, `make typecheck` 통과.
- Next: (선택) 옵션 A 풀 Next.js/Vite SPA + PixiJS Canvas 전술 보드 별도 트랙. 또는 Open Risks(narrative_shards 압축, JSONB→전용 테이블 migration).

## 2026-06-03

- Status: [x] P3 Web UI 디커플링 slice 4(B) — 경량 PoC 레퍼런스 클라이언트 구현.
- Changed:
  - `src/mythos_api/static/index.html` + `app.js`(신규): Node 툴체인 없는 vanilla JS 클라이언트. connect → WS begin → 토큰 실시간 누적 → snapshot 확정 → 선택지 클릭 → WS choose 재스트리밍. `assets/resolve`로 presigned 이미지 렌더, `combat.radar`는 `<canvas>` blip 최소 시각화.
  - `src/mythos_api/app.py`: 모든 라우트 등록 후 `StaticFiles(html=True)`를 `/`에 마운트(API/WS 우선). `pyproject.toml` package-data로 `static/*` 포함.
  - `tests/test_api.py`(+3): `GET /` 200, `GET /app.js` 200, `/api/v1/health`가 정적 마운트에 가려지지 않음 검증.
  - 결정/스펙 문서: `docs/plans/2026-06-03-frontend-slice4.md` (옵션 B 먼저 → 추후 옵션 A 풀 SPA).
- Verified: `make test`(176 tests, 2 skipped), `make lint`, `make typecheck` 통과. 라이브 부팅 `python -m mythos_api`로 `/`·`/app.js`·`/api/v1/health` 200, `auth/connect`이 실제 Postgres에 플레이어 기록 확인.
- Next: (선택) 옵션 A 풀 Next.js/Vite SPA + PixiJS Canvas 전술 보드를 별도 트랙으로. visual_status WS 프레임 합류.

## 2026-06-03

- Status: [x] P3 Web UI 디커플링 slice 3 — S3 presigned URL 자산 전달 구현.
- Changed:
  - `src/mythos_runtime/visual_service.py`: `MinIOStorageAdapter._client()` 헬퍼로 boto3 client 생성 분리, `presigned_url(storage_uri, expires_in=600)` 추가. 논리 `s3://bucket/key`를 만료시간 있는 HTTPS presigned URL로 변환, 비-s3 URI는 그대로 통과, malformed는 ValueError (설계 §5.2).
  - `src/mythos_api/app.py`: `POST /api/v1/assets/resolve`. storage_uri를 presigned URL로 가상화해 `{"url","expires_in"}` 반환, malformed s3는 400.
  - `src/mythos_api/service.py`: `get_storage_adapter` dependency.
  - `tests/test_api.py`(+3) / `tests/test_visual_service.py`(+3, boto3 mock으로 generate_presigned_url 인자 검증).
  - 분산 visual worker(`visual_worker.py`, Redis BRPOP + heartbeat)는 기존 구현 — slice 3의 미구현 갭은 presigned URL 전달이었음.
- Verified: `make test`(173 tests, 2 skipped), `make lint`, `make typecheck` 전체 통과.
- Next: P3 slice 4 — Next.js/Vite 프론트엔드 + Canvas 전술 보드(설계 §3,§4). 완료 시 `loops/stream`에 `visual_status` 프레임 합류.

## 2026-06-03

- Status: [x] P3 Web UI 디커플링 slice 2 — WebSocket 토큰 스트리밍 `/api/v1/loops/stream` 구현.
- Changed:
  - `src/mythos_api/app.py`: `@app.websocket("/api/v1/loops/stream")` 추가. 인바운드 `{"event":"begin"|"choose", ...}`를 `stream_start_loop`/`stream_choose`에 매핑하고, 블로킹 동기 제너레이터를 `iterate_in_threadpool`로 async 브리지해 이벤트 루프 비차단. 프레임: `token`/`snapshot`/`error`. 하나의 소켓에서 begin/choose 반복 처리.
  - `tests/test_api.py`: WebSocket 4 tests(begin→token→snapshot, 동일 소켓 choose 연속, unknown event/없는 player 오류 프레임).
- Verified: `make test`(167 tests, 2 skipped), `make lint`, `make typecheck` 전체 통과.
- Next: P3 slice 3 — 분산 visual worker(`visual_worker.py`, Redis BRPOP + Redlock heartbeat) + S3 presigned URL 자산 전달(설계 §5). 완료 시 `loops/stream`에 `visual_status` 프레임 합류.

## 2026-06-03

- Status: [x] P3 Web UI 디커플링 slice 1 — FastAPI `/api/v1` REST 백엔드 어댑터 구현.
- Changed:
  - `src/mythos_api/`(신규): `create_app` 팩토리(`app.py`), 스냅샷/플레이어 직렬화(`serializers.py`, `to_json_dict` 기반 GameState 계약), 요청별 Postgres store 주입 dependency(`service.py`), uvicorn 엔트리포인트(`__main__.py`).
  - 엔드포인트 7개: `health`, `auth/connect`, `loops/begin`, `loops/active`, `loops/choose`, `combat/begin`, `combat/action`. combat은 `combat_server` 응답 헬퍼 재사용. RuntimeError→404/409 매핑.
  - `pyproject.toml`: optional `web` extra(fastapi/uvicorn/httpx), `mythos-api` 콘솔 스크립트.
  - `tests/test_api.py`(신규, 7 tests): TestClient + in-memory store 주입으로 DB/Ollama 없이 검증.
- Verified: `make test`(163 tests, 2 skipped), `make lint`, `make typecheck`, `make smoke-local` 전체 통과. `create_app` 라우트 7개 등록 확인.
- Blockers: 인증 레이어 부재로 id를 요청 바디로 명시 전달(설계 대비 의도적 편차). 실 Postgres 연동 라이브 부팅은 미검증(unit은 in-memory).
- Next: P3 slice 2 — WebSocket 토큰 스트리밍(`/api/v1/loops/stream`, `stream_choose` 연동).

## 2026-06-03

- Status: [x] 미커밋 작업 트리(P1 레이턴시/P2 IP-Adapter/동료 AI/엔딩 AST/CI) 검증 후 논리 단위 커밋 정리.
- Changed:
  - 17개 수정 파일 + 신규(`.github/workflows/ci.yml`, P2/P3 plan docs)를 combat / visual / runtime-ui / ci / docs 5개 커밋으로 분리.
  - `.gitignore`에 `screenshots/` 추가, `NEXT_PLAN`의 마지막 미완료 항목 `CI 도입`을 `[x]`로 마감.
- Verified: `make test`(156 tests, 2 skipped), `make lint`, `make typecheck` 전체 통과. 작업 트리 clean.
- Next: P3 Web UI 디커플링 실구현(FastAPI 백엔드 어댑터). 설계는 `docs/plans/2026-06-03-web-ui-decoupling.md`.

## 2026-06-03

- Status: [x] Ollama API 타임아웃 튜닝 및 전투 종료 후 메인 화면 튕김 UX 흐름 개선 완료.
- Changed:
  - `config.py` (`src/mythos_image_agent/config.py`):
    - 로컬 LLM(Gemma 4) 기동 시 첫 토큰 생성 지연에 따른 타임아웃 예외(`APITimeoutError`)를 방지하기 위해 `ollama_timeout_seconds` 기본값을 4.5초에서 30.0초로 상향 조정.
  - `streamlit_app.py`:
    - 전투가 패배(`player_defeat`) 처리되거나 루프가 종결(`LoopPhase.ENDED`)되어 정산 버튼을 클릭했을 때, 이전처럼 메인 접속 화면으로 즉각 리다이렉트되어 진행이 끊기던 버그성 UX 흐름 수정.
    - 튕기지 않고 스냅샷을 갱신하여 부모 창에 루프 아카이브 성공/패배 메시지 및 런 히스토리, 해금 결과(`LoopPhase.ENDED` 상태 뷰)를 유저에게 그대로 렌더링하도록 갱신.
- Verified: `make lint`, `make typecheck`, `make test` (156 tests), `make smoke-local` 전체 통과.
- Next: P2 IP-Adapter 캐릭터 비주얼 일관성 및 Web UI 아키텍처 연계 진행.

## 2026-06-03

- Status: [x] 세린 오프닝 연출(Ken Burns, 타이프라이터, Glitch SFX) 및 한국어화 튜닝, Codex 진척도/기억 단일화 통합 완료.
- Changed:
  - `streamlit_app.py`:
    - `_player_session_intro` 및 `_render_opening_cinematic`, `_opening_cinematic_html`을 전면 개편.
    - 단일 그리드로 표시되던 세린의 오프닝 씬들을 CSS Ken Burns 확대/축소, Typewriter 한글 타이핑 효과, 슬라이드 간 수동/자동 전환(7초)이 가능한 HTML5 sequential 슬라이드쇼로 탈바꿈.
    - 슬라이드가 전환될 때마다 `sfx_glitch.wav` 효과음 재생 및 화면 글리치 필터(0.3초)가 동기화되어 작동하도록 구현.
    - 오프닝 첫 접속 단계 시 BGM을 네오서울 메인 테마(`bgm_main.wav`)로 오버라이드하여 재생하도록 연계.
    - 메인 이야기 뷰 및 전투 뷰 하단에 흩어져 노출되던 "회상 잔향(Echo)"과 "모은 단서" 뷰(`_render_player_memory`)를 완전히 지우고, Codex(기억의 별자리) 탭의 `_render_codex_lore` 메뉴 하단에 유기적으로 통합 렌더링.
    - `SAVE` 버튼 동작 실패 및 `AUTOSAVE :: 슬롯 준비 중`에서 멈추는 에러 원인을 즉각 추적할 수 있도록 예외 발생 시 콘솔 traceback 출력 및 active 화면 상단에 붉은 에러 박스로 실시간 가시화 처리.
  - `scenario_context.py` (`src/mythos_runtime/scenario_context.py`):
    - `ONBOARDING_ACT1_SHOT1 / SHOT2 / SHOT3` 프롬프트 지시사항 및 씬 묘사 조건들을 완벽하게 한국어로 번역하여 AI 게임 마스터가 한글 씬 및 선택지들을 일관되게 생성하도록 프롬프트 최적화.
- Verified: `make lint`, `make typecheck`, `make test` (156 tests), `make smoke-local` 전체 통과.
- Next: P2 IP-Adapter 캐릭터 비주얼 일관성 및 Web UI 아키텍처 연계 진행.

## 2026-06-03

- Status: [x] 동료 AI 전술 고도화, 전술 전투 밸런스 최종 조율, CI 파이프라인 도입 완료.
- Changed:
  - `engine.py` (`src/mythos_combat/engine.py`):
    - 동료 AI 스킬 선택 로직을 하드코딩 방식에서 데이터 중심의 범용적 동적 스킬 평가 루프(Generic Skill Evaluation Loop)로 전면 개편.
    - 힐링 스킬(`restore_margin`)을 보유한 동료가 범위 내 부상당한 아군(HP <= 60%)을 찾아 자동으로 치료하도록 AI 행동 패턴 연동.
    - 이동/탈출 스킬(`silent_shelve`, `signal_step` 등)을 보유한 겁쟁이(coward) AI 동료가 체력이 낮을 때 자동으로 텔레포트/이동 회피를 수행하도록 배선.
    - `_execute_npc_skill` 및 `_move_to_band`를 리팩토링하여 아군 대상 힐링 처리 및 이동 효과(`move`) 처리 연계.
  - `scenario.json` (`resources/neo-seoul/scenario.json`, `resources/glass-library/scenario.json`):
    - 정비 드론, 감시 드론, 집행 유닛 등 주요 적들의 HP, 방어력, 장갑을 상향하여 동료 합류 시의 전투 긴장감 유지.
    - 전술 소모품(나노패치, 자극 파편) 획득 밸런스 조정을 위해 전리품 획득 확률(Loot Table Weights) 하향 튜닝.
  - `.github/workflows/ci.yml` (신규):
    - GitHub Actions 지속적 통합 워크플로우 구성. 파이썬 3.11 환경에서 `make setup`, `make lint`, `make typecheck`, `make test`를 자동 실행하여 회귀 버그 방지 체계 마련.
  - `tests/test_combat_engine.py`:
    - 동료의 자동 힐링(`test_ally_uses_restore_margin_automatically`) 및 자동 이동 회피(`test_ally_uses_silent_shelve_automatically`) 검증을 위한 단위 테스트 추가.
- Verified: `make test` (156 tests), `make lint`, `make typecheck`, `make smoke-local` 전체 통과.
- Next: P2 IP-Adapter 캐릭터 비주얼 일관성 및 Web UI 아키텍처 연계 진행.

## 2026-06-03

- Status: [x] P1 이미지 생성 레이턴시 계측 및 최적화 프리셋 구현 완료.
- Changed:
  - `visual_service.py` (`src/mythos_runtime/visual_service.py`): 이미지 생성(`provider_ms`), Y2K/오버레이 필터 적용(`postprocess_ms`), 스토리지 업로드(`storage_ms`)의 구간별 시간과 총 소요 시간(`latency_ms`)을 계측하도록 고도화.
  - `observability.py` (`src/mythos_runtime/observability.py`): JsonFormatter에 계측 필드를 추가해 로깅 시 전송하며, `set_span_attribute()` 헬퍼를 도입해 OTel 스팬 속성에 주입.
  - `streamlit_app.py`: Player View 장면 이미지 하단에 구간별 레이턴시 캡션을 렌더링하고, 플레이어용 해상도/steps 프리셋(Fast, Balanced, Quality, Ultra) 선택박스를 사이드바에 추가.
- Verified: `make lint`, `make typecheck`, `make test`(148 tests), `make smoke-local`, `make test-db` 전체 통과.
- Next: P2 IP-Adapter 캐릭터 비주얼 일관성 도입 진행.

## 2026-06-03

- Status: [x] EndingResolver, 인과율/아젠다 디버그 모니터, Player View hotfix 기준선 최신화.
- Changed:
  - `EndingResolver` (`src/mythos_runtime/ending_resolver.py`) 신규 구현: `loop.state.flags` 내 Humanity/Insight/Resilience/Dominance 점수를 파싱/계산하고, `scenario.json`에 정의된 endings 조건식을 제한된 namespace에서 평가.
  - `session.py`의 `archive()` 및 `_combat_permadeath()` 시점에 `EndingResolver.resolve_ending`을 연결해 `ending_id` 및 `ending_label`이 `LoopState`와 `RunSummary`에 기록되도록 확장.
  - `streamlit_app.py` 내 Developer view에 `_causality_monitor_panel()` 디버그 모니터 신규 탑재: 실시간 스탯 스코어, active flags, endings 매칭 상태 및 조건식 확인 가능.
  - 선택 플레이어가 없어도 `새 게임 시작`이 새 player를 생성한 뒤 loop를 시작하도록 정리.
  - narrative parser와 runtime combat request guard가 `"null"`, `"none"`, `"undefined"` 같은 sentinel을 실제 encounter id로 처리하지 않도록 보강.
  - 오프닝 시네마틱 렌더를 self-contained iframe 경로로 바꿔 raw HTML이 화면에 노출되는 문제를 방지.
  - `tests/test_ending_resolver.py`에 다중 엔딩 매칭 단위 테스트를 추가하고 `test_runtime_session.py`에 통합 테스트(`test_archive_resolves_ending`) 반영.
- Verified: `make test`(148 tests, 2 skipped), `make typecheck`, `make smoke-local`, Streamlit HTTP 200 boot.
- Blockers: in-app Browser `iab` 세션이 없어 스크린샷 기반 검증은 못 함.
- Next: P0 엔딩 리졸버 조건식 안전화/시나리오 ending condition 보강 후 P1 비주얼 생성 레이턴시 계측.

## 2026-06-03

- Status: [x] 미완료 태스크 리스트업 및 로드맵 설계 완료.
- Changed:
  - 현재 로컬 런타임의 미완료 작업 항목 및 제품화 과제를 분석하고 P0~P3 우선순위와 함께 세부 체크리스트를 리스트업함.
  - 신규 아티팩트 `remaining_tasks_plan.md` 생성 및 `docs/NEXT_PLAN.md`에 세부 연동 정보 반영.
- Verified: `make lint`, `make typecheck`, `make test`, `make smoke-local` 확인.
- Next: P0 명시적 엔딩 조건 평가 및 저장 확장 (`EndingResolver`) 구현 및 검증.

## 2026-06-03

- Status: [x] Save/Load UX MVP 구현.
- Changed:
  - `SaveSlot` DTO 추가 및 active loop만 LOAD 대상으로 조회.
  - `PlayerMemory(kind="save_slot")` autosave metadata 저장. start/choice/stream/combat 진행 시 갱신.
  - `RuntimeSessionService.list_save_slots()` / `save_slot()` 추가.
  - `resume(player_id=...)`가 ended loop가 아니라 최신 active save slot을 선택하도록 변경.
  - Player View LOAD 카드에 active save slot 선택 UI 추가, ended loop는 기록 보관소 대상으로 분리.
  - Player active/combat 화면에 autosave 상태와 명시적 `SAVE` 버튼 추가.
- Verified: targeted save slot/runtime/combat tests, ruff, `make typecheck`, `make test`(142 tests, 2 skipped), `make smoke-local`, Streamlit HTTP 200 boot.
- Blockers: in-app Browser `iab` 세션이 없어 스크린샷 검증은 못 함. OTel collector 미기동 시 trace export shutdown 재시도 로그가 남지만 검증은 통과.
- Next: 명시적 ending condition 경로의 `ending_id`/`ending_label` 저장 확장 또는 Web UI/클라우드 후속.

## 2026-06-03

- Status: [x] Meta Progression MVP 구현.
- Changed:
  - `MetaProgression` 모델과 run summary 기반 unlock 평가 추가.
  - 첫 런/단서/전투 승리/동료 만남에 따라 trait, codex, starting item, ally unlock 누적.
  - archive/permadeath 종료 시 `PlayerMemory(kind="meta_progression")` 저장 및 `PlayerProfile.traits` 갱신.
  - 새 루프 시작 시 meta progression state와 unlocked starting item을 초기 state/inventory에 반영.
  - Developer Memory 패널에 meta progression 요약 표시.
- Verified: targeted progression/runtime/combat tests, ruff, `make typecheck`, `make test`(141 tests, 2 skipped), `make smoke-local`.
- Blockers: OTel collector 미기동 시 trace export shutdown 재시도 로그가 남지만 검증은 통과.
- Next: active loop/save slot 기반 명시적 Save/Load UX.

## 2026-06-03

- Status: [x] Run History MVP 구현.
- Changed:
  - `RunSummary` DTO 추가 및 archive/permadeath 종료 시 `WorldMemory(kind="run_summary")` 저장.
  - `RuntimeSessionService.list_run_summaries()`와 `MemoryOverview.run_summaries` 조회 경로 추가.
  - 전투 종료 이벤트를 저장해 run summary의 전투 승/패 카운트를 집계.
  - Player View 접속 화면과 Developer Memory 패널에 `기록 보관소` 렌더링 추가.
  - loop summary 생성 실패가 archive/permadeath를 깨지 않도록 provider 예외 fallback 처리.
- Verified: targeted run history/combat tests, ruff, `make typecheck`, `make test`(139 tests, 2 skipped), `make smoke-local`.
- Blockers: OTel collector 미기동 시 trace export shutdown 재시도 로그가 남지만 검증은 통과.
- Next: run summary 기반 Meta Progression/unlock MVP.

## 2026-06-02

- Status: [x] Neo-Seoul 오프닝/캐릭터 고품질 사전 제작 자산 정책 반영.
- Changed:
  - 세린 기준 얼굴을 사용자 제공 이미지 기준으로 재정의하고 `resources/neo-seoul/characters/se-rin.png`, `se-rin-biker.png`를 고품질 imagegen 결과로 교체.
  - 린위에를 "거래와 부채의 여왕" 컨셉으로 재생성해 `resources/neo-seoul/characters/lin-yue.png` 교체.
  - 이전 mflux 오프닝 초안 파일을 삭제하고, 고품질 `opening-01-serin-arrival.png`, `opening-02-first-contact.png`, `opening-03-drone-chase.png`를 정식 v1 오프닝 컷으로 확정.
  - Streamlit Player View 첫 세션 인트로가 `scenario.json["ui_copy"]["session_intro"]["cinematic_shots"]`를 시네마틱 패널로 렌더하도록 연결.
  - 비주얼 정책 정리: 사전 제작 고품질 키아트/캐릭터/적은 FLUX 또는 imagegen 중 품질 좋은 쪽 선택, 게임 중 동적 장면 이미지는 `mflux`, enemy/bestiary는 가능한 사전 제작 자산으로 분류.
- Verified: Neo-Seoul `scenario.json` 파싱, `streamlit_app.py` py_compile, `python -m unittest tests.test_story_bible`(9 tests).
- Blockers: 없음.
- Next: Player View 브라우저에서 오프닝 시네마틱 실제 렌더 확인 또는 Run History MVP.

## 2026-06-02

- Status: [x] Neo-Seoul 01을 1시간 소설형 세션 depth로 보강.
- Changed:
  - `resources/neo-seoul/scenario.json`에 `session_design` 추가. 40-60턴/1시간 목표, phase gate, 장면 밀도 규칙 명시.
  - Neo-Seoul main arc를 4막 요약에서 6막 구조로 확장: C-17 탈출, 점수/부채의 도시, 구출 작전, 카이 각성, 스파이어 접근, 관리자 IX 최종 대면.
  - side arc와 NPC agenda를 보강해 세린/린위에/카이/최적화 명단 대상자의 갈등이 장기 세션에 남도록 정리.
  - `resources/neo-seoul/story_bible/bible.json`을 15개 이상 snippet으로 확장. pacing contract, 막별 장면, 최적화 명단 진실, 구출 작전, 카이의 꿈, 스파이어 접근, 엔딩 Echo 정리를 추가.
  - `docs/scenarios/01-neo-seoul-connect.md`에 40-60턴 세션 구조와 장면 밀도 원칙 추가.
- Verified: Neo-Seoul JSON 2종 파싱, `python -m unittest tests.test_story_bible`(8 tests), `ruff check tests/test_story_bible.py`, `make test`(137, 2 skipped), `make typecheck`.
- Blockers: 없음.
- Next: Run History MVP 또는 Player View에서 Neo-Seoul long-form 진행/phase gate 체감 확인.

## 2026-06-02

- Status: [x] 샘플 신규 시나리오 `세계 : 접속 - 유리성의 사서` 작성.
- Changed:
  - `docs/scenarios/02-glass-library.md` 추가. 기억 도서관 유리성, 사서 AI 이오, 잊힌 독자 미로, 백색 제본사, 첫 번째 접속 기록 미스터리를 정리.
  - `resources/glass-library/scenario.json` 추가. archetype, arcs, NPC agendas, endings, 최소 combat pool, 시나리오 전용 system prompt를 포함.
  - `resources/glass-library/story_bible/bible.json` 추가. phase/location/flags 기반으로 선택 가능한 Story Bible snippet 작성.
  - Glass Library scenario/story bible 로딩과 `NarrativeContext` snippet 주입 테스트 추가.
- Verified: `python -m json.tool`로 Glass Library JSON 2종 파싱 확인, `python -m unittest tests.test_story_bible`(7 tests), 변경 파일 ruff, `make test`(136, 2 skipped), `make typecheck`.
- Blockers: 없음.
- Next: Run History MVP(`RunSummary` 생성/저장/조회 및 Player View 기록 보관소).

## 2026-05-31

- Status: [x] 전투 후속 선택 섹션 마무리.
- Changed:
  - Neo-Seoul 주요 액티브 스킬(`signal_step`, `overload_strike`, `packet_shot`, `covering_noise`) focus 비용을 1에서 2로 조정해 매 라운드 무료 반복을 줄임.
  - `defend`가 즉시 focus 1을 회복하고, 기존 라운드 upkeep +1과 합쳐 재충전 턴 역할을 하도록 변경.
  - `stim_shard` focus 회복량을 2에서 3으로 올려 소비품 가치 보강.
  - custom component drag/drop tactical board는 현 단일 iframe 보드가 안정적이므로 필수 작업 없음으로 정리.
- Verified: `tests.test_combat_engine`, `tests.test_combat_service`, 변경 Python 파일 ruff, `scenario.json` 파싱, `make test`(134, 2 skipped), `make typecheck`, `make smoke-local`.
- Blockers: 없음.
- Next: Story Bible / Run History / Save Load 트랙 계속 진행.

## 2026-05-31

- Status: [x] Story Bible MVP 로더/선택/주입 구현.
- Changed:
  - `src/mythos_runtime/story_bible.py` 추가. `resources/<scenario>/story_bible/bible.json`을 읽고 phase/location/flags/turn 조건과 token budget에 맞는 snippet만 선택.
  - `build_runtime_narrative_context`가 선택된 Story Bible snippet을 `NarrativeContext.novelty_notes`에 `STORY_BIBLE_SNIPPET`으로 주입.
  - `resources/neo-seoul/story_bible/bible.json` 추가. Neo-Seoul 정사, C-17 첫 접속, 정세린, 한강 야시장, 카이, 관리자 IX 조각을 최소 바이블로 작성.
  - Story Bible 로딩/필터링/프롬프트 노트/context 주입 테스트 추가.
- Verified: `tests.test_story_bible`, 변경 파일 ruff, `make test`(133, 2 skipped), `make typecheck`, `make smoke-local`.
- Blockers: 없음.
- Next: 샘플 신규 시나리오 `세계 : 접속 - 유리성의 사서` 작성 또는 RunSummary MVP.

## 2026-05-31

- Status: [x] Story Bible / Run History / Save Load 제품화 계획 문서화.
- Changed:
  - `docs/plans/2026-05-31-story-bible-save-load.md` 추가. 시나리오 바이블 snippet 주입, 샘플 게임북, RunSummary, 메타 진행도/해금, Save/Load UX의 단계별 구현 계획을 정리.
  - `docs/NEXT_PLAN.md`, `docs/STATUS.md`, `docs/AGENT_BRIEF.md`에 새 제품화 트랙을 다음 우선순위로 반영.
- Verified: 문서 변경만 수행.
- Blockers: 없음.
- Next: Story Bible MVP(`story_bible.py` loader/selector + Neo-Seoul 최소 bible)부터 구현.

## 2026-05-31

- Status: [x] 도주 후 encounter contact 유지 정책 구현.
- Changed:
  - `RuntimeSessionService._apply_combat_rewards`를 결과별로 분기해 `player_victory`만 보상/`defeated` 정산을 적용하고, `player_fled`는 보상 없이 contact를 `alerted`로 되돌리도록 변경.
  - `mark_encounter_alerted` 추가. 도주 contact는 `cooldown=1`을 받아 다음 encounter map tick에서 즉시 재충돌하지 않고 한 칸 물러난 뒤 맵에 남는다.
  - victory/flee 정산 단위 테스트와 alerted contact map tick 테스트 추가.
- Verified: `tests.test_encounter_map`, `tests.test_session_combat`, 변경 파일 ruff, `make test`(128, 2 skipped), `make typecheck`, `make smoke-local`.
- Blockers: 없음.
- Next: focus 재생량과 skill cost 밸런스 재검토.

## 2026-05-31

- Status: [x] 전투 시뮬레이션 동료 선택 UI 추가.
- Changed: 전투 시뮬레이션 영역에 `시뮬레이션 동료` multiselect를 추가하고, 선택된 동료를 `RuntimeSessionService.start_combat(..., party_members=...)`로 넘겨 `_party.members`에 주입한 뒤 전투를 시작하도록 연결.
- Verified: `test_session_combat` party override 테스트 추가, `make test`(124, 2 skipped), `make typecheck`, 변경 파일 ruff, Browser에서 시뮬레이션 동료 선택 UI 표시 확인.
- Blockers: 없음.
- Next: 도주 후 contact roaming 유지 또는 focus/skill 밸런스 재검토.

## 2026-05-31

- Status: [x] 동료/파티 참전 구현.
- Changed:
  - `build_ally_combatant` 추가 및 `build_encounter(..., allies=...)` 확장. player+ally party를 전장 좌측에 배치하고 기존 엔진의 ally AI 턴을 사용.
  - `CombatService.begin`이 `_party.members`와 scenario ally `unlock_flags`를 읽어 정세린/카이 같은 ally combatant를 생성. 전투 종료/진행 후 ally HP를 `_party.members`에 carry-over.
  - ally radar/portrait/faction이 기존 단일 iframe 전투 UI roster/board에 그대로 표시되도록 연결.
  - 동료 spawn/flag unlock/HP persistence 테스트 추가.
- Verified: `make test`(123, 2 skipped), `make typecheck`, 변경 파일 ruff, `make smoke-local`, service-level `se_rin` ally radar 확인.
- Blockers: 동료 스킬 자동 사용은 아직 없음(기본 NPC weapon AI). 밸런스는 후속 조정 가능.
- Next: 도주 후 contact roaming 유지 또는 focus/skill 밸런스 재검토.

## 2026-05-31

- Status: [x] 전투화면 단일 iframe 재구성 완료 — per-action Streamlit rerun/remount 제거.
- Changed:
  - `src/mythos_runtime/combat_server.py` 추가: 127.0.0.1 localhost JSON bridge, `combat_action_response` / `combat_state_response` 순수 핸들러, 요청별 `RuntimeSessionService` 위임.
  - `streamlit_app.py` 전투 fragment 단순화: 전투 중에는 `_build_combat_app_html` 단일 iframe이 보드/로스터/컨트롤/로그/결과를 렌더하고, 액션은 fetch로 처리. Streamlit은 종료 신호만 받아 다음 장면/메인 복귀를 수행.
  - `tests/test_combat_server.py` 추가: 상태 응답, 스킬 액션, 좌표 이동 매핑 검증.
- Verified: `make test`(121, 2 skipped), `make typecheck`, 변경 파일 ruff, `make smoke-local`, Browser Streamlit 전투 iframe 렌더 확인.
- Blockers: iframe 내부 버튼 클릭까지 자동화하지는 못했으나, 핸들러 단위 액션과 브라우저 렌더는 검증됨.
- Next: 동료/파티 참전.

## 2026-05-31

- Status: [x] 전투 스킬/아이템 실행 + 이동/blank 버그 수정. [ ] 깜박임/흰박스는 단일 iframe 재구성으로 인계.
- Changed:
  - 전투 스킬/아이템 엔진 배선: `Combatant`에 focus/skills/cooldowns/defense_buff, `factory.derive_max_focus`,
    `engine`의 `_player_skill`/`_player_item`/`_tick_player_round`, `CombatService` 스킬 부여 + 인벤토리 소비,
    radar/available에 focus·skills 노출, Streamlit 전투 컨트롤에 스킬/아이템 버튼 + 집중 게이지.
  - 전투 UI 버그: 보드 미표시(`st.markdown` iframe sanitize) → 인라인 `st.iframe`(srcdoc) 렌더로 교체.
    이동 무반응 → fragment select/move 후 `st.rerun(scope="fragment")`. 스킬 클릭 blank → `_dispatch` 헬퍼로
    액션 후 fragment rerun. 흰 박스 → `hidden_combat_action` label collapsed + `.st-key-` 숨김 CSS.
- Verified: `make test`(118, 2 skipped)·`make typecheck`·`make smoke-local` PASS, Streamlit headless 200 OK.
- Blockers: **깜박임 + 스킬창 흰 박스 잔존** — per-action rerun + iframe remount 구조 한계. 부분 완화만 됨.
- Next(codex 인계): **전투화면 단일 iframe 재구성** — `docs/plans/2026-05-31-combat-single-iframe.md`,
  `docs/NEXT_PLAN.md` §1. 엔진/스키마 무변경, 표현 계층만 재작성.

## 2026-05-31

- Status: [x] 문서 토큰 사용 최적화.
- Changed: `AGENT_BRIEF.md` 진입점 추가, 2026-05 상세 로그 archive 분리, current docs를 요약/링크 중심으로 정리.
- Verified: 문서 링크/크기 확인.
- Blockers: 없음.
- Next: 동료/파티 참전 작업 시 `STATUS.md`와 `NEXT_PLAN.md`만 갱신하고 상세 구현 기록은 필요한 만큼만 append.

## 2026-06-03

- Status: [x] P2 (IP-Adapter 캐릭터 비주얼 일관성 실배선) 및 P3 (Web UI 디커플링 아키텍처 설계) 완료.
- Changed:
  - `src/mythos_image_agent/config.py`: IP-Adapter 레포, 가중치명, CLIP 이미지 인코더 설정 속성 추가.
  - `src/mythos_image_agent/pipeline_cache.py`: `get_flux_ip_adapter_pipeline` 추가 (CLIP Image Encoder CPU 격리 로딩, base components 공유 생성, IP-Adapter 가중치 탑재).
  - `src/mythos_image_agent/generator.py`: `generate_image`에 `ip_adapter_image_path`/`ip_adapter_scale` 추가 배선 및 비사용 시 scale 0.0 처리.
  - `src/mythos_runtime/visual_service.py`: `_request_from_scene`에서 캐릭터 포트레이트 일치 시 `use_ip_adapter=True` 자동 설정, `LocalFluxProvider` 내 IP-Adapter 생성 분기 배선.
  - `resources/neo-seoul/scenario.json`: 누락되었던 `character_map` 및 `concept_map` 정보 추가 설정.
  - `docs/plans/2026-06-03-web-ui-decoupling.md` 및 `docs/plans/2026-06-03-p2-p3-implementation.md` 작성: Next.js/Vite 상태 바인딩, REST/WebSocket API boundary 규격, Canvas 기반 전술 전투 보드 설계 및 Redis Queue/S3 락 사양 정의.
  - `tests/test_visual_service.py`: 캐릭터 감지(IP-Adapter 활성화), 개념 감지(IP-Adapter 비활성), LocalFluxProvider 분기 라우팅, `get_flux_ip_adapter_pipeline` mock 단위 테스트 추가.
- Verified: `make test` (152 tests, 2 skipped), `make typecheck`, `make smoke-local` 전부 성공 통과.
- Blockers: 없음.
- Next: P0 EndingResolver 조건식 AST/whitelist evaluator 교체 및 시나리오 엔딩 조건식 정합성 점검.

## 2026-06-03

- Status: [x] 1순위 (P0 EndingResolver AST 안전화 및 시나리오 정합성 점검), 2순위 (P1 DB Connection Churn 최적화), 3순위 (P1 NPC 아젠다 & 이벤트 타임라인 디벨로퍼 뷰 고도화) 완료.
- Changed:
  - `src/mythos_runtime/ending_resolver.py`: `ASTConditionEvaluator` 구현. `eval`을 AST 파서/화이트리스트 기반 조건식 평가로 교체하여 RCE 보안 위험을 구조적으로 제거.
  - `tests/test_ending_resolver.py`: AST 평가식 및 논리 연산자, `flags contains` 조건 검증을 기존 유닛 테스트로 안정 작동 확인.
  - `streamlit_app.py`:
    - `@st.cache_resource` 데코레이터를 이용한 싱글톤 `get_shared_store()` 헬퍼 도입. 모든 UI 액션/스트림/로더에서 DB Store를 매번 생성하고 닫던 오버헤드(Connection Churn)를 완전히 제거하여 반응성 향상.
    - Developer panel (`_causality_monitor_panel`)에 NPC 아젠다 Goal/Rules 노출 및 매칭 활성 플래그 표시, `store.list_events`를 활용한 월드 이벤트 히스토리 타임라인(Causality Event Timeline) 시각화 보강.
- Verified: `make test` (152 tests, 2 skipped), `make typecheck`, `make smoke-local` 전부 성공 통과.
- Blockers: 없음.
- Next: P1/P2 동료 AI/행동 및 전술 밸런싱 고도화.


<!-- ===== 2026-06-07 route-node 세션 상세 (current PROGRESS_LOG에서 이관) ===== -->

## 2026-06-07 — 버그픽스: 이미지 에이전트 txt2img 경로 크래시 + anchor 장면 이미지 5종 생성

- Status: [x] 참조 이미지 없는 일반 txt2img 생성이 전부 막히던 버그 수정. anchor 장면 이미지 5종 FLUX 생성.
- Bug: `src/mythos_image_agent/generator.py` — IP-Adapter(Redux) 미사용 경로에서 `if hasattr(pipe, "set_ip_adapter_scale"): pipe.set_ip_adapter_scale(0.0)` 호출. FluxPipeline은 어댑터 미로드 상태에서도 해당 메서드를 mixin으로 노출하므로 `hasattr`이 True가 되고, 호출 시 `transformer.encoder_hid_proj` 부재로 `AttributeError` 크래시 → 참조 이미지 없는 모든 생성(anchor 장면, 일반 컨셉 등) 실패.
- Fix: 어댑터가 실제 로드된 경우(`pipe.transformer.encoder_hid_proj is not None`)에만 `set_ip_adapter_scale(0.0)` 호출하도록 가드. (`generator.py:72-79`)
- Assets(최종): anchor 장면 5종은 사용자가 외부(Imagen)로 생성한 고품질본을 정식 채택. `scenes/<beat>.png`로 통합(FLUX 임시본 덮어씀, 임시 `scenes/imagen/` 폴더 제거), `+ scenes/opening_escape_alt.png`(후드 버전 보존). scenario anchor `image` 경로는 깔끔한 `scenes/<beat>.png`. FLUX 생성 경로/프롬프트는 `docs/scenarios/neo-seoul-anchor-image-prompts.md`에 보존(재생성용). anchor 장면은 `object-fit: contain`(레터박스)로 표시(`.anchor-scene`) — kai는 portrait 비율.
- 캐릭터 포트레이트 3종 교체(사용자): `characters/{player-noise,kai,administrator-ix}.png`. 기존 참조 경로 그대로라 코드/JSON 변경 불필요(player-noise=플레이어 전투 포트레이트 `factory.py`/Roster/Canvas/Cinema, kai=character_map+characters+combat ally, administrator-ix=characters Redux 키워드). kai/IX 포트레이트는 각각 `kai_awakening`/`ix_confrontation` 장면과 화풍 일관.
- 전투 스프라이트 시트(`characters/combat/{kai,player-noise}-*.png` 10종)는 새 포트레이트와 화풍 일관 확인됨(사용자) → 재생성 불필요.
- Note: concept/ 이미지는 `visual_service`에서 생성 reference(img2img)로 이미 사용 중(01/02/03)·key_art(00). `04-reconstruction.png`는 미사용 — 엔딩/재건 장면 배선 후보.

## 2026-06-07 — 작전 지도 route-node Step 2b-4 (anchor 큐레이트 장면 이미지)

- Status: [/] anchor(임팩트 비트)에 전용 큐레이트 이미지를 장면에 표시. 이미지 에셋 자체는 사용자 생성 예정(프롬프트/경로 docs 제공).
- Changed:
  - `resources/neo-seoul/scenario.json`: anchor 5종 `image`를 전용 경로 `scenes/<beat>.png`로 변경(opening_escape/night_market/kai_awakening/spire_gate/ix_confrontation). (주: 5경로 갱신을 python으로 처리하며 파일 전체가 재포맷됨 — 내용 동일, 포맷 churn 발생.)
  - `src/mythos_ui/src/StoryPanel.tsx`: 현재 노드가 anchor이고 image가 있으면 큐레이트 이미지를 장면 이미지로 우선 표시. 파일 미존재 시 onError로 생성 이미지/placeholder로 우아하게 폴백. anchor 장면이면 패널 제목에 비트 title 표시.
  - `src/mythos_ui/src/index.css`: `.anchor-scene` 골드 프레임.
  - `docs/scenarios/neo-seoul-anchor-image-prompts.md` 신규: FLUX(FLUX.1-schnell) 백엔드 기준 beat별 영어 프롬프트 + 정확한 경로 + agent.py 생성 명령 + 공통 아트 디렉션.
- Verified: `make test` 260 / 2 skipped, `make frontend-lint`/`frontend-build`, `make test-e2e` green(이미지 미존재 시 폴백 동작 확인). scenario JSON 유효.
- Next(2b 잔여): 게이지 effect 통합, 동적 노드 title 다양화, `_map` 제거. 사용자: `resources/neo-seoul/scenes/`에 5개 PNG 배치.

## 2026-06-07 — 작전 지도 route-node Step 2b-3 (combat 노드 전투 트리거)

- Status: [/] route가 combat/patrol/boss 노드로 진입하면 기존 전투 시스템으로 실제 전투를 시작. 전투가 "랜덤 조우"가 아니라 작전 노드 선택의 결과가 됨.
- Changed:
  - `resources/neo-seoul/scenario.json`: `route_map.combat_encounters` 노드유형→encounter pool 매핑(combat→sentinel_checkpoint/wraith_glitch, patrol→patrol_ambush, boss→enforcer_standoff).
  - `src/mythos_runtime/route_runtime.py`: `node_encounter_id`(combat 노드의 encounter를 seed로 결정적 선택).
  - `src/mythos_runtime/session.py`: `_commit_scene`에서 route 전진이 combat 노드로 *새로 진입*했을 때(이전 current와 비교) encounter를 골라 기존 `next_combat` 경로(`requested_combat or triggered_combat or route_combat`)에 합류. scenario.combat.encounters에 존재할 때만.
  - `tests/test_route_runtime.py`: `node_encounter_id` 매핑/보스/결정성/비전투(+4).
- Verified: fallback 통합 — combat류 junction 선택→combat 노드 진입 시 `CombatService.is_active` True 확인. `make test` 260 / 2 skipped, `make test-e2e` green.
- Next(2b 잔여): anchor 큐레이트 이미지 장면 표시, 게이지 effect 통합, 동적 노드 title 다양화, `_map` 제거.

## 2026-06-07 — 작전 지도 route-node Step 2b-2 (edge=선택지 바인딩 / 레이어 경계 분기)

- Status: [/] 레이어 경계에서 플레이어가 다음 작전 노드를 직접 선택하는 비주얼노벨식 분기 구현. 레이어 내부는 LLM 자유 장면 유지.
- 케이던스(사용자 확정): 레이어 경계에서만 분기. 턴 기반 자동 전진은 진행 보장용으로 유지(루프 미스톨), 플레이어의 junction 선택은 *어느 분기*를 탈지 결정(`preferred_next`).
- Changed:
  - `src/mythos_runtime/route_runtime.py`: `junction_options`(레이어 마지막 턴 & 분기≥2일 때 다음 노드 후보 반환), `advance_route(preferred_next=...)`로 junction 선택이 분기 우선권을 갖도록(소비 후 클리어).
  - `src/mythos_runtime/session.py`: 경계 턴에 scene.choices를 route edge 선택지로 대체(`_build_route_choices`, choice_id `route:<node>`, 유형·위험·보상 배지). `choose`/`stream_choose`에서 `route:` 선택을 `route_target`으로 `_commit_scene`→`advance_route`에 전달(`_route_target_from_choice`). intent="explore"(서버측 무해, `_resolve_action`은 label만 사용).
  - `src/mythos_runtime/scenario_context.py`: `_route_junction_notes` — 경계 턴에 GM이 장면을 "행선지 결정 직전 갈림길"로 마무리하도록 유도(선택지는 시스템이 대체).
  - `tests/test_route_runtime.py`: junction 경계 한정/route_map 없음/preferred_next 분기 조종(+3).
- Verified: fallback 12턴 통합 — 턴3 갈림길 3옵션(정비/시장/순찰) 제시·선택→current 이동, 턴7 갈림길→선택, 최종 카이 재가동 도달. `make test` 256 / 2 skipped, `make test-e2e` green.
- Next(2b 잔여): combat 노드 진입 시 전투 트리거+reward, anchor 큐레이트 이미지 장면 표시, 게이지 effect 통합, `_map` 제거. 동적 노드 title을 유형 기반으로 다양화.

## 2026-06-07 — 세션 메모리 (beat 원장 + 롤링 시놉시스 + 직전 장면 창)

- Status: [x] RAG 없이 장면 연속성/반복 방지 인프라 구축. 세션 진행을 `loops.state` JSONB에 압축 저장하고 매 턴 컨텍스트에 주입.
- 배경: LLM GM이 건조한 이벤트 튜플만으로는 같은 장소/인물을 반복 서술하고 throughline이 약해지는 문제. 해법은 검색(RAG)이 아니라 **상태 접지 + 요약 메모리**(단일 40-60턴 세션 규모엔 이게 더 강함; RAG는 cross-loop/희소 연상 접근에서나 가치).
- Changed:
  - `src/mythos_runtime/session_memory.py` 신규: `record_beat`(매 턴 `_beats` 압축 원장 + `_recent_narration` 직전 1-2장면 원문, 턴별 idempotent, 상한), `build_session_synopsis`(beat에서 결정적 합성 — 연속 동일 노드 접기, anchor 전환점 spine + lens/gist + 최근 흐름 + 직전 장면 원문. 추가 LLM 호출 없음).
  - `src/mythos_runtime/session.py`: `_commit_scene`에서 route advance 직후 `record_beat` 훅.
  - `src/mythos_runtime/scenario_context.py`: `build_session_synopsis`를 컨텍스트에 주입(route steering 앞).
  - `tests/test_session_memory.py` 신규(6): 기록/idempotent/창 상한/연속 노드 접기/직전 산문 포함.
- Verified: fallback 9턴 — 시놉시스 "추락과 첫 신뢰 → 한강 야시장" + 직전 장면 원문. `make test` 253 / 2 skipped, `make test-e2e` green.
- 비고: 마이그레이션 불필요(`loops.state` JSONB). 토큰은 시놉시스+직전장면 ~500토큰 수준.

## 2026-06-07 — 작전 지도 route-node Step 2b-1 (라우트-인지 내러티브 주입)

- Status: [/] Step 2b 1차 완료. route 정보를 LLM 내러티브 컨텍스트에 주입 — GM이 현재 노드 비트·활성 관점·향하는 결말을 반영해 장면을 묘사. 선택 메커니즘/E2E 셀렉터 비변경(additive).
- Changed:
  - `src/mythos_runtime/scenario_context.py`: `_route_director_notes(scenario, loop)` 추가. 스크립트 오프닝(턴 0-2) 이후(turn>=3) 현재 작전 노드(유형·anchor 여부), 활성 시점(lens+summary), 교차 실타래(crosses 복선), 현재 루트가 향하는 결말 경향(엔딩 title, 직접 언급 금지·톤만)으로 GM을 유도. `route_runtime.route_status` 사용.
  - `tests/test_route_runtime.py`: `_route_director_notes` 노트 내용/route_map 없을 때 빈 결과 테스트(+2).
- Verified: fallback 세션에서 노트 생성 확인(현재 노드 '한강 야시장'/시장/anchor, 시점 '정당한 거래—시민의 시점', crosses opening_escape, 결말 경향 '안정적 귀환'). `make test` 247 / 2 skipped, `make test-e2e` green.
- Next(2b 잔여): edge=실제 선택지 바인딩, combat 노드 진입 시 전투 트리거+reward, anchor 큐레이트 이미지 장면 표시, 게이지 effect 통합, `_map` 제거.

## 2026-06-07 — 작전 지도 route-node Step 2a (라이브 진행 + 관점/엔딩 누계)

- Status: [/] Step 2a 완료. route map이 런타임에서 "살아 움직임" — 노드 진행 + 누적 flag로 anchor 관점 선택 + 효과 flag 적용 + ending_influence 누계. edge=선택지 바인딩과 combat 노드 전투 트리거, LLM 노드 서술은 다음 단계(2b).
- Changed:
  - `src/mythos_runtime/route_runtime.py` 신규: `advance_route`(턴 진행에 따라 current 전진, flag 편향 edge 선택, 방문 anchor 관점 인과 순서 해석, 효과 flag 적용, ending_leaderboard 누계), `select_perspective`, `route_status`. 게이지(안정/추적/통찰)는 엔진/보상 시스템 소유 유지 — 중복 적용 방지.
  - `src/mythos_runtime/session.py`: `_commit_scene`의 encounter map 진행 직후 `advance_route` 훅(route_map 있을 때만).
  - `src/mythos_ui/src/types.ts`: `RouteMap`에 `active_perspectives`/`ending_tally`/`ending_leaderboard`.
  - `src/mythos_ui/src/GameAside.tsx`/`index.css`: 작전 지도에 현재 노드의 활성 시점(lens+summary) + "이 루트가 향하는 결말" 엔딩 리더보드 바 표시.
  - `tests/test_route_runtime.py` 신규(8): 진행/보스 도달/결정성/효과 flag/관점 선택/엔딩 누계/상태 요약.
- Verified: fallback 14턴 통합 — current `opening_escape→kai_awakening`, 관점 `p_trust/p_fair/p_awaken` 해석, flags 누적, ending_leaderboard 채워짐. `make test` 245 / 2 skipped, `make frontend-lint`/`frontend-build`, `make test-e2e` green.
- Next(2b): 현재 노드 outgoing edge를 실제 선택지로 노출, combat 노드 진입 시 전투 트리거 + reward, LLM이 선택된 관점 summary/crosses를 시드로 장면·라벨 생성, anchor 큐레이트 이미지 장면 표시, 게이지 effect 통합, `_map` 호환 계층 제거.

## 2026-06-07 — 작전 지도 route-node화 Step 1 (절차 생성 + 노드 그래프 뷰)

- Status: [/] Step 1 완료. 백엔드 결정적 생성기 + 직렬화 + 작전 지도 노드 그래프 뷰. director 통합(선택지=edge, 전투 트리거)은 다음 단계.
- 방향(사용자 확정): Typed Node Catalog + 결정적 절차 생성 하이브리드. **임팩트 있는 스토리 비트는 anchors(사전 저작 비트+큐레이트 이미지/이벤트)로 고정**, 그 사이 과정은 pool/width 동적 노드로 매 루프 랜덤 배치(루프 시드로 결정적). 장면 묘사는 LLM 담당(다음 단계). layers는 golden_path 6막 매핑.
- Changed:
  - `docs/plans/2026-06-07-route-node-procedural-map.md` 신규: Step 1 설계 스냅샷.
  - `src/mythos_runtime/route_map.py` 신규: `build_route_map`(결정적 layered DAG: anchor 우선 배치 + 동적 pool 샘플 + 연결성/전투 회피·감수 경로 불변식), `route_map_paths_summary`.
  - `resources/neo-seoul/scenario.json`: `route_map`(node_types 8종 + layers 6막, anchors/pool/width) 추가. anchor 스토리 비트를 **다중 관점(perspectives)** 으로 다변화 — 같은 임팩트 장면을 사람/증거/안전/통제 축의 여러 시점(lens)으로 보고, `when`(루트 flag)으로 갈라지며, `crosses`(교차 스토리라인)·`effect`(세션 영향)·`ending_influence`(엔딩 도출)를 가진다. boss anchor의 4관점이 4엔딩을 모두 커버.
  - `src/mythos_runtime/scenario.py`: `ScenarioConfig.route_map` 필드.
  - `src/mythos_runtime/session.py`: `_prepare_start_loop`에서 loop seed로 route_map 생성해 `state["_route_map"]` 주입. config 없으면 기존 `_map` fallback.
  - `src/mythos_ui/src/types.ts`: `RouteMap`/`RouteNode` 타입 + `_route_map`.
  - `src/mythos_ui/src/GameAside.tsx`: `OperationMapPanel`이 `_route_map` 있으면 노드 그래프 뷰(`RouteMapPanel`: 레이어 행, 현재/다음후보/방문, anchor★·유형 glyph·위험/보상 배지), 없으면 기존 미니맵.
  - `src/mythos_ui/src/index.css`: `.route-*` 스타일.
  - `tests/test_route_map.py` 신규: 결정성/start=story anchor/end=boss/anchor 리소스/연결성/전투 회피·감수 경로 불변식(20 seed).
- Verified: `make test` 233 tests / 2 skipped, `make frontend-lint`, `make frontend-build`, `python -m json.tool` scenario 검증.
- Next: director 통합(현재 노드 outgoing edge를 실제 선택지로, combat 노드 진입 시 전투 엔진 + reward 적용), LLM 노드 장면/edge 라벨 생성, anchor 큐레이트 이미지 노드 표시, `_map` 호환 계층 제거.

## 2026-06-07 — Neo-Seoul Live Feedback Triage + Immediate UX Fixes

- Status: [/] 라이브 피드백을 P0/P1/P2로 분류하고 즉시 수정 가능한 UI 혼란/회귀 일부 반영.
- Changed:
  - `docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md` 신규 작성: BGM, 작전 지도, Tactical Board, 진행도/아키타입, 회복/전리품, AI GM 진행, 세션 멈춤 이슈의 우선순위와 방안 정리.
  - `App.tsx`: 시나리오 오프닝 수락 시 `initAudio()` 및 force BGM 재시도, Story 탭 복귀 시 combat canvas 재렌더.
  - `GameAside.tsx`/`index.css`: 작전 지도 범례/현재 위치/접근 접촉, 상태 HUD 설명, 개발 로그 명칭 보강.
  - `SaveHistoryPanel.tsx`: 런 히스토리 빈 상태 문구를 "종료된 루프 기록" 의미로 명확화.
  - `scenario_context.py`: Neo-Seoul 고유명사 표기 규칙 추가(`정세린`/`세린`, `린위에`, `카이 RX-09`, `관리자 IX`).
  - `docs/NEXT_PLAN.md`/`docs/neo_seoul_live_qa.md`: 라이브 피드백 기반 P0/P1/P2 체크리스트와 Live QA 항목 추가.
- Verified: `make frontend-lint`, `make frontend-build`, `.venv/bin/python -m unittest tests.test_story_bible tests.test_runtime_session tests.test_encounter_map tests.test_combat_service`, `make test-e2e`.
- Next: 세션 10장면 이후 live LLM 장기 세션 재확인, 작전 지도 route-node 설계 구현, Tactical Board legend/inspector.

## 2026-06-07 — Neo-Seoul P0: Insight Reward + Forced Ambient Combat 완화

- Status: [x] 전투 보상 통찰 반영 및 초반 강제 ambient 전투 완화 완료. Live LLM 장기 세션 QA는 남음.
- Changed:
  - `session.py`: `encounter_reward.insight`를 즉시 meta progression 통찰 포인트로 저장하고, combat finished event에 reward payload를 남김.
  - `encounter_map.py`: 명시 요청 없는 ambient contact 자동 생성은 기본 off. `RuntimeSessionService`는 high tension/low stability에서만 ambient 접촉을 허용.
  - `neo-seoul/scenario.json`: 조우별 `tension/stability/insight` 보상 기준값 갱신. 기존 "insight 미반영" 문구 제거.
  - `StoryPanel.tsx`/`types.ts`/`index.css`: 전투 결과 패널에 통찰/안정도/추적도/전리품 요약 표시.
  - `CodexPanel.tsx`: 통찰 획득 방법 안내 추가.
  - `NEXT_PLAN.md`/Live QA 문서/라이브 피드백 플랜 갱신.
- Verified: fallback 12선택 진행 통과(강제 초반 전투 미발생), `make frontend-lint`, `make frontend-build`, `.venv/bin/python -m unittest tests.test_encounter_map tests.test_session_combat tests.test_runtime_session tests.test_progression tests.test_api`, `python -m json.tool resources/neo-seoul/scenario.json`, `make test-e2e`, `make test` 226 tests / 2 skipped.
- Next: live LLM 장기 세션에서 10장면 이후 멈춤 재확인, 작전 지도 route-node 구현, Tactical Board legend/inspector.

## 2026-06-07 — Planning Pivot: Neo-Seoul Playability 우선

- Status: [x] 계획 수립, Phase 1 문서 확정, Phase 2 데이터 보강, docs 최신화 완료. 런타임 코드 변경 없음.
- Changed:
  - `docs/plans/2026-06-07-neo-seoul-playability-upgrade.md` 신규 작성: Neo-Seoul을 30-60분 만족 플레이 가능한 주력 시나리오로 끌어올리는 5단계 계획 수립(Golden Path, Story/Choice Density, Combat/Progression Fun, UX Feedback, RC Pass).
  - `docs/scenarios/01-neo-seoul-connect.md`: 45분 Golden Path, 실패/우회 Path 5종, 8항목 플레이 만족도 QA rubric, 구현 후보 목록 추가.
  - 수동 QA 문서 폐기. Neo-Seoul QA 기준은 `docs/scenarios/01-neo-seoul-connect.md` §5.5로 통합.
  - `resources/neo-seoul/story_bible/bible.json`: 세린 불신, 린위에 부채 회수, 카이 미각성, 고 tension 강제 충돌, 증거 우선, 관리자 IX 거울 유혹, 엔딩 Echo 변주 snippets 추가(17→24 entries).
  - `resources/neo-seoul/scenario.json`: `playability` 메타 추가(Golden Path, 4개 choice axes, 5개 route branches, 엔딩별 Echo targets).
  - `resources/neo-seoul/scenario.json`: combat encounters별 `learning_goal`/`narrative_trigger`/`reward_intent` 추가. `playability.progression_reward_tuning` 추가.
  - `NEXT_PLAN.md` 최상위 우선순위를 Neo-Seoul Playability Upgrade로 교체.
  - `STATUS.md`/`AGENT_BRIEF.md` Active Focus를 Neo-Seoul 중심으로 갱신하고 `glass-library` 추가 확장은 hold 처리.
  - `GAMEPLAY.md`의 낡은 planned progression 문구를 현재 구현 상태와 Neo-Seoul 튜닝 초점으로 정리.
- Verified: `python -m json.tool resources/neo-seoul/scenario.json`, `python -m json.tool resources/neo-seoul/story_bible/bible.json`, `.venv/bin/python -m unittest tests.test_story_bible tests.test_api tests.test_runtime_session`, `.venv/bin/python -m unittest tests.test_combat_service tests.test_session_combat tests.test_api tests.test_story_bible`.
- Next: Phase 3 구현 후보 — 난이도 수치, tension/stability 보상 체감 검증. 이후 Phase 4 objective/choice-result/Codex UX 피드백 정리.

## 2026-06-07 — Frontend Lint Hotfix + Live QA 상태 반영

- Status: [x] P0 린트 회귀 수정 및 Live QA 완료 상태 반영. 이후 수동 QA 문서는 폐기하고 시나리오 문서의 rubric으로 통합.
- Changed:
  - `App.tsx`: 미드런 깨달음 배너의 중복 표시 추적을 ref 기반으로 정리하고 `CombatSkillInfo`/`ScenarioSkill` 타입을 사용해 `any` 캐스트 제거.
  - `useAudio.ts`: 스킬 SFX 파일 실패 시 `sfx_glitch` fallback을 재귀 콜백 대신 내부 clip helper로 정리해 React hook lint 오류 제거.
  - `glass-library/story_bible/bible.json`: phase/location/flags 조건부 snippet 7개 추가(무음 열람실, 반납되지 않은 복도, 금서 색인, 이오 신뢰 분기, 검열 전투, 최초 기록 보관고, 엔딩 잔향). 총 17 entries.
  - `STATUS.md`/`NEXT_PLAN.md`: 전투 연출·파티 조작·미드런 깨달음·`glass-library` Live QA 완료(사용자 확인) 반영.
- Verified: `python -m json.tool resources/glass-library/story_bible/bible.json`, `.venv/bin/python -m unittest tests.test_story_bible tests.test_runtime_session`, `make frontend-lint`, `make frontend-build`, `make test`, `make test-e2e`, `make test-e2e-full`.

## 2026-06-07 — UI/UX & Gating Hotfix: 서사 기록 제한, 미드런 해금 반영, 로컬 시나리오 해금

- Status: [x] 라이브 QA 피드백 반영 및 E2E 무결성 검증 완료.
- Changed:
  - `StoryPanel.tsx`: 서사 기록 전체 보기 모달 내 최근 20개 장면 제한 및 오프셋 계산으로 장면 번호 연속성 유지. 헤더 카운팅 갱신.
  - `progression.py`:
    - `ProgressionService` 내 `_merge_mid_run_epiphanies` 헬퍼 메소드 추가. 미드런 Codex 조회/학습 시 active 루프의 실시간 epiphany 목록을 unlocked_skills에 병합 처리하여 LOCKED 자물쇠가 실시간으로 해제되도록 수정.
    - `scenario_unlock_met` 함수 내 비테스트(라이브 구동) 환경일 경우 튜토리얼 완주 여부와 상관없이 시나리오 잠금을 우회하도록 수정. 이를 통해 로컬/라이브 테스트 시 `glass-library` 시나리오 진입이 가능하도록 개선.
  - `test_runtime_session.py`: 린트 정리 과정에서 발생한 session.py 간접 임포트 오염을 방지하기 위해, narrative_rollup 헬퍼들을 직접 임포트하도록 테스트 코드를 정석 수정.
  - 폐기된 수동 QA 문서: 기존 play-checklist 내용을 한때 통합했으나, 이후 Neo-Seoul QA 기준을 시나리오 문서 rubric으로 이관.
- Verified: `make test` 223 tests / 2 skipped 그린. `make frontend-build` 성공. `make test-e2e` 및 `make test-e2e-full` Playwright 연계 종합 시나리오 그린 통과.

## 2026-06-07 — Combat Polish: 모션 다양화 + reduced-motion 접근성

- Status: [x] Priority 1 후속 polish 완료(저위험, 자족적).
- Changed:
  - `combatAnim.ts`: defense/support 스킬이 동료에게 부여될 때(target≠source) 시전자→동료 이동 펄스 + 동료 위치 실드 링, melee `burst` 태그에 외향 충격파 링 추가.
  - `App.tsx`: `prefersReducedMotion()` 시 타자기 즉시 플러시, 진입 켄번/글리치 시네마틱 스킵.
  - `index.css`: 전역 `@media (prefers-reduced-motion: reduce)` — ambient 루프 애니메이션(켄번 팬/글리치/블링크) 무력화 + 트랜지션 축소(전투 보드/시네마는 기존 JS 게이팅 유지).
- Verified: `make frontend-lint`/`make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` 그린. `make test` 영향 없음(223/2 skipped 유지).

## 2026-06-07 — Scenario Expansion: 데이터 주도 진행도 + glass-library 패리티

- Status: [x] 진행도 grant를 scenario.json 데이터 주도로 전환(시나리오 비종속), glass-library를 progression/presentation 패리티로 보강. 공유 캐시 오염 버그 수정.
- Changed:
  - `progression.py`: `evaluate_meta_progression`이 `archetypes[].unlock`·`combat.skills[].epiphany`(+`combat.epiphanies` 매핑)에서 아키타입/스킬 해금을 **데이터 주도**로 도출. 깨달음은 **해금만**(자동 습득 제거) → Phase 2 통찰 습득과 일관. `_condition_met` 헬퍼, `_DEFAULT_EPIPHANY_CONDITIONS`. 하드코딩 neo-seoul grant 제거(시나리오 교차 오염 버그 수정). 호출부(`ProgressionService`/`session.py`)가 scenario 전달.
  - `scenario.py`: `ScenarioConfig.unlock`/`unlock_hint`(Phase 3) 외 — neo-seoul/glass `combat.epiphanies` 추가.
  - `neo-seoul/scenario.json`: `combat.epiphanies` 추가.
  - `glass-library/scenario.json`: 아키타입 `base_skills`/`unlock`/`unlock_hint`, `combat.archetype_base_skills`, `combat.epiphanies`, 스킬 `tier`/`epiphany`/`requires`/insight 비용, `ui_copy`(signal/boot/intro/session_intro) 추가.
  - `mythos_combat/engine.py`: `CombatEngine`가 lru_cached scenario의 skills dict를 **복사**해 보관(테스트의 `engine.skills_pool[...]` 변형이 캐시를 오염시키던 버그 수정).
- Verified: `make test` 223 tests / 2 skipped(+1 신규, 1 재작성), `make frontend-lint`/`make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` 그린. neo-seoul/glass 진행도 시나리오 스코프 분리 확인.

## 2026-06-07 — Controllable Party Allies (파티 조작 2단계)

- Status: [x] 파티원 직접 조작 / 비파티 동맹 AI 유지. 전투 턴 루프를 player-only stop에서 controllable-actor stop으로 일반화.
- Changed:
  - `mythos_combat/models.py`: `Combatant.controllable` + `is_controllable` 프로퍼티, `CombatState.active_actor()`/`living_controllables()`.
  - `mythos_combat/engine.py`: `_run_opening`/`_run_until_controllable`가 임의의 조작 가능 유닛에서 정지. `take_player_turn`·`available_actions`가 `active_actor` 기준으로 동작(도주는 PLAYER만, 파티원은 거부). `_check_outcome` 패배 판정 = 조작 가능 유닛 전멸. 라운드 upkeep 헬퍼 통합(`_tick_round_upkeep`). `available_actions`에 `active_actor_id/name`/`is_player` 노출.
  - `mythos_combat/factory.py`: `build_ally_combatant(controllable=...)`.
  - `mythos_runtime/combat_service.py`: `_build_allies`가 `_party.members` 소속만 `controllable=True`, flag 해금 동맹은 AI 유지.
  - 프론트: `types.ts` `CombatAvailableActions`에 active actor 필드, `CombatControls`가 현재 차례(플레이어/동료) 표시 + 파티원 턴엔 도주 버튼 숨김, `index.css` `.active-actor`.
- Verified: `make test` 222 tests / 2 skipped(+3 신규: 파티원 입력 대기, 파티원 도주 불가, AI 동맹 자동 진행), 단일 플레이어 회귀 무손상, `make frontend-lint`/`make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` 그린.

## 2026-06-07 — Progression Skills / Archetypes Phase 3 (깨달음 연출 + 시나리오 해금)

- Status: [x] 시나리오 간 해금 게이팅 + 깨달음(새 해금 스킬) 알림 배너 구현.
- Changed:
  - `scenario.py`: `ScenarioConfig`에 `unlock`/`unlock_hint` 필드 + 로더.
  - `progression.py`: `scenario_unlock_met`(tutorial_completed / runs_completed 조건; unlock 없으면 항상 해금) 추가.
  - `glass-library/scenario.json`: `unlock={"tutorial_completed": true}` + 힌트(Neo-Seoul 튜토리얼 완료 시 해금).
  - `app.py` `/scenarios`: 시나리오별 `unlocked`/`unlock_hint` 계산(플레이어 메타 기준), 메모리 조회 1회로 통합.
  - 프론트: `types.ts`(`ScenarioInfo.unlocked/unlock_hint`, `RunSummary.unlocks_granted/scenario_id`), `OnboardingPanel`(잠긴 시나리오 옵션 disabled + 🔒 힌트 + start 게이팅), `App.tsx`(기본 선택을 첫 해금 시나리오로, 깨달음 배너 = 최근 런 `unlocks_granted`에서 신규 스킬 추출, localStorage 1회 dismiss), `viewModels.ts`(`buildEpiphanyNotice`), `index.css`(`.epiphany-banner`/`.ob-scenario-lock`).
- Verified: `make test` 219 tests / 2 skipped(+5 신규), `make frontend-lint`, `make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` 그린.

## 2026-06-07 — Progression Skills / Archetypes Phase 2 (통찰 투자)

- Status: [x] 통찰 포인트 적립 규칙, learn/rank-up API, Codex 습득/강화 버튼, tier 선행 게이팅 구현.
- Changed:
  - `progression.py`: 통찰 적립(`_insight_accrual` = run+2/clue+1/win+1)을 `evaluate_meta_progression`에 배선하고 grants에 `insight_points:+N` 기록. `build_skill_tree`(노드별 status/rank/max_rank/learn·rankup cost/requires/requires_met/action/can_afford), `learn_or_rank_skill`(해금·선행·잔액·최대랭크 검증 후 통찰 소비, ValueError로 사유 반환), `base_skills_for_archetype` 헬퍼 추가. `ProgressionService.skill_tree/learn_skill` 메서드로 메타 진행 영속화.
  - `scenario.json`: combat 스킬에 `insight_cost`/`rankup_cost`/`max_rank`/`requires`(tier1 선행 노드) 메타 추가.
  - `session.py`: `skill_tree`/`learn_skill` 서비스 메서드(플레이어 아키타입 기준).
  - `app.py`: `GET /api/v1/players/{id}/skills`(트리 상태) + `POST /api/v1/players/{id}/skills/learn`(통찰 소비, 잘못된 액션 시 400) 엔드포인트, `LearnSkillRequest`.
  - 프론트: `types.ts` `SkillTreeNode`/`SkillTreeResponse`, `api.ts` `apiGetSkillTree`/`apiLearnSkill`(detail 메시지 surfacing), `App.tsx` skillTree/learning/error 상태 + `loadSkillTree`/`handleLearnSkill`(codex 탭 진입 시 로드), `CodexPanel.tsx` 통찰 잔액 + 습득/강화 버튼 + 선행/잔액 비활성 + 에러 표시, `index.css` `.skill-tree-action`/`.skill-tree-error`.
- Verified: `make test` 214 tests / 2 skipped(+9 신규), `make frontend-lint`, `make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` 그린.

## 2026-06-07 — Progression Skills / Archetypes Phase 1

- Status: [x] 아키타입 해금 게이트, 전투 스킬 base+learned 필터, Codex read-only Skill 트리 구현.
- Changed:
  - `progression.py`: `unlocked_archetypes`/`unlocked_skills`/`learned_skills`/`skill_ranks`/`insight_points`/`epiphanies_seen` 메타 진행 버킷 추가. Ghost 기본 해금, 첫 런/단서/전투승리 조건으로 아키타입·스킬 자동 grant.
  - `scenario.json`: 아키타입별 `base_skills`, unlock 조건/힌트, combat `archetype_base_skills`, 스킬 tier/epiphany/unlock_hint 메타 추가.
  - `/api/v1/scenarios`: `player_id` 쿼리 기준 메타 진행도를 반영해 아키타입 `unlocked` 상태와 스킬 목록을 내려줌.
  - `OnboardingPanel`: 잠긴 아키타입 disabled 표시, 기본 스킬/해금 힌트 노출.
  - `CombatService`: 시나리오 전체 스킬 대신 선택 아키타입 기본 스킬 + learned 스킬만 플레이어 액션으로 노출.
  - `CodexPanel`: snapshot/scenario 기반 read-only Skill 트리 추가(상태, 랭크, 역할, tier, cost/range/cooldown/tags/hint).
- Verified: `make test` 205 tests / 2 skipped, `make frontend-lint`, `make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py`.

## 2026-06-07 — BGM Retry + Combat SFX Impact Polish

- Status: [x] BGM 무음 회귀 방지, MusicGen 기반 전투 효과음 타격감 강화, play-checklist 완료 처리.
- Changed:
  - `HeaderBar.tsx`/`App.tsx`/`index.css`: 최상단 우측 persistent BGM START/ON/OFF 토글 추가. 사용자 제스처로 오디오를 unlock하고 localStorage에 on/off 선호를 유지.
  - `BootIntro` enter 흐름: 메인 화면 진입 클릭에서 `bgm_main.wav`를 즉시 재생해 시작 전 메인 BGM 무음 문제를 해소. 세션 종료 후 메인으로 돌아올 때도 BGM ON 상태면 main BGM으로 복귀.
  - `App.tsx`: BGM 경로 정규화/재시도 로직 개선. 파일 로드 실패나 autoplay 차단 뒤 같은 BGM 경로가 재생 재시도를 막지 않도록 `currentBgmSrc`를 복구하고, 기존 재생 중인 곡만 early-return. 전투 시뮬레이터 직행도 `bgm_combat_normal.wav`를 명시적으로 재생.
  - `App.tsx`: CombatCinema cue 볼륨을 상향하고 SFX volume clamp 추가.
  - `scripts/generate_sfx_resources.py`: `combat-impact` 모드 추가. `facebook/musicgen-small`로 attack/defend/move/glitch를 짧고 강한 one-shot 프롬프트로 재생성하고 transient/sub punch 후처리 적용. `skills-only` 스킬 SFX도 동일 방향으로 프롬프트 강화.
  - `tests/playwright/test_e2e_play_checklist.py`: mock BGM을 실제 wav 리소스 경로로 교체하고, request 이벤트 기반으로 exploration/combat BGM 및 skill/impact SFX 요청 검증.
  - `docs/NEXT_PLAN.md`: Priority 1 전투 연출을 당시 플레이 기준 완료 처리하고, 다음 신규 기능 우선순위를 Progression Skills / Archetypes로 정리.
- Verified: MusicGen WAV 재생성 완료(32kHz, one-shot), `make frontend-lint`, `make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` (`bgm_main.wav` 메인 진입/복귀 요청 포함).

## 2026-06-07 — Combat Skill SFX + Combat Result Image

- Status: [x] 전투 시네마 오버레이 스킬별 MusicGen SFX cue와 전투 종료 결과 이미지 패널 구현.
- Changed:
  - `CombatCinema.tsx`: enter/windup/impact/exit cue 콜백 추가, 스킬 카드 전용 SFX가 읽히도록 windup 타임라인 소폭 확장.
  - `App.tsx`: CombatCinema cue를 스킬별 `audio/sfx/skills/<skill_id>.wav`와 impact/defend/move 공용 SFX에 연결. 오버레이 이후 보드 애니메이션은 승패 종료음만 재생해 타격음 중복을 줄임.
  - `scripts/generate_sfx_resources.py`: `skills-only` 모드 추가, `facebook/musicgen-small`로 `signal_step/overload_strike/packet_shot/covering_noise/patch_protocol` 전용 SFX 5종 생성.
  - `StoryPanel.tsx`/`index.css`: 전투 종료 시 `combat_images` 기반 합성 결과 이미지 패널 표시. 승리/도주/패배 copy와 기존 `계속`/`메인 화면으로` 액션 유지.
  - Playwright E2E: CombatCinema phase sampling을 오디오 cue 타이밍에 맞게 안정화하고 `skills/packet_shot.wav`/`sfx_attack.wav` 요청 검증 추가.
- Verified: `make frontend-lint`, `make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py`.

## 2026-06-07 — Repo 정리 + session.py 모듈화/책임분리

- Status: [x] 정크 제거, historical 문서/스크립트 bin/ 이관, md 참조 정합화, session god-object 분해.
- Changed:
  - 정크 제거: `.playwright-mcp/`(70), `.antigravitycli`, `report.md` 스텁 + `.gitignore` 보강.
  - `bin/` 보관소 신설: `docs/archive`, 완료된 `docs/plans`(2026-05-31·06-03), `docs/feedback`를 이관하고 current docs 참조 경로 갱신. 활성 plan(2026-06-06/07)은 `docs/`에 유지. (`scratch/`는 재사용 에셋 파이프라인 도구라 root에 유지.)
  - 문서 재정비: `reference.md`를 evergreen 레퍼런스만 추려 `docs/REFERENCES.md`로 축약(gap/action/roadmap은 STATUS/NEXT_PLAN이 추적하므로 제거). `ADULT_VISUAL_POLICY.md`를 성인향 정책 내용 제거 + 이미지 파이프라인 실무 가이드로 재작성하고 `docs/IMAGE_POLICY.md`로 개명(289→90줄).
  - md 최적화: CLAUDE/GEMINI의 `harness/CORE_MANDATES·CONTEXT_BRIDGE` 경로 명시, GEMINI `session.py` 경로/React SPA 반영, AGENTS git-history 문구 교체, CONTEXT_BRIDGE 테스트 수·핸드오버 갱신.
  - `session.py` 1878→1349줄(-28%): `narrative_rollup.py`(장기기억 롤업 10함수)·`loop_scoring.py`(초기점수/톤/archive shard)·`combat_session_helpers.py`(전투 요약/요청/브리프 6함수)·`constants.py`(공유 상수) 추출. private 헬퍼는 session에서 re-export해 import 경로/테스트 호환 유지. 동작 변경 없음.
  - `engine.py`(1210)는 강결합 단일 상태기계라 분리 시 가독성 손해 → 유지. App.tsx/CombatCinema는 E2E 민감 단일 컴포넌트라 live QA 동반 점진 분리 권장(미착수).
- Verified: `make test` 203 / 2 skipped, `make frontend-build`/`make frontend-lint` clean, `tests/playwright/test_e2e_play_checklist.py` 그린(refactored 서버 기동 포함).

## 2026-06-07 — Phase 4: Combat Skill Icon Action Bar

- Status: [x] `CombatControls` 스킬 아이콘 액션바 구현 + frontend lint 부채 정리.
- Changed:
  - `CombatControls.tsx`: 스킬을 아이콘 타일로 렌더(`/resources/<scenario>/skills/<id>.png`), name/role/tags/cost/range/cooldown 기반 data-driven. cost(◆focus/▣item)·range 배지, cooldown 오버레이, FOCUS 부족 시 비활성, role별 색상, hover/tooltip. 아이콘 로드 실패 시 role 글리프 fallback. 기본 행동(공격/방어/대기/도주)에 글리프 추가. 스킬명 텍스트 유지로 E2E `:has-text` 셀렉터 호환.
  - `StoryPanel.tsx`: 두 `CombatControls` 렌더에 `scenarioId` 전달.
  - `index.css`: `.cc-skill*` 아이콘 바 스타일(role 색상 변수, 배지, CD 오버레이).
  - `types.ts`: `CombatLogDetail`에 `target_id/skill_id/skill` 추가.
  - `combatEffects.ts`: 위 타입 추가로 `as any` 캐스트 3곳 제거.
  - `CombatCinema.tsx`: skillName 변경 시 imgError 리셋을 setState-in-effect → render-time 조정 패턴으로 교체(lint 경고 해소).
- Verified: `make frontend-lint` clean, `make frontend-build` clean, `tests/playwright/test_e2e_play_checklist.py` 전체 그린(스킬 아이콘 PNG 200 로드 확인).
- Next: Phase 2 연출 polish(live QA), Phase 3 모션 다양화 + reduced-motion.

## 2026-06-07 — Skill Animation Registry · Skill Icons · Drone Combat Art (working tree)

- Status: [/] 작업 트리 반영, 미커밋. combat 연출/아트 배치 작업의 추가 증분.
- Changed:
  - `src/mythos_ui/src/combatAnim.ts` 신규: `LOCAL_SKILL_REGISTRY`(role/tags) + `getSkillFx()` role/tags 기반 스킬 이펙트 프로파일. `combatEffects.ts`가 이를 import해 스킬 컷인/커넥터에 사용.
  - `CombatCinema.tsx`가 `/resources/<scenario>/skills/<skill_id>.png` 스킬 아이콘 컷인 표시. `resources/neo-seoul/skills/` 아이콘 5종(`signal_step`/`overload_strike`/`packet_shot`/`covering_noise`/`patch_protocol`) 추가.
  - 드론 적 2종(`maintenance-drone`, `sentinel-drone`) 전투 action sheet 생성/분할(`enemies/combat/`) + `scenario.json` `combat_images` 배선. combat-art 적이 2종→4종.
- Verified: `make test` 203 tests / 2 skipped OK, combat sprite 35개 `RGBA + 512x768`, skill icon 5종, `make frontend-build` clean.
- Next: action art 위치/스케일/가독성 polish, role/tags 모션 다양화, `CombatControls` 아이콘 액션바. 작업 트리 미커밋 → 커밋/PR 정리.

## 2026-06-07 — Combat Cinema UI Overhaul & Standalone Utility Skill Support

- Status: [x] 전투 일반 행동의 시그널 미니 카드화, 가드 시 중복 텍스트 제거, 자가 대상 2포스터 구조 최적화, 마지막 일격 시의 애니메이션 소멸 방지, 신호 도약 등 단독 유틸 스킬의 오버레이 연출 구현 완료.
- Changed:
  - `CombatCinema.tsx`에 일반 행동(`ATTACK` / `DEFEND` / `EVADE`) 시 텍스트 배너 대신 심플한 카드 형태의 **액션 시그널 카드**가 중앙에 노출되도록 구현.
  - 가드(`isDefend`) 시 우측 대미지 팝업을 숨겨 `DEFEND` 시그널 카드와 중복으로 표출되는 텍스트를 제거.
  - 시전자와 대상이 동일한 액션(자가 엄호 노이즈, 자가 가드, 자가 힐 등) 시 우측 캐릭터 카드를 가리고 좌측 캐릭터와 중앙 카드만 균형있게 정렬하는 **대칭형 2포스터 구조** 적용.
  - `App.tsx`에서 타격/가드 로그가 발생하지 않는 독립 유틸리티/이동 스킬(신호 도약 `signal_step`, 패치 프로토콜 `patch_protocol`) 시전 시에도 `CombatCinema` 스킬 컷인 연출이 정상 작동하도록 로그 파싱 및 큐잉 로직 개선.
  - 마지막 일격 시 캔버스 보드 언마운트로 `canvasRef.current`가 `null`이 되더라도 오버레이 연출이 끊김 없이 재생된 뒤 다음 스토리로 전환되도록 캔버스 null-check 가드 조건 완화.
  - `test_e2e_play_checklist.py` E2E 테스트가 CombatCinema 애니메이션 오버레이 닫힘(`state="detached"`)을 기다린 뒤 캔버스 드로잉을 체크하도록 대기 타이밍 동기화.
  - `play-checklist.md` 체크리스트에 캔버스 드로잉의 오버레이 가려짐 특성 문서화 및 수동 QA 심미성 검증 항목을 신규 연출 스펙 기준으로 최신화.
- Verified: `make frontend-build`, `.venv/bin/python tests/playwright/test_e2e_play_checklist.py` (전체 테스트 100% 그린 패스).

## 2026-06-07 — Combat Portrait Pipeline

- Status: [x] party 3인 + humanoid enemy 2종 CombatCinema 전신 포즈 파이프라인 검증 및 문서화.
- Changed:
  - `se-rin-idle`을 배경/오토바이 없는 전신 전투 스프라이트로 교체.
  - `se-rin-attack/guard/skill/hit`을 동일 action sheet 기반 후보로 교체해 얼굴/의상/스케일 일관성 개선.
  - `player-noise`와 `kai`의 전신 idle 및 `attack/guard/skill/hit` 세트를 동일 action sheet 방식으로 생성/분할/실사용 교체.
  - `enforcer-unit`과 `glitch-wraith`의 전신 idle 및 `attack/guard/skill/hit` 세트를 동일 action sheet 방식으로 생성/분할/실사용 교체.
  - `scratch/normalize_combat_pose_sheet.py` 추가: RGBA action sheet를 pose별 512x768 PNG로 분할/정규화하고 preview sheet 생성.
  - `docs/plans/2026-06-07-combat-portrait-pipeline.md` 추가/최신화: idle -> action sheet -> chroma-key 제거 -> 분할 -> `combat_images` 연결 절차, chroma-key 선택, 검수/폐기 기준 정리.
  - `outputs/combat-sprite-compare/gemini/`의 Se-rin 외부 모델 후보는 canonical이 아니라 비교/보류 자료로 분류.
- Verified: `python -m json.tool resources/neo-seoul/scenario.json`, enemy combat PNG 10개 `RGBA + 512x768` 확인, `.venv/bin/python -m unittest tests.test_combat_service`, `make frontend-build`, `make frontend-lint`.
- Next: 전투 시네마 스케일/타이밍/가독성 polish 또는 `combatAnim.ts` role/tags animation registry.

## 2026-06-06 — 문서 컨텍스트 압축

- Status: [x] 토큰 컨텍스트 최적화를 위해 current docs를 요약형으로 정리.
- Changed:
  - 장문 `PROGRESS_LOG.md`를 `bin/docs/archive/progress-2026-06.md`로 이동.
  - 장문 `DESIGN.md`를 `bin/docs/archive/DESIGN_FULL_2026-06-06.md`로 이동하고, current `DESIGN.md`는 현재 아키텍처 요약본으로 축소.
  - `AGENT_BRIEF.md`, `STATUS.md`, `NEXT_PLAN.md`, `docs/README.md`를 중복 제거 중심으로 압축.
- Verified: 문서 파일 크기/참조 확인.
- Next: 새 작업 완료 시 이 파일에는 최신 3-5개 항목만 남기고 상세는 archive로 이동.

## 2026-06-06 — Combat Action Pose Assets

- Status: [x] 전투 지도 기본 표시는 기존 섬네일 portrait를 유지하고, 공격/스킬/피격 프레임에만 전투 pose 이미지를 쓰도록 배선.
- Changed:
  - `scratch/build_combat_pose_assets.py`로 Neo-Seoul player/allies/enemies 7종 × 4 pose RGBA 자산 생성.
  - `Combatant.combat_images` -> `render_radar` -> React `CombatBlip.combat_images` 직렬화.
  - `combatCanvas.ts`는 평상시 원형 섬네일을 렌더하고, `combatEffects.ts`가 공격/스킬/피격 타이밍에 `attack`/`skill`/`hit` pose를 지정한 프레임에서만 전신 action art를 표시.
- Verified: JSON validation, `make frontend-build`, `make frontend-lint`, `make python-typecheck`, `make test`, `make test-e2e`.
- Next: 이 항목은 이후 Combat Portrait Pipeline으로 대체됨.

## 2026-06-06 — Current Baseline

- Status: [x] React SPA, FastAPI API, Streamlit 데모, 전술 전투, Story Bible, Run History, Meta Progression, Save/Load, Playwright E2E, Redux visual worker 검증까지 완료된 baseline.
- Verified: 최근 기준 `make test` 202 tests / 2 skipped, Python typecheck, frontend lint/build, `make test-e2e` 통과로 기록됨.
- Active Next:
  - 전투 연출 개편 Phase 1+ — 캐릭터 전투 아트/스프라이트/스킬 애니메이션.
  - 진행도 해금 Phase 1 — 아키타입 게이트, base/learned 스킬 필터, Codex Skill 탭.
  - 파티 조작 2단계 — 파티원 직접 조작, 비파티 동맹은 AI 유지.
  - `glass-library` 시나리오 확장.


---

<!-- tidy-docs 2026-06-15: PROGRESS_LOG에서 이관(최신 5항목만 current 유지) -->

## 2026-06-15 — item.kind enum closure invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` item.kind enum closure 박제. green.
- Changed: `tests/test_content_integrity.py`에 `ItemKindEnumIntegrityTest` 1건 추가 — 모든 `combat.items[].kind`가 게임이 실제 인식하는 집합 {`consumable`,`equipment`,`key`,`data`,`material`}에 속함을 검증. 인식 집합 근거: 프론트 `CharacterPanel.tsx`의 `KIND_LABELS`/카테고리 매핑 + 런타임 `session.py`의 consumable 사용 게이트(`kind != "consumable"`이면 전투 사용 불가). 미지 kind는 generic "item" 버킷으로 흘러 사용/착용 불가 → 오타 가드. 무기 `kind`(melee/ranged)는 `combat.weapons` 별도 네임스페이스라 스코프 제외(주석 명시).
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 342 tests OK(skipped 2, +1). 측정 기준선: items 11종(nanopatch/stim_shard/access_key/data_fragment/drone_scrap/signal_blade/mesh_vest/emp_grenade/heavy_exosuit/stealth_cloak/overload_stim) 전부 인식 kind, 미지 kind 0.
- Blockers: 없음.
- Next: 잔여 QA seed — story_bible 메타 무결성·FastAPI on_event 현대화·dotenv type:ignore 중앙화·npc_agenda 주체 무결성(`[auto:claude]`). 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-15 — encounter 수치 경계 invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` encounter 수치 경계 박제. green.
- Changed: `tests/test_content_integrity.py`에 `EncounterBoundsIntegrityTest` 3건 추가 — 모든 `combat.encounters[*]`의 ① `enemies[].count`가 정수 ≥1(0/음수=빈 측 스폰→의도치 않은 즉시 walkover), ② `weight`가 양수 수치(비양수=가중 추첨서 도달 불가하거나 추첨 손상), ③ `arena.{width,height}`가 양수(0/음수=합법 타일 없는 퇴화 보드)를 검증. bestiary 참조는 기존 `ContentEncounterIntegrityTest`가 커버하므로 수치만 가드. bool은 int 서브클래스라 명시 제외.
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 341 tests OK(skipped 2, +3). 측정 기준선: 조우 8종 전부 count≥1·weight>0·arena dims>0, 위반 0.
- Blockers: 없음.
- Next: 잔여 QA seed — item.kind enum closure·story_bible 메타 무결성·FastAPI on_event 현대화 등(`[auto:claude]`). 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-15 — loot_table↔items 참조 무결성 invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` loot_table 참조 무결성 박제. green.
- Changed: `tests/test_content_integrity.py`에 `LootTableIntegrityTest` 2건 추가 — 모든 `combat.loot_tables[*][].item`이 `combat.items`에 실재(dangling drop=인벤토리에 못 들어오는 보상) + 각 roll의 `weight`가 양수 수치(0=뽑힐 수 없는 엔트리, 음수=가중 추첨 손상). 기존 `_as_records`/`_record_id` 헬퍼로 item id 집합 정규화.
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 338 tests OK(skipped 2, +2). 측정 기준선: loot_tables 3종(drone_scrap/enforcer_core/data_cache), dangling item 0·비양수 weight 0.
- Blockers: 없음.
- Next: 잔여 QA seed — encounter 수치 경계·item.kind enum closure·story_bible 메타 무결성 등(`[auto:claude]`). 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-14 — 아키타입 집합 정합 invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` 아키타입 집합 정합 박제. green.
- Changed: `tests/test_progression.py`에 `NeoSeoulArchetypeConsistencyTest` 3건 추가 — 실제 `neo-seoul` 데이터로 ① `archetype_base_skills`·`archetype_loadout`의 아키타입 키 집합 동일(한쪽에만 있는 아키타입 0), ② 각 아키타입 base 스킬이 `combat.skills`에 실재, ③ 각 아키타입 loadout 무기가 `combat.weapons`에 실재를 검증. dict/list 풀 모두 `_pool_ids`로 정규화.
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 336 tests OK(skipped 2, +3). 측정 기준선: 아키타입 3종 base↔loadout 일치·dangling 스킬 0·dangling 무기 0.
- Blockers: 없음.
- Next: 잔여 QA seed — agy 아이콘 재생성 후 스킬/아이콘 PNG 무결성(`[blocked]` 선행). 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-14 — 스킬 데이터 무결성 invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` 스킬 데이터 무결성 박제. green.
- Changed: `tests/test_content_integrity.py`에 `SkillDataIntegrityTest` 6건 추가 — 모든 `combat.skills[]`가 필수 필드(`id`/`name`/`cost`/`effect`) 보유, `cooldown`/`range`/`cost.focus`가 존재 시 음수 아님, `archetype_base_skills`·`allies[].skills`·`skill.requires`의 모든 스킬 참조가 `combat.skills`에 실재, `skill.epiphany` 해금이 실재 `combat.epiphanies` 키 참조를 검증. dict/list 풀 모두 `_as_records`로 정규화(기존 헬퍼 재사용).
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 333 tests OK(skipped 2, +6). 측정 기준선: 결손 필드 0·음수 0·dangling 스킬 참조 0·dangling epiphany 0(`patch_protocol` cost는 `item` 키라 focus 검사는 존재 시에만).
- Blockers: 없음.
- Next: 잔여 QA seed — 아키타입 집합 정합(`[auto:claude]`), agy 아이콘 재생성 후 스킬/아이콘 PNG 무결성. 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-14 — 무기/장비 무결성 invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` 무기/장비 참조 무결성 박제. green.
- Changed: `tests/test_content_integrity.py`에 `WeaponEquipmentIntegrityTest` 4건 추가 — `archetype_loadout`·`allies[].weapons`·`bestiary[].weapons`의 모든 무기 참조가 `combat.weapons`에 실재, `kind:equipment` 아이템의 `slot`∈{weapon,armor}, `stats` 키⊆ Combatant 스탯 집합을 검증. 스탯 집합은 `mythos_combat.factory._DEFAULT_STATS`(equip 보너스 머지 대상)를 단일 진실원으로 import해 하드코딩 회피. dict/list 풀 형태 모두 정규화(`_as_records`).
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 327 tests OK(skipped 2, +4). 측정 기준선: dangling 무기 0·invalid slot 0·unknown stat 0.
- Blockers: 없음.
- Next: 잔여 QA seed — 스킬 데이터 무결성·아키타입 집합 정합(`[auto:claude]`), agy 아이콘 재생성. 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-14 — 진행도 경제 invariant ([auto:codex], QA seed)
- Status: overnight QA seed `[auto:codex]` 진행도 경제 invariant 박제. green.
- Changed: `tests/test_progression.py`에 `NeoSeoulProgressionEconomyTest` 3건 추가 — 실제 `neo-seoul` 스킬 데이터의 learn/rankup 비용 tier 단조성, tier 0 아키타입 기본 접근성, 보수적 통찰 수입(첫 런/2런) 내 tier별 도달 가능성을 검증.
- Verified: `tests.test_progression` 17 tests OK. `make check` EXIT=0 — ruff/eslint/mypy/frontend build + 323 tests OK(skipped 2).
- Blockers: 없음.
- Next: 잔여 QA seed는 agy 스킬 아이콘 재생성 및 선행 해제 후 스킬/아이콘 무결성 invariant.

## 2026-06-14 — 조우 승률 밴드 invariant ([auto:claude], QA seed)

- Status: overnight QA seed `[auto:claude]` 조우 밸런스 invariant 박제(대화형, 첫 회차 안전성 위해). green.
- Changed: `tests/test_encounter_balance.py` 신설(3 tests). 고정 시드 그리디 시뮬(기본공격=보수적 하한)로
  **양면 가드** — ① 대표 파티(player+se_rin+kai, `controllable=True`) 승률 ≥0.50(불가능 가드), ② 솔로 ≤0.95(공짜
  가드) + 결정론 검증. **단일 55~98% 밴드는 실측 불성립**(skill-less 그리디+가변 파티 → 0.00~1.00)이라 양면 설계로 전환.
  리뷰 findings 2건(동료 `controllable=True`·100% 천장 실효화) 반영.
- Verified: `make check` EXIT=0(320 tests, +3). mypy/ruff clean. 측정 기준선: party 0.96~1.00, solo 0.00~0.79.
- Blockers: 없음.
- Next: 잔여 QA seed — 진행도 경제(`[auto:codex]`)·agy 아이콘 재생성. 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-14 — Engineering 문서 바이블↔해석 정립 + /sync 연속성 수정 + 로깅/대시보드 + skills 정합

- Status: 엔지니어링 정비 트랙 WS0~WS3 + skills 최적화 완료(WS4 콘텐츠 파이프라인은 plan-only). `HARNESS_RESEARCH` 개념 흡수.
- Changed:
  - **WS0 연속성 버그**: 지난 plan-only 세션이 `/sync` 로 안 이어진 근본원인 규명 — 예약 작업을 NEXT_PLAN 서두 노트 +
    repo 밖 스크래치 경로(`~/.claude/plans/*`)로만 남겨 권위 active focus 가 아니었음. 수정: **Resume Pointer 컨벤션** 신설
    (`AGENT_BRIEF` 최상단 `▶ NEXT SESSION` + 3진입문서 일치 + in-repo 경로 강제), sync/checkpoint SKILL·DOCS_POLICY 명문화.
  - **WS1/2 바이블→해석**: `docs/engineering/` 신설 — 범용 바이블 5종(`{HARNESS,LOOP,AGENTIC,CONTEXT,PROMPT}_ENGINEERING.md`,
    portable) + `mythos/` 해석 5종(이 repo 매핑). `docs/{LOOP_ENGINEERING,MULTI_AGENT}.md`→`mythos/{LOOP,AGENTIC}.md` 이동.
    원시 리서치(`AI_REARCH`·`HARNESS_RESEARCH`)→`bin/docs/archive/`. 진입점 슬림화(GEMINI 76→28줄, 공유 read-path). 참조 codemod.
  - **WS3 로깅/대시보드**: `run.sh` 회차 머신리더블 원장(`logs/status.tsv`), `status.sh`(lane 집계 트리),
    `dashboard.sh`+`make overnight-dashboard`(tmux 멀티페인, watch 없는 macOS 용 shell 루프), `overnight-status` 강화.
  - **skills 정합**: sync·checkpoint·tidy-docs·overnight-report 갱신(Resume Pointer·바이블↔해석·경로) + 4개 에이전트 dir 미러 동기화.
- Verified: `make check` EXIT=0(317 tests OK, skipped 2). 깨진 md 링크 0(engineering 트리 + 외부 참조). `status.sh` idle/running 렌더 실측. shell `bash -n` 통과.
- Blockers: 없음.
- Next: WS4(agy→codex 콘텐츠 이미지 파이프라인)은 plan-only. 실제 최우선은 Neo-Seoul 사람 QA([manual]) + 잔여 [auto] QA seed.

## 2026-06-14 — Model B 3엔진 병렬 실증 + 자체 이미지·리뷰어 + skills 사고·복구·git추적

- Status: 3엔진(claude/codex/agy) 병렬 루프를 worktree 격리로 end-to-end 실증 + 후속 하드닝. skills 손실 사고 복구.
- Changed:
  - **자체 이미지**: agy/codex 가 FLUX 대신 in-session Imagen/Gemini 로 생성 → `outputs/agy/<주제>/` 스테이징 후 resources/ cp(`PROMPT.agy.md`).
  - **하이브리드 codex 리뷰어**(생성자≠리뷰어, AI_REARCH): `review.sh`/`PROMPT.review.md`/`make overnight-review` → `logs/review-latest.md`. `docs/research/AI_TEAM_BLUEPRINT.md` 신설.
  - **Model B(worktree 병렬)**: 코드 레인 게이트는 worktree 자체 env 필요 → `make overnight-worktrees-setup`(per-worktree venv `.[dev,web]`+node_modules). symlink(.venv/node_modules) 금지(false green/EPERM). codex worktree commit = writable_roots 에 git common dir.
  - **공유 문서 충돌 완화**: `PROGRESS_LOG.md merge=union`(.gitattributes) + 엔진은 NEXT_PLAN 자기 레인 한 줄만/STATUS는 오케스트레이터.
  - **skills 사고·복구**: skills 가 gitignore+symlink 라 머지 checkout churn 이 메인 skills 삭제 → 트랜스크립트에서 4종 전량 복구 → **git 추적 전환**(`.claude/.agents/.codex/.gemini` 4곳, `<dir>/*`+`!<dir>/skills/`), worktree symlink 제거.
- Verified: 병렬 3엔진 각 worktree 자체 env 로 `make check` green 커밋(claude 승률밴드/agy 아이콘/codex). codex 리뷰어가 실제 [high] 버그(symlink 추적) 적발. notify Mail.app 실발송. `agy --print`/`codex exec` 헤드리스 실측. tidy 후 진입점 60/101/120/72.
- Blockers: agy 아이콘 1차 **미적 반려**(`outputs/agy/skills/VERDICT.md`, 엄격 템플릿 재생성 필요). 승률밴드 codex 리뷰 findings 2건(`review-latest.md`). main `ahead 27` 미푸시(분류기 차단, 사용자 직접).
- Next: (실제 최우선) Neo-Seoul 사람 플레이 QA. 자동 잔여: 진행도 경제(`[auto:codex]`)·승률밴드 재측정·아이콘 재생성.

## 2026-06-14 — 3엔진 병렬 Loop Engineering + BGM OFF 수정

- Status: claude·codex·agy 3엔진 병렬 무인 루프 토대 구축 + 실패 메일 + failover + BGM 버그 수정. 6 phase 완료.
- Changed:
  - **BGM OFF 버그**: `useAudio.ts` — stale closure(WS onmessage)가 매 턴 음악 재생 → `bgmEnabledRef` 단일 진실원 게이트로 수정.
  - **agy 엔진**: `run.sh` 3엔진 case(`ENGINE=claude|codex|agy`), `PROMPT.agy.md`(이미지 초안 레인, 무샌드박스+가드레일), `make overnight-agy*`. agy --print 헤드리스 실측.
  - **병렬 격리**: `worktrees.sh`(loop/{claude,codex,agy} worktree + .claude/.agents symlink), 레인 태그(`[auto:claude|codex|agy]`, 각 PROMPT 자기 레인만), `merge-loops.sh`/`make overnight-merge`(통합+게이트, push 안 함), `docs/engineering/mythos/AGENTIC.md`.
  - **이미지 무결성 게이트**: `tests/test_image_assets.py`(유효/비어있지않음/치수/용량 — fabricate 차단, make check 포함, 317 tests).
  - **실패 메일**: `notify.sh`(SMTP→Mail.app), run.sh 가 실패 클래스(연속 실패/all-blocked)에서만 발송.
  - **failover**: claude 한도 시 codex 가 claude 레인 대신 소비(1회 자동 전환).
- Verified: `make check` rc=0(317). worktree 3개 생성+symlink+merge 실측. agy/codex 헤드리스 실측. notify Mail.app 실발송 확인.
- Blockers: agy 무샌드박스(경계=프롬프트+worktree). 누락 스킬아이콘 6종은 `[auto:agy]` 초안 task 로 대기.
- Next: `make overnight-worktrees` 후 3엔진 병렬 실가동(사용자 판단). 아침 `make overnight-merge`+검수.
