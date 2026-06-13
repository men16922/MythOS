# Progress Log

최종 갱신: 2026-06-14

이 파일은 **최신 증분 요약만** 유지한다. 긴 2026-06 상세 로그(route-node 세션 단계별 상세 포함)는
`bin/docs/archive/progress-2026-06.md`, 2026-05 로그는 `bin/docs/archive/progress-2026-05.md`를 본다.

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
