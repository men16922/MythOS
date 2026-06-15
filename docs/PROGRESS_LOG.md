# Progress Log

최종 갱신: 2026-06-16

이 파일은 **최신 증분 요약만** 유지한다(최신 5항목). 긴 2026-06 상세 로그(route-node 세션 단계별 상세 포함)는
`bin/docs/archive/progress-2026-06.md`, 2026-05 로그는 `bin/docs/archive/progress-2026-05.md`를 본다.

## 2026-06-16 — relationship 타깃 무결성 invariant (시드 A, `[auto:claude]`, QA seed)
- Status: overnight `[auto:claude]` 시드 A — `effect.relationship` 키 무결성 invariant 박제. green.
- 측정: `effect.relationship` 델타는 전부 route_map perspective에만 존재(재귀 스캔). neo-seoul 키 = `{se_rin, kai, lin_yue}`, glass-library = 없음. combat ally id = `{se_rin, kai, tae_o, han, su_ah}` → `se_rin`/`kai`는 ally로 해소되나 `lin_yue`(린위에, 야시장 브로커 — 비전투 동료, 권위 plan 2026-06-16 동료 6인 로스터 line 17)는 ally 부재. characters[]에는 slug 없음(Korean name only)이라 슬러그 해소 불가.
- Changed: ① `resources/neo-seoul/scenario.json`에 `relationship_subjects: ["lin_yue"]` 선언(npc_agenda_allowed_subjects 패턴 — 비전투 동료의 명시 allowlist, 런타임 L/M/N 호감도 누적이 공유할 단일 출처). ② `tests/test_content_integrity.py`에 `RelationshipSubjectIntegrityTest` 2건 + 헬퍼 `_ally_ids`/`_relationship_keys`(재귀): 모든 relationship 키 ∈ (combat ally id ∪ `relationship_subjects`)(오타=유령 동료에 조용히 호감 적립 가드) + anti-rot(선언 주체는 실사용 + ally 비섀도, 1출처). glob으로 전 시나리오 자동 커버.
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(116 files)/frontend build + **362 tests OK**(skipped 2, +2). 고장주입 3/3 RED 확인(오타 키 `se_rim`·stale subject·ally 섀도잉).
- Blockers: 없음.
- Next: 시드 B(`effect` 키 closure invariant) → C(prompt-layer Phase 3) 등 잔여 `[auto:claude]`. 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-16 — prompt-layer 분리 Phase 0-2 + 동료 호감도/컷씬 계획
- Status: 코드↔프롬프트 레이어 분리 리팩토링 Phase 0-2 완료. 동료 호감도/컷씬 언락 우선순위 계획 수립.
- Changed: **Phase 0** NEW `scenario_directives.py`(`directives/*.md` Markdown 로더+순수 파서+KeyError-tolerant placeholder)+`NarrativeContext.fallback_scene`+`docs/PROMPT_LAYER.md`(분석). **Phase 1** NEW `fallbacks.py` — director↔parser fallback prose 8곳 중복을 단일 `DEFAULT_FALLBACK`로, director는 `context.fallback_scene or DEFAULT_FALLBACK`. **Phase 2** 오프닝 ONBOARDING ~100줄 하드코딩 → `resources/neo-seoul/directives/opening.md`, `scenario_context`는 제네릭 어셈블러(게이팅·shot·채널만 코드). 계획 `docs/plans/2026-06-16-companion-affection-cutscenes.md` + NEXT_PLAN Priority 0.
- Verified: `make check` green(360 tests/116 files) + 어셈블러 출력 byte-exact 파리티(turn 0-4: 1139/1009/871/1140/870) + 실제 Ollama 3턴 회귀.
- 발견: `effect.relationship` 델타(scenario.json perspective/choice) 저작됐으나 `route_runtime.py:96`이 flags만 적용 → **무시(dead data)**. 호감도 시스템 = 누적 배선이 핵심.
- Blockers: 없음. main ahead 미푸시(사람).
- Next: Priority 0 — P0 호감도 런타임(dead data 활성화) → Phase 3/노드-주소 지정 → P1 컷씬.

## 2026-06-16 — 오프닝 5컷 정합 + 4개 근본수정 (서사 파이프라인 디버깅)
- Status: 오프닝 장면↔이미지 불일치(지하 data-layer 드리프트) 디버깅서 4개 독립 근본원인 수정 + 오프닝 5컷화.
- Changed: ① 오프닝 지시를 truncation되는 `novelty_notes` → `session_synopsis` 전량 채널 이동(`MAX_PROMPT_NOTES=8` 컷오프에 잘려 모델 미도달이 근본원인). ② phase-무관 turn(0-4) 발동(`requested_next_phase`가 EXPLORE 넘기면 지시 통째 스킵 버그). ③ `_apply_novelty_guard` 오프닝(turn≤4) skip("Changed…/다른 압력이 끼어든다" 장면 훼손). ④ 파서·fallback raw-ID `"data-layer-01"`→prose. + `opening_escape` 5번째 컷, 비트별 필수사건/forbidden/location lock 강화.
- Verified: `make check` green + 실제 Ollama 5턴 in-process로 turn 0-2 안정 정합(turn 1 세린 등장 — 직전엔 누락). 8B 후반 변동성은 모델 한계로 별개.
- Blockers: 없음.
- Next: prompt-layer 분리(위 항목).

