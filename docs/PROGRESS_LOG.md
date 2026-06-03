# Progress Log

최신 작업만 유지하는 짧은 로그다. 2026-05 전체 상세 이력은 `docs/archive/progress-2026-05.md`에 보관했다.

형식:

```text
YYYY-MM-DD
- Status:
- Changed:
- Verified:
- Blockers:
- Next:
```

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
