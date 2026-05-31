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
