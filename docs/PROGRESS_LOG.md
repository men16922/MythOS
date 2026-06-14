# Progress Log

최종 갱신: 2026-06-14

이 파일은 **최신 증분 요약만** 유지한다. 긴 2026-06 상세 로그(route-node 세션 단계별 상세 포함)는
`bin/docs/archive/progress-2026-06.md`, 2026-05 로그는 `bin/docs/archive/progress-2026-05.md`를 본다.

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