## 2026-06-15 — npc_agenda 주체 무결성: 사람 triage→allowlist 재정의 후 green (사람 결정, 구현 claude)
- Status: 전날 overnight서 결정론적 설계 모호로 `[blocked]`였던 npc_agenda invariant를 사람 triage로 해제. triage 결정 = **추상 주체 allowlist로 재정의**. invariant 구현·박제 green.
- 검증(overnight 산출물 직접 재검증): 신규 4 invariant(loot_table/encounter bounds/item.kind/story_bible)에 고장 주입 7/7 RED 확인(허위 green 없음). item.kind enum이 프론트 `KIND_LABELS`(generic "item" fallback 제외) + `session.py` consumable 게이트와 일치 확인. 두 codemod(lifespan `close_pool()` 보존·dotenv import ignore 5건 제거+`=None` fallback 보존) 동작 불변 확인. Blocker 주장 3건(`npc_agendas`는 `scenario_context.py:599-601` director 힌트 문자열 전용 / neo-seoul `최적화 명단 대상자` 1건 미스 / glass-library `characters[]` 키 부재) 전부 실파일 대조 사실 확인.
- Changed: ① `resources/neo-seoul/scenario.json`·`resources/glass-library/scenario.json`에 `npc_agenda_allowed_subjects` 선언(neo-seoul `["최적화 명단 대상자"]`, glass-library `["이오","미로","백색 제본사"]` — 이 시나리오는 `characters[]` 미모델링). ② `tests/test_content_integrity.py`에 `NpcAgendaSubjectIntegrityTest` 2건: 모든 `npc_agendas` 키 ∈ (`characters[].name` ∪ `npc_agenda_allowed_subjects`)(오타=GM에 허위 이름 주입 가드) + anti-rot(선언 주체는 실사용 + characters 비섀도, 1출처 강제). glob으로 전 시나리오 자동 커버. 고장 주입(오타 키·stale allowlist) 2/2 RED 확인.
- Verified: `make check` EXIT=0 — mypy 113 files clean / frontend build / **347 tests OK**(skipped 2, +2).
- Blockers: 없음(해제).
- Next: claude 레인 잔여 `[auto]` — 스킬/아이콘 무결성(`[auto:agy]` 아이콘 6종 선행 미충족 `[blocked]`)만 남음. 실제 최우선은 Neo-Seoul 사람 QA([manual]). 미푸시 ahead 누적 — 사람 직접 push.

## 2026-06-15 — npc_agenda 주체 무결성: Blocker (사람 triage 필요, [auto:claude])
- Status: overnight `[auto:claude]` npc_agenda 무결성 invariant — **Blocker(결정론적 설계 모호 → 사람 triage)**. 코드/테스트 변경·커밋 없음(잘못된 invariant 박제 회피).
- 측정(수정 전): `npc_agendas` 키는 `scenario_context.py:599-601`에서 director 힌트 문자열(`SCENARIO_NPC_AGENDAS: …`)로만 소비되는 NPC 어젠다 **주체 라벨**이며 `characters[].name`일 필요가 없음. 실데이터 대조 결과 strict invariant("모든 agenda 키 ∈ characters[].name")는 정당한 설계 이유로 RED:
  - neo-seoul(5): 정세린/린위에/관리자 IX/카이는 캐릭터명 정확 일치, `최적화 명단 대상자`는 **의도된 추상/집합 주체**(이름 없는 '명단 대상자', 캐릭터 아님 — goal="자신이 왜 지워져야 하는지 모른 채…").
  - glass-library(3): `characters: []`가 **비어있음** → 어젠다 전부(이오/미로/백색 제본사) 미스. 이 시나리오는 캐릭터를 top-level 배열로 모델링하지 않음. NEXT_PLAN 노트 예상(neo-seoul `최적화 명단 대상자`) + glass-library 공백을 추가 발견.
