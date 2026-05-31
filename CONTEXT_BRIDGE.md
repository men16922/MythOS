# Agent Context Bridge

이 파일은 에이전트 간 작업 맥락을 전달하는 '하네스'의 핵심 연결고리다.

## 🟢 현재 활성 작업 (Active Context)
- **주제**: 로그라이크 + 턴제 위치/거리 전술 전투 시스템.
- **상태**: **Phase A(엔진)·B(내레이터/레이더)·B3(CombatService + 세션 배선)·C 코어(레이더 HTML) 완료.**
  남은 것은 **streamlit UI 연결**(전투 분기) + **B1 world_delta 트리거**뿐. 엔진 권위 + LLM 서술. 전투 상태는 `loop.state` JSON.
  세션 API: `RuntimeSessionService.start_combat(loop_id, encounter_id)` / `combat_action(loop_id, PlayerAction)` → `RuntimeSnapshot.combat`(radar/available/finished/outcome/rewards). 패배 시 퍼머데스→ENDED+Echo.
- **검증(exit code)**: ruff 0 · mypy 0(76 files) · unittest 0(105, skipped 2).
- **설계 권위 문서**: `docs/plans/2026-05-31-roguelike-combat.md`.

## 🟡 다음 에이전트 가이드 (Handover)
신규 모듈(모두 pure·결정적·테스트 완료, session.py 미수정):
- `src/mythos_core/dice.py` — 시드 결정적 다이스(d20, `2d6+3`, 가중 선택).
- `src/mythos_combat/` — `models`(Combatant/Weapon/CombatState, JSON 직렬화), `engine`(initiative·이동·근접/원거리 명중·데미지·크리·적/아군 AI·도주·승패), `factory`(정본 5스탯→HP/방어/이동; 전투는 strength·agility), `encounter`(시나리오 풀→전투), `narrator`(전투 로그→한국어 산문 + `render_radar` 스냅샷).
- `resources/neo-seoul/scenario.json` `combat` 풀(weapons 8, bestiary 4, items 5, loot 3, encounters 4, archetype_loadout) + `ScenarioConfig.combat` 로더.

다음 단계 (남은 Phase B/C/D):
1. **B3 세션 배선(다음)**: `RuntimeSessionService`에 `start_combat(loop_id, encounter_id, options)` + `combat_action(loop_id, PlayerAction, options)` 추가. 내부적으로 `CombatService.begin/act` 호출 → loop 영속(store.save_loop) + 합성 Scene(scene_type="combat", narration=prose, choices=[]) 저장 → `RuntimeSnapshot` 반환. 종료 시 rewards의 tension→world_delta, 패배 시 퍼머데스→loop ENDED + Echo. **session.py(1022줄)는 fake-store 테스트(test_runtime_session.py 참고)로 검증.**
2. **B1 world_delta 확장**: `start_combat`(encounter id)/`grant_items`/`hp` 키 + Validator. 서사 장면이 전투를 트리거할 수 있게(엔진 권위 유지: 명중/데미지/이동은 LLM 불가).
3. **C 터미널 레이더 UI**: 이미지 옆 전술 보드. `render_radar()` 그대로 소비(격자/블립/깜빡임 CSS/HP/턴순서/액션 선택). iframe 금지 — `st.markdown` div. 전투 활성 시 서사 선택지 대신 전투 액션(공격/이동/방어/도주+타겟) 렌더.
4. **D 로그라이크 메타**: depth 스케일링, 절차적 전리품, 인카운터 구성, 밸런스.

신규(B3 코어, 검증됨): `src/mythos_runtime/combat_service.py`(`CombatService`/`CombatTurnResult`) + `tests/test_combat_service.py`(5).

## 🔴 위험 요소 및 미결 사항 (Open Issues)
- **streamlit UI 전투 연결 보류**: `streamlit_app.py`(2600줄) 읽기가 하네스 불안정으로 줄 중복/빈 응답이 잦아 블라인드 편집 위험. 읽기 안정화된 턴에 `_player_active_screen`(대략 line 1613~) 전투 분기 추가:
  - import: `from mythos_runtime.combat_ui import render_radar_html`, `from mythos_combat import PlayerAction`.
  - `snapshot.combat`가 있거나 `CombatService.is_active(loop)`면 서사 선택지/자유행동 대신: story_col에 `st.markdown(render_radar_html(snapshot.combat["radar"]), unsafe_allow_html=True)` + 전투 액션 버튼(타겟별 공격은 `available["targets"]`, 이동/방어/도주) → `_run_action(lambda s: s.combat_action(loop.loop_id, PlayerAction(...), options), on_success=_set_snapshot)`.
  - 전투 시작 트리거(임시): 개발자/플레이어 뷰에 "⚔ 교전" 버튼 → `start_combat(loop_id, "patrol_ambush", options)`. 정식 트리거는 B1.
- **하네스 불안정(이 세션)**: 파일 쓰기 "성공" 응답에도 디스크 미반영/대형 Read 깨짐 발생. 큰 파일 수정 시 **수정 후 grep/exit-code 재확인** 필수. (전투 백엔드는 모두 이렇게 검증 완료.)
- **이전 BGM 트랙**: 4분 WAV 실제 생성(`scripts/gen_bgm_single.py`)·오디오 메모리 점검은 여전히 유효한 미결 사항.
- **이미지 전투 연동**: 전투 핵심비트(전투 개시/처치/패배)에 이미지 트리거를 붙일지 Phase C/D에서 결정.