- 판단: green화에는 (a) 콘텐츠 편집(금지 작업 클래스) 또는 (b) 추상 주체 allowlist 고안(무인 검증 불가한 설계 판단)이 필요 → 둘 다 mandate 위반. 항목 노트가 "Blocker면 사람 triage"로 사전 승인한 케이스. CORE_MANDATES "애매하면 Blocker"에 해당.
- 사람 triage 질문: ① `최적화 명단 대상자`(+glass-library 어젠다)를 **허용된 비-캐릭터 주체**로 선언할지 vs 캐릭터로 모델링할지. ② glass-library `characters[]` 공백이 의도인지. 결정 시 invariant를 "캐릭터-참조 키는 정확 일치 + 선언된 추상 주체 allowlist 허용"으로 재정의 가능.
- Blockers: 위 설계 모호성(deterministic — 재시도 무의미하여 1회차에 `[blocked]` 마킹).
- Next: claude 레인 잔여 `[auto]` 없음(나머지 `[x]`/`[blocked]`) → `scripts/overnight/DONE`(all-blocked). 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-15 — dotenv import `type:ignore` 중앙화 ([auto:claude], codemod)
- Status: overnight `[auto:claude]` codemod. inline import ignore 제거, green.
- Changed: 5개 모듈(`mythos_memory/postgres_store.py`·`mythos_runtime/settings.py`·`mythos_image_agent/{config,generator,img2img}.py`)의 `from dotenv import load_dotenv  # type: ignore[import-untyped, import-not-found]` 인라인 ignore를 전부 제거. dotenv missing-stub 처리의 중앙 설정은 이미 `pyproject.toml [tool.mypy] ignore_missing_imports = true`(전역)가 담당하고 있어 인라인 ignore는 순수 잉여였음 → 그 잉여만 정리(새 override 추가 안 함 — 전역이 곧 모듈 설정). `except ImportError` 분기의 `load_dotenv = None  # type: ignore[assignment]`는 별도 에러 클래스(import-not-found 아님)라 스코프 외로 보존. `grep -rn 'dotenv.*type: *ignore' src tests` 결과 import-line 0건 잔존.
- Verified: `make check` green — ruff/eslint/mypy(113 files, no issues)/frontend build + 345 tests OK(skipped 2). mypy가 잉여 ignore 제거 후에도 0 errors라 인라인이 전역 설정에 의해 이미 덮여 있었음을 확증.
- Blockers: 없음.
- Next: 잔여 QA seed — npc_agenda 주체 무결성(`[auto:claude]`, Blocker 예상 → 사람 triage). 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-15 — FastAPI on_event → lifespan 현대화 ([auto:claude], codemod)
- Status: overnight `[auto:claude]` codemod. deprecation 사용 0, green.
- Changed: `src/mythos_api/app.py`의 `@app.on_event("shutdown")` 훅을 모듈 레벨 `_lifespan` async context manager(`@asynccontextmanager`)로 이전하고 `FastAPI(..., lifespan=_lifespan)`에 배선. yield 이후(shutdown)에 기존과 동일하게 `PostgresMythOSStore.close_pool()` 호출 — 동작 불변, startup은 무작업(풀은 첫 store 접근 시 lazy 생성). `on_event`는 Starlette/FastAPI에서 deprecated → lifespan이 권장 경로. `grep -rn on_event src tests` 결과 0건 잔존.
- Verified: `make check` EXIT=0 — ruff/eslint/mypy(113 files)/frontend build + 345 tests OK(skipped 2).
- Blockers: 없음.
- Next: 잔여 QA seed — dotenv type:ignore 중앙화·npc_agenda 주체 무결성(`[auto:claude]`). 실제 최우선은 Neo-Seoul 사람 QA([manual]).

## 2026-06-15 — story_bible 메타 무결성 invariant ([auto:claude], QA seed)
- Status: overnight QA seed `[auto:claude]` story_bible 메타 무결성 박제. green.
- Changed: `tests/test_content_integrity.py`에 `StoryBibleMetaIntegrityTest` 3건 추가 — `resources/*/story_bible/bible.json`(glob 자동 발견, 현재 neo-seoul·glass-library 2종)의 모든 entry에 대해 ① `id` 유일(중복=id-키 조회서 한쪽 섀도잉→스니펫 누락), ② `kind` 비어있지 않음(빈/누락=태깅/노트 디스크리미네이터 손실), ③ `priority`/`token_budget` 양수 수치(비양수=`select_story_bible_entries`서 정렬 최하위/패킹 기여 0 → 사실상 주입 불가)를 검증. 로더(`story_bible.py`)가 누락 필드를 기본값(priority 0/token_budget 600/kind "note")으로 관대 코어스 → 저작 슬립이 런타임서 침묵 → raw JSON 직접 가드. bool은 int 서브클래스라 명시 제외.
- Verified: `make check` EXIT=0(GATE_GREEN) — ruff/eslint/mypy(113 files)/frontend build + 345 tests OK(skipped 2, +3). 측정 기준선: neo-seoul 29 entries·glass-library 17 entries, 중복 id 0·빈 kind 0·비양수 priority/token_budget 0.
- Blockers: 없음.
- Next: 잔여 QA seed — FastAPI on_event 현대화·dotenv type:ignore 중앙화·npc_agenda 주체 무결성(`[auto:claude]`). 실제 최우선은 Neo-Seoul 사람 QA([manual]).

