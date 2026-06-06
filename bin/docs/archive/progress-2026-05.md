# Progress Log

이 문서는 증분 작업 로그다. 최신 항목을 위에 추가한다.

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

- Status: [x] 전투 UI 3종 버그 수정 — 스킬창 흰 박스 / 이동 무반응 / 스킬 클릭 시 화면 blank.
- Changed:
  - **이동 무반응**: 전술 보드에서 플레이어 신호를 클릭하면 `combat_selected_unit`만 토글되고 `@st.fragment`가 재실행되지 않아 보드가 이동 가능 칸을 다시 그리지 않았다. `_render_combat_arena_fragment`의 hidden-action 처리에서 select·move 직후 `st.rerun(scope="fragment")` 추가 → 선택 시 reachable 타일 즉시 표시, 이동 후 위치 갱신.
  - **스킬 클릭 blank**: 액션 버튼들이 `action_area.empty()`로 컨트롤을 비운 뒤 rerun 없이 끝나 패널이 빈 채 남았다. `_render_combat_controls`에 `_dispatch()` 헬퍼(액션 실행 후 fragment rerun)를 두고 공격/스킬/아이템/방어/도주 버튼을 모두 경유시켜 액션 후 보드·로스터·컨트롤이 새 상태로 재렌더되도록 수정.
  - **스킬창 흰 박스**: `hidden_combat_action` 입력이 `label_visibility="visible"`이라 off-screen 숨김 CSS(`aria-label` 매칭)가 안 먹어 흰 입력칸으로 노출됐다. `label_visibility="collapsed"`로 변경하고, 숨김 CSS에 Streamlit key 컨테이너 클래스 `.st-key-hidden_combat_action` 셀렉터를 추가해 확실히 숨김.
- Verified: `make test`(118, 2 skipped) PASS, 변경 파일 ruff clean, Streamlit headless 부팅 200 OK 무오류. (AppTest는 fragment-scoped rerun을 전체 rerun으로 흉내내 무관한 KeyError가 나므로 브라우저 수동 회귀 권장.)
- Blockers: 없음(스킬 밸런스: 집중 +1/라운드 재생은 후속 검토).
- Next: 동료/파티 참전.

## 2026-05-31

- Status: [x] 전투 스킬/아이템 실행 엔진 배선 — 데이터 풀만 있던 스킬·소비품을 실제 액션 이코노미에 연결.
- Changed:
  - `Combatant`에 `focus`/`max_focus`/`skills`/`cooldowns`/`defense_buff`/`defense_buff_turns` 추가. `effective_defense`에 버프 반영. `factory.derive_max_focus`(연산 기반)로 집중 도출, `build_player_combatant(skills=...)`.
  - `PlayerAction.skill_id` 추가. `CombatEngine.take_player_turn(..., skill_def, item_def, item_available)` 확장: `_player_skill`(집중 비용·쿨다운·사거리 검증, 효과 move/damage/damage_bonus/defense_bonus/heal), `_player_item`(nanopatch 회복·stim_shard 집중), 라운드마다 `_tick_player_round`(집중 +1 재생, 쿨다운 감소, 버프 만료). 자원 부족/쿨다운/표적 부재 시 턴 미소모(적 턴 미진행).
  - 아이템 소비는 엔진이 로그 `detail["consumed"]`로 표기 → `CombatService.act`가 신규 로그를 스캔해 `_inventory`에서 차감·영속. `begin`에서 시나리오 `skills` 풀을 플레이어에 부여.
  - `render_radar` 블립에 `focus`/`max_focus`, `available_actions`에 `focus`/`skills`(쿨다운) 노출. Streamlit `_render_combat_controls`에 집중 게이지 + 스킬 버튼(비용/쿨다운/아이템 게이팅) + 인벤토리 소비품 버튼 추가. 스킬은 자동 표적(근접 사거리 내)·신호 도약은 적 방향 자동 갭클로즈.
  - (곁들임) `audio_service.py:77` 기존 mypy 오류(`filename` 재할당) 정리.
- Verified: `make test`(118, +8 신규 전투 스킬/아이템 테스트, 2 skipped) PASS, `make typecheck` PASS, `make smoke-local` PASS(visual smoke 포함). AppTest로 전투 진입 시 스킬 5종 버튼·집중 3/3·아이템 게이팅 무예외 렌더 확인.
- Blockers: `scripts/generate_sfx_resources.py`(다른 세션 미추적 WIP)의 lint 11건은 본 작업과 무관하게 선존재. 집중 +1/라운드 재생이라 비용 1 스킬은 사실상 매 라운드 사용 가능(밸런스 후속 검토 여지).
- Next: 동료/파티 참전(`allies` → `_party.members` → ally combatant), 도주 후 contact roaming 유지.

## 2026-05-31

- Status: [x] 전투(TACTICAL BOARD) 화면이 안 보이던 근본 원인 수정 — iframe 렌더 경로를 `st.iframe`로 교체.
- Changed:
  - 진단: 직전 작업이 정적 서버 + URL Hash로 전술 보드를 개선했지만, 그 보드 iframe을 여전히 `st.markdown(..., unsafe_allow_html=True)`로 출력하고 있었다. Streamlit 1.58의 markdown sanitizer가 `<iframe>` 태그를 제거하므로 보드는 끝내 빈 화면으로 남았다(전투 종료 SFX의 `st.markdown` iframe srcdoc도 동일 이유로 무재생).
  - 외부 static HTTP 서버(`_start_combat_static_server`)와 URL 해시 전달을 제거하고, 보드 HTML(CSS+JS)을 `streamlit_app.py`에 인라인 상수(`_COMBAT_BOARD_CSS`/`_COMBAT_BOARD_JS`)로 내장. `_build_interactive_board_html`가 전술 데이터와 SFX(소형 base64 data URI: `sfx_move` 등만)를 직접 주입한 뒤 `st.iframe`(권장 API, `st.components.v1.html`은 2026-06-01 제거 예정)로 same-origin srcdoc 렌더링.
  - srcdoc iframe이 Streamlit 메인 문서와 same-origin이라 기존 `window.parent.document` 기반 hidden input 액션 주입(드래그앤드롭/클릭 이동)·드래그 글로우 연출 그대로 유지. 포트레이트는 base64 data URI라 srcdoc에서도 표시.
  - 전투 종료 SFX도 `st.iframe`로 교체. 미사용이 된 `_start_combat_static_server`와 `import streamlit.components.v1` 제거.
- Verified: `make test`(110, 2 skipped) PASS. `_build_interactive_board_html` 산출물 검증. Streamlit headless 부팅 200 OK, deprecation 경고 소거. (브라우저 수동 드래그앤드롭 회귀는 후속 권장.)
- Blockers: 기존 WIP의 lint/typecheck 실패(`scripts/generate_sfx_resources.py`, `audio_service.py:77`, `_get_image_base64_cached` import 정렬)는 본 수정과 무관하게 선존재.
- Next: 전투 스킬/아이템 엔진 배선, 동료/파티 참전.

## 2026-05-31

- Status: [x] 전투 화면 렉/크래시 방지를 위한 URL Hash 기반 정적 서버 결합 및 CWD 스레드 세이프티 크래시 수정 완료. (※ 후속 항목에서 `st.markdown` iframe 제거 한계로 인해 `st.iframe` 인라인 방식으로 대체됨.)
- Changed:
  - `_render_tactical_board_interactive`가 매번 HTML 그리드를 리로드하여 화면 깜빡임과 렉을 유발하던 구조를 개선하여, 로컬 포트로 구동되는 `outputs/combat_board.html` 정적 파일을 iframe으로 로드하도록 변경.
  - 전술 데이터(`radar`, `reachable`, `selected`, `title`, `play_sfx`)를 JSON-encoded URL Hash(`#`)를 통해 실시간 전달하고, iframe 내부의 Javascript `hashchange` 이벤트 리스너가 감지해 0ms에 준하는 부드러운 그리드 리렌더링을 처리하도록 구조화.
  - 기존 렉과 브라우저 화이트 스크린 크래시를 유발하던 대용량 Base64 오디오 iframe srcdoc 인젝션 방식을 영구 폐기하고, 로컬 웹 서버 경로를 참조해 즉각 로드 및 재생하게 하여 렌더 노이즈와 메모리 오버헤드를 완전 소멸.
  - **[버그 수정]**: 로컬 웹 서버 스레드 내의 `os.chdir(root_dir)` 호출이 프로세스 전체의 작업 디렉토리를 변경하여 메인 스레드의 상대 경로 작업(.env 로드, 스냅샷 파일 I/O 등)을 깨뜨리고 전투 화면 노출을 막아버리던 스레드 비안전성 크래시를 발견하고, `SimpleHTTPRequestHandler` 인스턴스화 시 `directory` 파라미터를 넘겨주어 CWD 간섭 없이 독립적으로 서빙되도록 긴급 패치 완료.
- Verified: `make test` (110 tests) PASS, `make smoke-local` PASS. Streamlit 실행 시 전투 보드 렌더링 복구 및 무중단 오디오 출력 검증.
- Blockers: 없음.
- Next: 프론트엔드와 엔진의 결합성을 완전히 해소하기 위해 REST API/WebSocket 분리 설계를 도입하는 FastAPI 기반 백그라운드 엔진 마이그레이션(Phase 2) 기획.

## 2026-05-31

- Status: [x] 칩튠/사이버 스타일 효과음(SFX) 합성 리소스 및 다적 전투 BGM 동적 분기 시스템 구축 완료.
- Changed:
  - `scripts/generate_sfx_resources.py` 스크립트를 신규 개발하여 Transformers MusicGen의 무겁고 느린 온디맨드 추론 없이, numpy와 scipy.io.wavfile을 이용한 파형 합성(sine, saw, noise 등)을 통해 100% 로컬에서 1초 만에 6종 효과음(sfx_attack, sfx_defend, sfx_move, sfx_glitch, sfx_victory, sfx_defeat) 및 테크노 루프 BGM 3종(Normal, Boss, Crisis) 리소스를 빌드 완료.
  - 다중 전투 BGM(Battle BGM) 자동 분기: `audio_service.py` 내부에서 전투 활성화를 감지하고, 보스급 적 조우(Encounter ID 기반) 시 `bgm_combat_boss.wav` 재생, 아군 HP 위기(최대 HP의 35% 이하) 시 `bgm_combat_crisis.wav` 재생, 일반 전투 시 `bgm_combat_normal.wav`로 동적 BGM 스위칭 기능 구현.
  - 단발성 효과음(One-Shot SFX) UI 연동: 이동(타일 드롭/클릭), 공격(버튼 클릭), 방어(버튼 클릭), 도주(버튼 클릭), 전투 승리/패배(정산 화면 최초 1회) 시점에 `st.session_state.play_sfx`를 지정하고 `st.audio`를 통해 동시 재생 및 Rerun 시 중복 재생 차단용 플래그 락 메커니즘을 Streamlit 뷰에 통합.
- Verified: `make test`(110) PASS, `make smoke-local` 완료. SFX 및 다중 전투 BGM WAV 리소스 로컬 생성 완료 및 정상 재생 검증.
- Blockers: 없음.
- Next: 전투 스킬 및 아이템의 엔진 실배선, 동료 파티 참전 시스템 구현.

## 2026-05-31

- Status: [x] 전술 보드 마우스 드래그 앤 드롭 이동 및 썸네일 클릭 버그 수정 완료.
- Changed:
  - 전술 보드(`TACTICAL BOARD`)의 렌더링 방식을 `st.markdown`에서 `st.components.v1.html`을 통한 독립 iframe 렌더링으로 변경하여 브라우저 내 자바스크립트 실행을 100% 보장.
  - 마우스 드래그 앤 드롭 이동 구현: 캐릭터 썸네일을 직접 드래그해서 녹색 테두리 타일로 끌어다 놓으면 해당 타일로 실시간 이동 처리.
  - 드래그 중 이동 가능한 타일들의 점선 테두리에 은은하게 반짝이는 글로잉 맥박 효과(`@keyframes neon-glow-pulse`)를 적용하여 시각적 연출 및 드롭 가능 존 피드백 대폭 강화.
  - 캐릭터가 사전에 클릭으로 선택되지 않은 상태에서 드래그를 시작하더라도, 드래그 스타트 시점에 모든 이동 가능한 타일(active 및 inactive)을 임시로 드롭 존(`tac-reachable`)으로 승격하는 동적 승격 메커니즘 적용.
  - 캐릭터 썸네일 이미지 및 체력바 등 자식 요소에 `pointer-events: none` 스타일을 적용해 마우스 이벤트를 가로막던 충돌 현상을 원천 방지하여 클릭 미반응 및 드래그 시작 불가 버그 해결.
  - 브라우저 동일 Origin(Same-Origin) 하에서 `window.parent.document`를 참조하고, 포커스 가능한 크기의 화면 밖 절대 배치 기법(`left: -9999px`)과 엔터 키 이벤트의 풀 시퀀스(`keydown` ➡️ `keypress` ➡️ `keyup`) 에뮬레이션을 조합하여 Streamlit 백엔드로의 Submit 및 즉각 Rerun 강제 트리거를 100% 성공시킴.
  - 전투 보드 내 `board_grid_html` 중복 정의 버그 제거 및 코드 클리닝.
  - `_player_active_screen` 내에서 `if not snapshot.combat:` 일 때만 '전투 시뮬레이션 진입' 메뉴가 노출되도록 렌더 조건 수정.
- Verified: `make lint`, `make typecheck`, `make test`(110, 2 skipped) PASS. `make smoke-local` 완료. `make streamlit` 환경에서 드래그 앤 드롭 이동 및 썸네일 클릭 연동 검증 성공.
- Blockers: 없음.
- Next: 전투 스킬/아이템 실행(`PlayerAction(type="skill"|"item")`) 엔진 연동 및 동료/파티 참전 기능 구현.

## 2026-05-31

- Status: [x] 전투 결과 UX + 전술 보드 직접 이동 + 주인공/적 portrait 표시 최신화.
- Changed:
  - 활성 전투에서 중앙 `TACTICAL BOARD` 자체를 조작 보드로 사용. 플레이어 신호 `◎`를 선택하면 같은 보드 안의 이동 가능 칸을 직접 클릭해 이동.
  - 별도 “이동 좌표/이동 보드” UI 제거. 전투 명령 패널은 공격/방어/도주 중심으로 축소.
  - 전투 결과 패널 추가: 파티 생존, 적 격파, 플레이어 HP, 라운드/턴, 준 피해/받은 피해, 명중/빗나감/치명타, 루트, 판정 문구를 계산해 표시.
  - `RuntimeSessionService`가 combat summary를 snapshot에 포함하도록 확장. 종료 전투 resume 시에도 결과 계산 유지.
  - 전투 종료 후 비전투 장면에서는 종료된 combat payload를 더 이상 내려주지 않도록 `resume()` 조정.
  - 주인공 portrait(`characters/player-noise.png`)를 tactical board/roster/result panel에 표시.
  - 패배/세션 종료 버튼은 새 세션을 즉시 만들지 않고 `메인 화면으로 돌아가기`로 변경. 메인 화면에서 START/LOAD/NEW SIGNAL 선택.
- Verified: `make lint`, `make typecheck`, `make test`(110, 2 skipped) PASS. `make streamlit` 재시작 완료: `http://localhost:8501`.
- Blockers: Streamlit 기본 버튼 기반이라 HTML 이미지 셀 자체 drag/drop은 미구현. 필요 시 custom component가 필요.
- Next: 스킬 실행(`PlayerAction(type="skill")`), 아이템 사용, 동료 참전, drag/drop custom component 검토.

## 2026-05-31

- Status: [x] 플레이어 전투 초상 + 선택 후 이동 범위 UX + 스킬/동료 풀 설계 반영.
- Changed:
  - 플레이어 blip도 `characters/player-noise.png`를 썸네일로 사용하도록 UI fallback 추가.
  - 명령 콘솔 HTML 들여쓰기 문제 수정(코드블록처럼 노출되던 `<div class="combat-command-panel">` 제거).
  - 전투 조작을 “플레이어 신호 선택 → 이동 가능 칸 표시 → 칸 선택” 흐름으로 변경.
  - `scenario.json["combat"]`에 `skills` 풀 추가: 신호 도약, 과부하 일격, 패킷 사격, 엄호 노이즈, 패치 프로토콜.
  - `scenario.json["combat"]`에 `allies` 풀 추가: 정세린/카이, 숨겨진 recruit keywords, unlock flags, portrait, weapons, skills, stats.
  - `docs/BATTLE_ADVICE.md`에 현재 데이터 테이블 구조와 CRPG/JRPG식 스킬 역할 모델 정리.
- Verified: JSON parse, `make lint`, `make typecheck`, `make test`(110, 2 skipped) PASS. `make streamlit` 재시작 완료: `http://localhost:8501`.
- Blockers: 스킬 실행/동료 전투 참전은 아직 데이터 풀만 있고 엔진 액션으로 미연결.
- Next: `PlayerAction(type="skill")`, skill cooldown/cost, `_party.members` ally spawn 구현.

## 2026-05-31

- Status: [x] SRPG식 전술 보드 1차 적용 + 기존 전투 상태에서도 적 초상 역매핑.
- Changed:
  - 중앙 `TACTICAL RADAR`를 큰 셀 기반 `TACTICAL BOARD`로 교체. 플레이어/적 blip을 44px 셀에 표시하고, 적은 초상 썸네일+HP strip으로 식별 가능하게 변경.
  - `portrait`가 없는 기존 저장 전투 상태도 scenario bestiary의 `id/name -> image` 매핑으로 초상을 복원하도록 UI fallback 추가.
  - 화살표 이동 UI 제거. 현재 위치 주변의 이동 가능 칸을 직접 클릭하는 SRPG식 이동 보드로 변경(점유 칸은 `×`, 현재 위치는 `◎`).
  - 드래그 이동은 Streamlit 기본 위젯만으로는 안정적 이벤트 전달이 어려워, 우선 클릭-투-무브 방식으로 구현. 추후 custom component로 drag/drop 확장 가능.
- Verified: `make lint`, `make typecheck`, `make test`(110, 2 skipped) PASS. `make streamlit` 재시작 완료: `http://localhost:8501`.
- Blockers: Browser 플러그인 `iab` 세션 불가로 직접 시각 QA는 미수행.
- Next: 실제 화면에서 board cell 크기/명령 콘솔 밀도 확인 후 custom component 기반 drag/drop 필요 여부 결정.

## 2026-05-31

- Status: [x] 전투 UX 재배치 + 적 초상 리소스 연결 + roster HTML 노출 버그 수정.
- Changed:
  - 전투 화면 상단을 이미지 / 레이더+상태 / 명령 콘솔 3분할로 재구성. 전투 명령이 서사 텍스트 아래로 밀리지 않도록 이동.
  - 표적 선택 radio와 이동 좌표 selectbox 제거. 표적별 공격 버튼, 3x3 방향 이동/대기 버튼, 방어/도주 버튼으로 전투 조작 재설계.
  - roster HTML이 코드블록으로 출력되던 문제 수정(들여쓰기 있는 multiline HTML 제거).
  - 적 초상 4종 생성 및 `resources/neo-seoul/enemies/`에 저장: maintenance drone, sentinel drone, enforcer unit, glitch wraith.
  - `Combatant.portrait` + radar `portrait` 필드 추가, bestiary `image`를 roster avatar로 렌더.
  - Neo-Seoul system prompt에 `spawn_encounters` 설명 추가.
- Verified: `make lint`, `make typecheck`, `make test`(110, 2 skipped) PASS. `make streamlit` 재시작 완료: `http://localhost:8501`.
- Blockers: Browser 플러그인 `iab` 세션 불가로 직접 시각 QA는 미수행.
- Next: 브라우저에서 실제 레이아웃 확인 후 command console 폭/타깃 카드 밀도 미세 조정.

## 2026-05-31

- Status: [x] 작전 지도 기반 로밍 인카운터 + 적/파티 상태 UI + 밸런싱 설계 추가.
- Changed:
  - `src/mythos_runtime/encounter_map.py` 추가: `_encounter_map.contacts`로 사전 정의 인카운터를 작전 지도 주변에 배치, 턴마다 이동, 플레이어 현재 타일과 충돌 시 전투 트리거.
  - `world_delta.spawn_encounters` 스키마/파서/검증/상태 병합 추가. LLM은 즉시 전투(`start_combat`)와 지도 배치(`spawn_encounters`)를 구분 가능.
  - `RuntimeSessionService`가 서사 장면 커밋 후 encounter map tick을 수행하고, 접촉 충돌 시 `CombatService.begin()`으로 전환.
  - 전투 종료 보상 적용 시 동일 encounter contact를 `defeated`로 마킹.
  - Player 작전 미니맵에 적 접촉 blip 표시(붉은 점멸), 전투 레이더 옆에 PARTY/ENEMY roster(HP bar/좌표/상태) 추가.
  - Neo-Seoul encounter에 `risk`, `weight`, `map_distance` 밸런싱 메타 추가.
  - `docs/BATTLE_ADVICE.md` 상단에 MythOS용 로그라이크/CRPG 인카운터 테이블, 위험도, 보상, 소모품, 파티/적 UI 설계 정리.
- Verified: `make lint`, `make typecheck`, `make test`(110, 2 skipped) PASS. `make streamlit` 재시작 완료: `http://localhost:8501`.
- Blockers: Browser 플러그인 `iab` 세션 불가로 시각적 브라우저 QA는 미수행.
- Next: `nanopatch`/`stim_shard` 아이템 사용 액션과 `_party.members` 동료 전투 참여 구현.

## 2026-05-31

- Status: [x] 로그라이크 전투 UI 연결 + 서사 기반 전투 트리거 완료.
- Changed:
  - Player 화면에서 전투 중 `snapshot.combat`를 감지해 장면 이미지 옆에 터미널 레이더(`render_radar_html`)를 표시하고, 공격/이동/방어/도주 전투 명령을 `combat_action`에 연결.
  - `resume()`이 활성/종료 전투 스냅샷을 복원하도록 해 Streamlit rerun 이후에도 레이더와 전투 액션이 유지됨.
  - 전투 Scene에 `visual_brief`를 채우고 `scene_type="combat"`을 이미지 key beat로 처리해 전투 장면 이미지 생성 대상에 포함.
  - `world_delta.start_combat` / `grant_items` / `hp`를 스키마·파서·검증·루프 상태 병합에 추가. 서사 장면이 `start_combat` encounter id를 요청하면 런타임이 즉시 엔진 권위 전투로 전환.
  - Neo-Seoul 시스템 프롬프트에 전투 트리거 필드와 엔진 권위 규칙 추가.
  - 테스트 추가: 전투 중 resume 복원, `world_delta.start_combat` → combat Scene 전환.
- Verified: `make lint`, `make typecheck`, `make test`(107, 2 skipped) PASS. `make streamlit` 실행 중: `http://localhost:8501`.
- Blockers: Browser 플러그인 `iab` 세션이 사용 불가하여 시각적 브라우저 QA는 수행하지 못함.
- Next: 실제 플레이 세션에서 LLM이 어떤 빈도로 `start_combat`를 발생시키는지 튜닝하고, 소비 아이템 사용(`nanopatch`, `stim_shard`)을 전투 액션에 연결.

## 2026-05-31

- Status: [x] Player 화면 깜빡임 제거 + 행동 선택 후 행동창 숨김.
- Changed:
  - 스크립트 창을 `components.html`(iframe)에서 `st.markdown` 일반 div로 교체. 매 rerun/스트리밍 글자마다 iframe 문서가 통째로 리로드되며 발생하던 흰 플래시(깜빡임) 제거.
  - 자동 스크롤을 JS(`scrollTop`) 대신 CSS `flex-direction: column-reverse`로 처리(최신 텍스트가 하단 고정, iframe 불필요).
  - 미사용이 된 `streamlit.components.v1` import 제거.
  - 선택지/자유 행동 입력을 `st.empty()` 컨테이너로 감싸고, 행동 선택 즉시 `action_area.empty()`로 비운 뒤 다음 장면을 스트리밍. 다음 장면 도착(rerun) 시 새 선택지가 다시 표시되도록 변경.
- Verified: `make lint`, `make typecheck`, `make test`(76, 2 skipped) PASS.
- Blockers: 브라우저에서 실제 깜빡임 체감 회귀 및 column-reverse 단문 장면 정렬 확인은 미실행.
- Next: 브라우저에서 연속 행동 선언 시 깜빡임 없음 + 행동창 숨김/재표시 확인.

## 2026-05-31

- Status: [x] 로그라이크 전투 Phase B3(세션 배선) + Phase C 코어(레이더 HTML 렌더러). 검증 완료.
- Changed:
  - `RuntimeSnapshot.combat` 필드 추가(전투 턴에만 채움: radar/available/finished/outcome/rewards).
  - `RuntimeSessionService`에 `CombatService` 주입 + `start_combat(loop_id, encounter_id)` / `combat_action(loop_id, PlayerAction)` 추가. 합성 combat Scene(`scene_type="combat"`, narration=prose, choices=[]) 영속, 종료 시 encounter_reward→stability/tension, 패배 시 **퍼머데스→loop ENDED + Echo + world_event**.
  - `render_radar`에 `encounter_id` 추가(전투 장면 location 정확화).
  - `src/mythos_runtime/combat_ui.py`: `render_radar_html(radar)` — 격자+블립(적은 CSS blink)+HP바+턴/결과. iframe 없이 `st.markdown` div로 렌더(깜빡임 방지), XSS escape.
  - 테스트: `tests/test_session_combat.py`(4: 전투개시·active요구·완주·퍼머데스), `tests/test_combat_ui.py`(3: 격자/연락처·escape·결과표시).
- Verified(exit code): ruff 0 · mypy 0(76 files) · unittest 0(105, skipped 2).
- Blockers: **하네스 불안정** — `streamlit_app.py`(2600줄) 읽기가 줄 중복/빈 응답으로 깨져, UI 최종 연결은 보류(블라인드 편집 시 파일 손상 위험). 백엔드는 전부 완료·검증됨.
- Next: 읽기 안정화 후 `_player_active_screen`에 전투 분기 연결 — `snapshot.combat`/`CombatService.is_active(loop)`면 서사 선택지 대신 (a) 이미지 옆 `render_radar_html` 패널, (b) 전투 액션(공격+타겟/이동/방어/도주) 버튼→`combat_action`. + B1 `world_delta.start_combat` 트리거.

## 2026-05-31

- Status: [x] 로그라이크 전투 Phase B — 내레이터/레이더 + B3 오케스트레이션 코어(`CombatService`).
- Changed:
  - `src/mythos_combat/narrator.py`: 전투 로그→한국어 산문(`narrate_since`) + 레이더 UI 스냅샷(`render_radar`) + `narrate_outcome`. 엔진 권위, LLM 없이도 다이나믹 텍스트.
  - `src/mythos_runtime/combat_service.py`(`CombatService`/`CombatTurnResult`): `loop.state`의 `_combat`/`_party`/`_inventory`/`_run` 수명주기 관리. `begin`(시나리오 풀→인카운터 개시), `act`(플레이어 행동→엔진 resolve→prose/radar), 종료 시 전리품(loot_table 가중 추첨)→인벤토리, HP 런 간 계승, encounters_cleared/dead 갱신. 순수(DB/UI 무관).
  - 테스트: `tests/test_combat_service.py`(5: 개시·완주·전리품·결정성·HP 계승), narrator 테스트 3건.
- Verified(exit code): ruff 0 · mypy 0(73 files) · unittest 0(98, skipped 2).
- Blockers: 없음. (세션 배선 B3·world_delta B1·레이더 UI C·메타 D 미착수.)
- Next: `RuntimeSessionService.start_combat`/`combat_action` 추가(합성 combat Scene + 영속 + 퍼머데스→Echo), 이어서 Streamlit 레이더 전술 UI.

## 2026-05-31

- Status: [x] 로그라이크 전투 Phase A — 결정적 전투 엔진 + 사전 정의 풀(UI/프롬프트 전 단계).
- Changed:
  - 설계: `docs/plans/2026-05-31-roguelike-combat.md`(엔진 권위 + LLM 서술, 턴제·위치/거리 전술, TRPG 스탯+다이스, 퍼머데스→Echo).
  - `src/mythos_core/dice.py`: 시드 결정적 다이스(`d20`, `2d6+3` 표기, 가중 선택).
  - `src/mythos_combat/`(신규): `models`(Combatant/Weapon/CombatState, JSON 직렬화), `engine`(initiative·이동·근접/원거리 명중·데미지·크리·적/아군 AI·도주·승패), `factory`(정본 5스탯→HP/방어/이동; 전투는 strength·agility), `encounter`(시나리오 풀→전투).
  - 전투 상태는 `loop.state` JSON 보관 → DB 마이그레이션 불필요.
  - `resources/neo-seoul/scenario.json`에 `combat` 풀(weapons 8, bestiary 4, items 5, loot 3, encounters 4, archetype_loadout) + `ScenarioConfig.combat` 로더.
  - 테스트: `tests/test_dice.py`(6), `tests/test_combat_engine.py`(8: 결정적 리플레이·종료·직렬화·사거리·시나리오 풀 인카운터).
- Verified: `make lint`, `make typecheck`(64 files), `make test`(90, 2 skipped) PASS.
- Blockers: 없음. (런타임 배선=Phase B, 터미널 레이더 UI=Phase C, 로그라이크 메타=Phase D 미착수.)
- Next: Phase B — 전투 서브모드 배선, world_delta 확장, 전투 로그→서사, 퍼머데스→Echo.
- 참고: 이 세션 초반 streamlit 깜빡임 수정/행동창 숨김 작업은 하네스 오류로 디스크에 반영되지 않았음(미적용). 필요 시 재작업.

## 2026-05-31

- Status: [x] Player transcript window 정리 — 로딩 분리, 누적 스크롤, 결과 배너 제거.
- Changed:
  - 플레이어 서사 본문을 `story_transcripts` 상태로 누적하고, 고정된 스크립트 창에서 계속 아래로 이어지게 조정.
  - 로딩 메시지는 본문이 아닌 별도 terminal loader 패널에서만 표시되도록 분리.
  - 플레이어 HUD의 별도 `action_result` 배너를 제거해 판정 표시가 본문 흐름을 끊지 않도록 정리.
  - 표시용 transcript는 최근 4,200자, 내부 누적은 12,000자로 제한해 장면이 유기적으로 이어지되 과도한 누적은 방지.
- Verified: `make lint`, `make typecheck`, `make test`(76, 2 skipped), `compileall streamlit_app.py src tests` PASS.
- Blockers: 브라우저에서 실제 선택지/자유 행동 연속 클릭 시 자동 스크롤 체감 회귀 확인은 아직 미실행.
- Next: 브라우저에서 새 게임 시작 및 연속 행동 선언 흐름을 확인.

## 2026-05-31

- Status: [x] Player View streaming UX 조정 — 새 게임 시작 전환/Loading/스크립트 창/SFX 누출 수정.
- Changed:
  - 새 게임 시작은 connect screen 아래에 streaming text를 출력하지 않고 `Loading new loop...` 상태만 표시한 뒤 세션 화면으로 전환.
  - 선택지/자유 행동 streaming에는 `Loading next scene...` 상태 표시 추가.
  - Player/Developer 서사 본문을 스크롤 가능한 script window로 렌더링하고 최근 4200자만 표시.
  - LLM이 `[Cinematic SFX: ...]`/`SFX: ...` 같은 제작 지시 태그를 출력하면 parser에서 자연어 효과음 문장으로 변환.
  - `scenario.json` system prompt에서 SFX를 bracket label이 아니라 자연스러운 효과음 묘사로 쓰도록 지침 수정.
- Verified: `make lint`, `make typecheck`, `make test`(76, 2 skipped), `compileall streamlit_app.py src tests` PASS.
- Blockers: 없음.
- Next: 실제 브라우저에서 새 게임 시작/선택지 streaming 체감 회귀 확인.

## 2026-05-31

- Status: [x] BGM 재생 안정화 및 메인/인게임 격리 완료.
- Changed:
  - `streamlit_app.py`: 메인 BGM과 인게임 BGM의 호출 시점을 `loop_id` 존재 여부로 엄격히 분리 (메인 곡이 인게임에서 계속 들리는 문제 해결).
  - `st.audio` 오류 수정: 지원되지 않는 `key` 파라미터 제거 및 로직 최적화.
  - CSS 리팩토링: 누락된 중괄호 보정 및 오디오 태그 은닉 스타일(`opacity: 0`) 안정화.
- Verified: `make streamlit` 실행 후 'WAKE SYSTEM' -> '새 게임 시작' 흐름에서 BGM이 중첩 없이 정상 전환됨을 확인.
- Next: (선택) NPC 대사 텍스트를 음성으로 변환하는 로컬 TTS(Bark 등) 연동 검토.

## 2026-05-31
- Changed:
  - `mythos_runtime.audio_service` 신설: `AudioProvider` 프로토콜 및 `StaticAudioProvider` 구현.
  - 게임 수치(`Tension`, `Stability`)에 따른 동적 BGM 전환 로직 구축 (Calm, Tense, Unstable).
  - `scripts/gen_bgm_single.py`: MusicGen Medium 모델을 사용한 4분 분량 고품질 음원 생성 스크립트 작성.
  - `streamlit_app.py`: BGM 플레이어 UI 은닉(CSS `opacity: 0`), 자동 재생(`autoplay`), 루프 재생(`loop`) 적용.
  - 브라우저 자동 재생 정책 대응: 첫 상호작용 유도를 위한 "WAKE SYSTEM" 부팅 단계 도입.
  - `RuntimeSessionService` 및 `RuntimeSnapshot`에 오디오 경로 정보 통합.
- Verified: `make test` PASS(71); M4 Max 로컬 음원 생성 확인; Streamlit 내 상황별 BGM 전환 및 무한 반복 재생 검증.
- Next: (선택) LLM이 직접 장면별 음악 프롬프트를 생성하는 실시간 생성 모드 탐색.

## 2026-05-31
- Changed:
  - Player View와 CLI 기본값을 fast behavior로 설정: Ollama timeout, repair round-trip 생략, async 이미지 worker 부재 시 sync fallback 생략.
  - Developer View에 `Fast mode` 토글 추가(기본 OFF)로 품질/QA 모드 선택 가능.
  - `MYTHOS_FAST_MODE`는 전역 override 용도로 유지하되, 플레이어가 별도로 켤 필요 없게 변경.
  - `OLLAMA_TIMEOUT_SECONDS` 설정 추가(기본 4.5초) 및 Ollama OpenAI client timeout 적용.
  - `OllamaJSONProvider.stream()` 추가: OpenAI-compatible streaming chunks 수신.
  - `NarrationFieldExtractor`/`NarrativeStreamEvent` 추가: structured JSON stream에서 `narration` 필드만 실시간 추출하고 최종 JSON은 끝에서 파싱.
  - `NarrativeDirector.stream_first_scene()` / `stream_next_scene()` 추가: UI가 텍스트 chunk를 먼저 표시하고 final event로 기존 ScenePayload를 받을 수 있는 기반 마련.
  - `load_scenario()`에 LRU cache 적용해 반복 JSON 파일 로딩 제거.
- Verified: `make lint`, `make typecheck`, `make test`(75, 2 skipped) PASS.
- Blockers: 실제 Streamlit 화면에 streaming chunk를 연결하는 작업은 후속. JSON 구조상 완료 판정/상태 저장은 최종 JSON 수신 후 가능하다.
- Next: Streamlit `st.write_stream` 또는 placeholder 기반으로 `NarrativeDirector.stream_*`를 Player View에 연결.

## 2026-05-31

- Status: [x] 런타임 리팩토링 및 env 기반 디버그 로그 설정 완료.
- Changed:
  - `mythos_runtime.settings` 신설: `.env` 로딩, `MYTHOS_DEBUG`, `MYTHOS_LOG_LEVEL`, OTel 설정 해석을 중앙화.
  - `observability.py`: `MYTHOS_DEBUG=1`이면 기본 로그 레벨을 DEBUG로 올리고 JSON 로그에 module/function/line 포함.
  - `mythos_runtime.scenario_context` 신설: 소질 기반 traits 초기화와 시나리오/언어/인과율 노트 조립을 `RuntimeSessionService`에서 분리.
  - `mythos_runtime.options` 신설: `RuntimeOptions`, `RuntimeSnapshot`, `MemoryOverview`를 서비스 구현에서 분리.
  - `mythos_runtime.visual_orchestration` 신설: 핵심 비트 판단, async enqueue, sync fallback 이미지 생성 정책 분리.
  - `mythos_runtime.progression` 신설: 단서 수 기반 자율성 레벨 계산을 순수 함수로 분리.
  - `session.py`: 중복 `NarrativeContext` 생성 로직 제거, archetype traits 로직 모듈화, 실패 시 debug 로그로 관측 가능하게 변경.
  - `prompts.py`/`director.py`: scenario별 system prompt를 context에서 직접 해석하고 fallback 기본 프롬프트 제공.
  - `.env.example`/`Makefile`: `MYTHOS_DEBUG` 사용법 반영, `make streamlit`이 로그 레벨을 강제하지 않도록 수정.
- Verified: `make lint`, `make typecheck`, `make test`(73, 2 skipped) PASS; `MYTHOS_DEBUG=1`에서 DEBUG 레벨 및 debug formatter 활성 확인.
- Blockers: 없음.
- Next: (선택) `RuntimeSessionService.archive()`의 memory rollup/summary 저장 경로를 별도 archive service로 추가 분리.

## 2026-05-31

- Status: [x] 문서 정합성 정리 — 최신 구현 상태를 NEXT_PLAN/COMPLETED_SUMMARY/DECISIONS에 반영.
- Changed:
  - `NEXT_PLAN.md`: Phase 21-26 완료 체크, Phase 27+ 인과율/시나리오 v2 트랙, mflux 이미지 성능 후속 정리.
  - `COMPLETED_SUMMARY.md`: RPG/서사 고도화, 시나리오 v2/인과율, mflux 백엔드 완료 마일스톤 추가.
  - `DECISIONS.md`: 동적 시나리오 system prompt, Gear World 인과율, mflux 기본 백엔드 결정 기록.
- Verified: 문서만 변경. 직전 확인 기준 `make lint`, `make typecheck`, `make test` PASS.
- Blockers: 없음.
- Next: (선택) 인과율 예약 이벤트/NPC 아젠다를 개발자 UI에 노출.

## 2026-05-31

- Status: [x] 이미지 진단 — async 정상(턴 비차단), 느림은 메모리경합 + img2img 1-step 버그.
- Changed:
  - **진단**: 워커 로그상 턴은 enqueue 즉시 종료(비차단 OK). 이미지 per-step이 6~13s로 느렸던
    건 swap(~17GB) 메모리 경합 때문(mflux 인스턴스 중복 + gemma + 기타). 워커 1개·단일 mflux로
    재측정 시 **4-bit 512/4step = 8.4s(2.1s/step)** 정상 회복.
  - **img2img 1-step 버그**: 플레이어 프리셋 steps=1이면 mflux img2img 유효 스텝이 0이 되어
    레퍼런스를 거의 그대로 반환(`latency 253ms`, `0it`). 프리셋을 **512×512 / 4 step**으로 상향
    (schnell 권장값, img2img도 실제 스텝 수행).
  - `.env` `MFLUX_QUANTIZE` 8→**4**(~7GB, gemma와 공존 시 메모리 여유 → swap 회피, 속도 동일).
  - 워커 4-bit 단일 인스턴스로 재기동.
- Verified: `lint`/`test`(69) PASS; 단일 mflux+gemma 4-bit 2.1s/step 측정; 워커 heartbeat alive.
- Blockers: 브라우저 등 외부 앱이 메모리를 점유하면 다시 swap→감속 가능. 동시 모델은 worker
  하나로 제한됨(락). 더 줄이려면 narrative 모델 경량화.
- Next: (선택) 플레이 중 실측 per-step 재확인, 필요 시 size/steps 추가 튜닝.

## 2026-05-31

- Status: [x] 시스템 프롬프트 동적 주입 및 테스트 안정화 완료.
- Changed:
  - `scenario.json`: `system_prompt` 필드를 추가하여 GM 지침을 시나리오별로 분리.
  - `scenario.py`: `ScenarioConfig` 및 로더가 `system_prompt`를 읽어오도록 확장.
  - `prompts.py`: 하드코딩된 `SYSTEM_PROMPT` 제거 및 동적 주입 구조로 변경.
  - `director.py` & `session.py`: 시나리오 설정의 프롬프트를 서사 생성 파이프라인에 전달하도록 수정.
  - `tests/test_loop_engine.py`: 페이즈 전환 로직 변경(AI 주도)에 맞춰 테스트 케이스 업데이트.
- Verified: make lint && make typecheck PASS; make smoke-local PASS.

## 2026-05-31

- Status: [x] 인과율 엔진 및 시나리오 v2 대개편 완료.
- Changed:
  - `scenario.json`: 소설/비주얼 노벨급 퀄리티로 전면 재구성 (메인/사이드 아크, NPC 아젠다, 다중 엔딩 매트릭스).
  - `scenario.py`: v2 스키마(`main_arcs`, `side_arcs`, `npc_agendas`, `endings`) 대응을 위한 `ScenarioConfig` 확장.
  - `session.py`: 인과율 엔진 로직 통합. NPC 아젠다 및 나비효과 추적을 위한 프롬프트 지침 주입.
  - `prompts.py`: 'Gear World' 인과율 시스템 및 4대 엔딩 지표(Humanity, Dominance, Resilience, Insight) 관리 지침 전면 개편.
- Verified: make lint && make typecheck PASS; 시나리오 v2 로딩 및 AI GM의 아젠다 인식 확인.

## 2026-05-31

- Status: [x] 서사 완급 조절 및 루프 요약 기능 구현.
- Changed:
  - `LoopEngine`: 매 턴 강제로 페이즈를 전환하던 로직을 제거하고, AI GM이 `requested_next_phase` 필드를 통해 직접 전환 시점을 결정하도록 변경.
  - `NarrativeDirector`: 루프 종료 시 전체 사건을 시적으로 요약하는 `summarize_loop` 메서드 추가.
  - `RuntimeSessionService`: `archive` 단계에서 생성된 요약을 `WorldMemory` (kind="loop_summary")로 저장하여 다음 루프의 연속성 강화.
  - `prompts.py`: "지문:", "대사:" 라벨 사용 금지 지침 추가 및 깊이 있는 장면 묘사(Pacing) 지침 강화.
  - `ScenePayload` & `parser.py`: `requested_next_phase` 필드 지원 추가.
- Verified: `make lint` && `make typecheck` PASS; `make smoke-local`로 페이즈 유지 확인.

## 2026-05-31

- Status: [x] 상세 로그 가시화 — Streamlit에서 mythos 구조적 로그가 묻히던 문제 수정.
- Changed:
  - `observability.configure_logging`이 루트 대신 **`mythos` 전용 로거**에 JSON 핸들러를
    붙이고 레벨 설정 + `propagate=False`. 기존엔 Streamlit이 루트 핸들러를 선점하면
    `if root.handlers: return`으로 우리 INFO 로그가 루트(WARNING)에 묻혔음 → 이제 호스트와
    무관하게 항상 출력(중복 없음).
  - `make streamlit`이 `MYTHOS_LOG_LEVEL`(기본 INFO, =DEBUG 가능)을 전달하고 로그 안내 출력.
    `make visual-worker-logs`(=`tail -f outputs/visual-worker.log`) 추가 — 이미지 생성 로그는
    자동 기동 워커 프로세스에 있으므로 이 타깃으로 실시간 확인.
  - Streamlit `use_container_width=True`(16곳)를 `width="stretch"`로 교체(1.58 deprecation
    경고 제거 → 로그 노이즈 정리).
- Verified: `lint`/`typecheck`(53)/`test`(69) PASS; 루트 WARNING 선점 시뮬레이션에서 INFO
  JSON 로그가 stderr에 1회 출력, `MYTHOS_LOG_LEVEL=ERROR`에서 INFO 억제·ERROR 출력 확인.
- Next: (선택) httpx 등 외부 로거 노이즈 조정, 플레이 중 in-UI 로그 패널.

## 2026-05-31

- Status: [x] 이미지 백엔드 mflux(MLX) 추가 + 기본 전환 — 장당 ~20배 가속.
- Changed:
  - `src/mythos_image_agent/mflux_generator.py` 신설: Apple MLX(`mflux`)로 FLUX.1-schnell
    생성. 프로세스당 1회 로드 캐시, 4/8-bit 양자화, `image_path`+`image_strength`로 img2img
    정체성 스티어링까지 동일 백엔드 지원.
  - `visual_service.py`에 `MfluxProvider` + `default_visual_provider()` 셀렉터 추가
    (`IMAGE_BACKEND` 환경변수). `VisualService` 기본 provider가 셀렉터를 사용.
  - `AgentConfig.image_backend`(기본 **mflux**)·`mflux_quantize`(기본 8) 추가, `.env.example`
    문서화, `pyproject`에 `mflux>=0.17.0`. diffusers 경로는 `IMAGE_BACKEND=diffusers`로 폴백 유지.
  - 지연 import 유지(mlx/mflux는 생성 시점에만 로드).
- Verified: `lint`/`typecheck`(53)/`test`(69) PASS; **실측 벤치(512×512/4step)**:
  mflux 8-bit warm **7.9s(≈1.9s/step)** vs diffusers **40s/step** → ~20배. img2img(se-rin
  레퍼런스)도 유효 PNG 생성. gemma11 공존 상태에서 swap 없이 동작.
- Blockers: 첫 생성은 양자화 로드(~10s) 1회 포함. mflux 가중치는 기존 HF 캐시 재사용.
- Next: 실 워커에서 mflux end-to-end 회귀(브라우저), 필요 시 4-bit로 추가 경량화.

## 2026-05-31

- Status: [x] 이미지 속도 근인 발견·수정 — 중복 워커 방지(단일 인스턴스 Redis 락).
- Changed: 진단 중 visual_worker가 **2개** 떠 있는 것을 발견(각각 FLUX ~24GB 로드 →
  48GB 초과 → swap 17GB → 40s/step의 직접 원인). 정리만으로 swap 17.2GB→8.9GB.
  - `VisualJobQueue.acquire_worker_slot()` 추가: heartbeat 키를 `SET NX EX`로 단일 인스턴스
    락으로 사용. worker는 시작 시 락 획득 실패하면 즉시 종료.
  - `HEARTBEAT_TTL_SECONDS` 60→180s(긴 FLUX 잡이 락 TTL을 넘겨 만료되지 않도록) +
    잡 처리 직후 `beat()`로 락 재확인.
- Verified: `lint`/`typecheck`(52)/`test`(69) PASS; 실 Redis로 worker A 획득=True,
  worker B=False(두 번째 종료) 확인.
- Blockers: 단일 워커·warm 상태라도 gemma11+FLUX24가 48GB에서 공존하면 여전히 빡빡.
  장당 속도의 본질적 해결은 **MLX(mflux)+양자화** 백엔드 전환(네이티브 Metal, 6~12GB)이 후보.
- Next: (제안) mflux 기반 VisualProvider를 플래그로 추가(diffusers는 폴백 유지).

## 2026-05-31

- Status: [x] 텍스트 생성 속도 개선(스키마 강제 출력 + 로컬복구 우선) + streamlit 단일 인스턴스.
- Changed:
  - `OllamaJSONProvider`가 `response_format`을 `json_object` → **`json_schema`**(`SCENE_JSON_SCHEMA`,
    schemas.py 신규)로 변경. 모델이 ScenePayload 모양에 grammar-constrained되어 첫 응답이 바로
    파싱됨 → 12초짜리 repair 왕복 제거. 구버전 호환 위해 실패 시 `json_object`로 폴백.
  - `NarrativeDirector._generate_classified` 재배열: 파싱 실패 시 **결정적 로컬 복구를 먼저**
    시도하고, 안 되면 그때만 provider repair 호출(낭비되는 두 번째 LLM 콜 최소화).
  - `Makefile`: `make streamlit`이 기존 인스턴스를 pkill 후 **8501 고정**으로 1개만 기동
    (더 이상 8502로 중복 안 뜸). `make streamlit-stop` 추가.
- Verified: `make lint`/`typecheck`(52)/`test`(69, director 테스트 갱신+1) PASS;
  `make narrative-smoke`(실 Ollama)에서 **outcome=success, repair 0회, latency ~15s**
  (이전 20s 생성 + 12s repair = ~32s에서 단축). 스키마 출력 8.6s 단발 probe도 확인.
- Blockers: 단일 생성 ~15s는 gemma4(11GB)×긴 한국어 내레이션×메모리경합의 바닥값.
  더 줄이려면 경량/소형 모델 또는 출력 길이 축소(서사 품질 트레이드오프) 필요.
- Next: (선택) 소형 narrative 모델 옵션, 출력 길이 튜닝, 토큰 스트리밍(체감 지연 감소).

## 2026-05-30

- Status: [x] 동적 타일 맵(Map) 기능 — 현재 좌표 + 주변 미니맵 UI.
- Changed:
  - `src/mythos_core/mapgrid.py` 신설: 자유 텍스트 `scene.location`을 정수 격자 타일로
    점진 배치. 첫 위치 (0,0), 새 위치는 직전 위치의 빈 인접칸에 결정적(이름 해시 시드)으로
    배치, 인접칸이 차면 나선 탐색. 재방문은 좌표 유지·visits 증가. 키워드 기반 kind 분류
    (market/spire/edge/blackout/data/refuge/node). 맵은 `loop.state["_map"]`에 저장(자동 영속).
  - `LoopEngine.apply_scene_payload`가 매 장면마다 `update_map` 호출(fallback/Ollama·CLI·
    Streamlit 공통).
  - Streamlit 플레이어 뷰: dossier 컬럼에 `_render_minimap`(북쪽 위, 현재칸 하이라이트) +
    좌표/탐사수 캡션. 기존 `LOC // …` 상태줄에 `[x, y]` 좌표 병기.
- Verified: `make lint`/`typecheck`(52)/`test`(68, +6 mapgrid) PASS; 엔진 end-to-end로
  경계(0,0)→야시장(1,1, 재방문 visits=2)→데이터코어(1,2) 배치·kind·current·order 확인.
  기존 `_map` 없는 loop는 미니맵 미표시로 graceful.
- Blockers: 위치 배치가 서사상 방향과 무관(이름 해시 기반). 방향 의미를 주려면 GM이
  world_delta에 방향/이동 힌트를 내도록 스키마 확장 필요(후속).
- Next: (선택) GM 이동 방향 힌트, Codex 전체 지도 뷰, 타일 클릭 상호작용.

## 2026-05-30

- Status: [x] Phase 24: 인터랙션 고도화 및 자율성 UI 구현 완료.
- Changed:
  - Streamlit UI에 자율성 레벨(LV 1-5) 연동 및 레벨별 의지 키워드 추천 버튼 추가.
  - 낮은 자율성 레벨에서 과격 행동 선언 시 '시스템 제약' 경고 연출 적용.
  - Codex 내 '내 정보' 섹션에 5대 스탯 및 속성(Attributes) 시각화 반영.
  - `scenario.json`에 자율성 설정(상태명, 키워드) 추가 및 동적 로드 연동.
- Verified: make lint && make typecheck PASS; UI 상의 키워드 입력 및 스탯 표시 확인.

## 2026-05-30

- Status: [x] Phase 23: 진행도 기반 세계 진화 및 시각적 글리치 심화 구현 완료.
- Changed:
  - `prompts.py`: 자율성 레벨에 따른 NPC 태도 변화(노이즈 → 촉매) 및 서사 시점 전환 지침 주입.
  - `postprocess.py`: `intensity` 파라미터를 추가하여 Y2K 효과의 강도를 가변적으로 조절 가능하도록 개선.
  - `visual_service.py`: 플레이어의 자율성 레벨을 기반으로 이미지 글리치 강도를 자동으로 스케일링 (LV 1: 0.5 ~ LV 5: 2.5).
- Verified: make lint && make typecheck PASS; 자율성 레벨 수동 조정 후 이미지 생성 시 효과 강도 변화 확인.

## 2026-05-30

- Status: [x] Phase 24: 인터랙션 고도화 및 자율성 연동 로직 완성.
- Changed:
  - `RuntimeSessionService.archive`: 단서(Clue) 수집량에 따른 **자율성 레벨 자동 상승** 로직 구현.
  - `streamlit_app.py`: 의지 키워드 버튼을 **역할극 가이드(Mental State Hint)** 텍스트로 변경 및 각성 시각 효과(Balloons) 추가.
  - `prompts.py`: 스탯 수치(1~10) 언급 강제 및 스탯을 활용한 자율성 제약 우회(Synergy) 지침 추가.
- Verified: make lint && make typecheck PASS; Loop 종료 후 단서 수에 따른 레벨업 및 UI 연출 확인.

## 2026-05-30

- Status: [x] RPG 스탯 시스템 및 노벨급 서사 엔진 고도화 구현 완료.
- Changed:
  - 5대 핵심 스탯(Strength, Intelligence, Charisma, Agility, Perception) 1~10 스케일 도입.
  - 소질(Archetype)별 초기 스탯 및 세계관 속성(ARK 링크, 인간찬가 등) 정의 및 `scenario.json` 적용.
  - `RuntimeSessionService.create_player` 시 스탯/자율성 레벨 자동 초기화 로직 구현.
  - `prompts.py` 전면 개편: 지문/대사 분리, 오감 묘사, 자율성 가드레일(주저함) 지침 주입.
  - `Scene` 모델 및 DB에 `scene_type` 추가 (마이그레이션 004).
- Verified: make lint && make typecheck PASS; DB 마이그레이션 및 새 접속자 생성 테스트 완료.

## 2026-05-30

- Status: [x] RPG 시스템 및 노벨급 서사 고도화 개선안(docs/feedback/0530-1.md) 확정.
- Changed:
  - 3대 핵심 스탯(신호/해석/공명) 및 자율성 레벨(LV 1-5) 설계.
  - 오감 묘사, NPC 화법, 영화적 스테이징 등 텍스트 품질 강화 전략 수립.
  - 자율성 기반 심리적 가드레일(행동 제약 연출) 메커니즘 설계.
- Verified: docs/feedback/0530-1.md 생성 및 NEXT_PLAN 반영.
- Next: Phase 21 RPG 데이터 구조화 착수.

## 2026-05-30

- Status: [x] 시나리오 설정 동적 로드 구현.
- Changed:
  - resources/neo-seoul/scenario.json 신설.
  - src/mythos_runtime/scenario.py (ScenarioConfig) 추가.
  - session.py 및 visual_service.py에서 하드코딩된 브리프 및 캐릭터 맵 제거 및 동적 로드로 전환.
  - Streamlit UI에서 시나리오 설정에 기반한 소질(Archetype) 목록 동적 렌더링.
- Verified: make lint && make typecheck PASS; streamlit 앱에서 동적 로드 확인.

## 2026-05-30

- Status: [x] Phase 14: DX (Developer Experience) 개선 완료.
  - ruff 적용 (포맷팅 및 Linting 전면 수정).
  - mypy 도입 및 정적 타입 에러 전면 해결.
  - Makefile 명령어 (lint, format, typecheck) 추가.
- Verified: make smoke PASS.

## 2026-05-30

- Status: [x] Phase 19: 아트 연출 통합 완료.
  - Y2K/CRT 후처리 및 디제틱 HUD 오버레이 (Pillow 기반) 구현.
  - VisualService에 img2img 통합 (캐릭터/컨셉 이미지 기반 정체성 스티어링).
  - 시각적 일관성 검증 (make visual-smoke).
- Verified: make visual-smoke PASS.

## 2026-05-30

- Status: [x] Phase 18: 미스터리 & Codex 시스템 구현 완료.
  - NarrativeShard 모델 및 DB 테이블 확장 (kind, metadata).
  - CodexService 구현 및 초기 Lore 시드 정의.
  - LoopEngine 단서 파편 자동 추출 로직 통합.
  - Streamlit UI 'Codex (기억의 별자리)' 탭 신설.
- Verified: make test-db PASS; Codex UI 확인.

## 2026-05-30

- Status: [x] Phase 17: 접속자 생성 & GM 톤 구현 완료.
  - Neo-Seoul GM 시드 브리프 정의 및 NarrativeContext 주입.
  - Player Archetype (Ghost, Smuggler, Collector) 및 Traits 시스템 확장.
  - 부팅 온보딩 시퀀스 및 NPC(세린) 등장 지침 자동화.
  - Streamlit 접속자 생성 UI 개선 (소질 선택 추가).
- Verified: make smoke-local PASS.

## 2026-05-30

- Status: [x] Phase 16: 세션 목표 & 행동 판정 연출 구현 완료.
  - Scene/ScenePayload 모델 확장 (objective, action_result).
  - DB Migration (002_add_scene_fields.sql) 및 Store 반영.
  - Narrative Director & Parser & Prompts 업데이트.
  - Streamlit UI (Player/Developer) HUD 연출 추가.
- Verified: make test-db PASS.

## 2026-05-30

- Status: [x] Phase 13: 이미지 성능 개선 및 비동기 Visual Job 구현 완료.
- Changed:
  - FLUX 파이프라인 캐싱 (`pipeline_cache.py`) 도입으로 로딩 병목 제거.
  - Redis 기반 비동기 잡 큐 (`VisualJobQueue`) 및 워커 (`visual_worker.py`) 구현.
  - Streamlit에서 워커 자동 기동 및 MinIO presigned URL 표시 연동.
  - 핵심 비트 생성 로직 (`_is_key_beat`) 적용으로 비용 최적화.
- Verified: make visual-smoke PASS, Redis/MinIO 연동 확인.

## 2026-05-30

- Status: `[x]` canonical Se-rin set to img2img refuge version; next tasks recorded.
- Changed: adopted `se-rin.png` = `variants/se-rin-img2img-refuge.png` (final-a re-rendered
  via img2img, strength 0.55) per preference; final-a preserved in `variants/` for
  revert. Updated `resources/neo-seoul/README.md`. Recorded the concrete next-task
  list in `STATUS.md` (바로 다음): Phase 16 session goals/action-resolution, Phase 17
  연결자/GM tone with the «Neo-Seoul» GM seed brief, Phase 18 mystery/Codex, Phase 19
  art integration, optional IP-Adapter wiring, and the Phase 13/14 background track.
- Verified: file swap confirmed on disk; docs reviewed for consistency.
- Blockers: none.
- Next: begin Phase 16.

## 2026-05-30

- Status: `[x]` img2img identity-steering feature added; remaining characters refined.
- Changed: added `src/mythos_image_agent/img2img.py` (`generate_image_img2img` via
  `FluxImg2ImgPipeline`, MPS + gated-repo handling, `strength` to trade scene-change
  vs identity retention) and `scripts/img2img.py` CLI; documented usage + the
  IP-Adapter follow-up in `resources/neo-seoul/README.md`. Refined the remaining
  Neo-Seoul characters to Se-rin's impact bar (`scripts/gen_char_refine.py`, 2
  candidates each) and adopted: `lin-yue.png`=v2-a (throne kingpin, seed 412),
  `kai.png`=v2-b (male android, blue eyes, seed 423), `administrator-ix.png`=v2-a
  (looming control structure, seed 432). Updated README seeds.
- Verified: diffusers 0.38.0 exposes FluxImg2ImgPipeline + load_ip_adapter (checked);
  `compileall`/import of the img2img module PASS; refine batch (exit 0, 6 PNGs)
  visually reviewed and selected; img2img demo
  (`variants/se-rin-img2img-refuge.png`, se-rin.png ref, strength 0.55) PASS —
  identity clearly retained across a re-rendered scene. (First demo run silently
  no-op'd due to a persisted shell cwd breaking `.venv/bin/python`; re-ran with
  absolute paths.)
- Blockers: none. True large-scene face-ID lock would need IP-Adapter weights (hook
  present, not wired).
- Next: Phase 16 with the «Neo-Seoul» GM seed brief, optionally wiring IP-Adapter.

## 2026-05-30

- Status: `[x]` Se-rin lead character art finalized (higher impact).
- Changed: iterated Se-rin (early-game lead) toward a more rebellious/cyberpunk/
  mysterious/biker look across several FLUX passes (`scripts/gen_se_rin_variants.py`,
  `gen_se_rin_v2.py`, `gen_se_rin_final.py`; candidates kept in
  `resources/neo-seoul/characters/variants/`). Adopted `se-rin.png` = final-a
  (no-helmet front portrait, seed 341) and `se-rin-biker.png` = biker-b (single-
  motorcycle scene shot, seed 332; fixed the earlier doubled-bike artifact). Updated
  the resources README character table + seeds.
- Verified: FLUX batches completed (exit 0); candidates visually reviewed; canonical
  assets present under `resources/neo-seoul/characters/`. Note: pipeline is
  text-to-image only, so faces were steered by prompt, not pixel-blended from
  references (true face-consistency would need img2img/IP-Adapter, not wired).
- Blockers: none.
- Next: Phase 16, injecting the «Neo-Seoul» GM seed brief.

## 2026-05-30

- Status: `[x]` «Neo-Seoul» worldbuilding + art revised per feedback.
- Changed: added §2.0 reconstruction backstory — a Northeast-Asian war destroyed the
  old cities, and a pan-national body ARK ("방주") rebuilt them as Neo-Seoul/Neo-Tokyo/
  Neo-Beijing under efficiency-absolutism (nation-corps are ARK's regional agents,
  Control Net/Administrator IX its enforcers); wove ARK into the MythOS meta-frame and
  GM seed brief. Redesigned characters: Se-rin = long-haired rebellious idol vibe,
  Lin-yue = underworld kingpin, Kai = male android. Emphasized Korean Hangul signage
  across all prompts and front-loaded key tokens to dodge CLIP's 77-token truncation.
  Added an 8th concept image `concept/04-reconstruction.png`. Updated scenario bible,
  `resources/neo-seoul/README.md`, and `scripts/gen_neo_seoul_art.py` (new seeds
  211/212/213 for the redesigned characters, 91 for reconstruction).
- Verified: FLUX batch completed (exit 0), 8 PNGs saved; visually reviewed se-rin,
  lin-yue, kai, reconstruction, night-market — revisions all landed (male Kai, idol
  Se-rin, kingpin Lin-yue, ruins-and-rebuild concept). Hangul signage is now Korean-
  forward but not perfectly legible (diffusion text limitation, as expected).
- Blockers: none. Legible Hangul would need typographic post-compositing if required.
- Next: Phase 16, injecting the «Neo-Seoul» GM seed brief.

## 2026-05-30

- Status: `[x]` first gameplay scenario «Neo-Seoul» written + concept/character art
  generated via FLUX.
- Changed: added `docs/scenarios/01-neo-seoul-connect.md` (scenario bible — logline,
  MythOS meta-frame, Neo-Seoul setting, 4 강렬 characters 세린/린위에/카이/관리자 IX,
  hybrid-goal mapping, LoopPhase beat sheet, Shard seeds, opening script, and a GM
  seed brief for Director injection); added `scripts/gen_neo_seoul_art.py` (loads
  FLUX once, renders 7 assets) and `resources/neo-seoul/` (README + 3 concept + 4
  character images). Linked the scenario/resources from `docs/README.md` map,
  `GAMEPLAY.md` §12.5, and `NEXT_PLAN.md`. Scenario is content for Phase 15-19, not
  a new phase.
- Verified: `make doctor` PASS (MPS, FLUX gated access, Ollama). Art batch completed
  (exit 0) — 7 PNGs (1024², 4 steps, ~1.2-1.7MB each) saved under
  `resources/neo-seoul/`; visually reviewed night-market, se-rin, kai, administrator-ix
  — all on-theme. (Harmless CLIP 77-token truncation warning; FLUX T5 carries the prompt.)
- Blockers: none.
- Next: Phase 16, using the «Neo-Seoul» GM seed brief.

## 2026-05-30

- Status: `[x]` Phase 15 Player/Developer UI split implemented (Streamlit).
- Changed: added a sidebar `화면` toggle (플레이어/개발자); split `main()` into
  `_developer_view` (existing dashboard) and `_player_view`; added a minimal player
  sidebar (`AI 게임마스터`, `장면 이미지 생성`) and an immersive player flow —
  diegetic connect screen (boot caption, 접속자 선택/생성, 세계에 접속/이어하기),
  active screen with scene image, Korean act-label HUD + stability/tension gauges,
  narration, choice buttons, `행동 선언` free input, 회상(Echoes) and 기억의
  별자리(Codex) panels, and a 종결 epilogue with new-session start. Player view hides
  loop/scene ids, raw deltas, QA metrics, rollup internals, infra links, and image
  params. Cleared the player free-action field via pending widget state.
- Verified: `.venv/bin/python -m compileall` PASS; `make test` PASS (54 tests, 2
  skipped); Streamlit headless boot returns HTTP 200 with no import error;
  `streamlit.testing.v1.AppTest` runs both views with no exception and completes a
  player create→connect→scene-render flow (HUD + header rendered).
- Blockers: none. Browser manual click-through still recommended.
- Next: Phase 16 (session objective + action-result read + survival-clock/act
  presentation).

## 2026-05-30

- Status: `[/]` playable single-player (TRPG) direction set; game design doc + plan
  written (no gameplay code yet).
- Changed: confirmed direction with user — TRPG with AI as Game Master, hybrid goal
  (session survival/stabilization + cross-loop mystery), long narrative sessions,
  hybrid presentation, fin-de-siècle/Y2K digital art, key-beat image generation,
  and a required Streamlit player-view / developer-debug-view split. Added
  `docs/GAMEPLAY.md` (authoritative gameplay design), `docs/plans/2026-05-30-playable-single-player.md`
  (plan snapshot + gap analysis), NEXT_PLAN Playable Game Track (Phase 15-19),
  a `DECISIONS.md` entry, and a `docs/README.md` doc-map row.
- Verified: docs only — reviewed for role separation and links; mapped existing
  systems (Director=GM, free action, world_delta, stability/tension, Echo/Shard/
  rollup) onto TRPG concepts to keep scope as framing/UX over new engines.
- Blockers: none.
- Next: implement Phase 15 (Streamlit Player/Developer view split) as the shell
  for all later game-ification.

## 2026-05-30

- Status: `[x]` archive memory rollup implemented (retention window + statistical
  compaction).
- Changed: added `ARCHIVE_RETENTION=20`, `_player_rollup`, `_archives_to_compact`,
  `_merge_archive_rollup`, and `_compact_player_archives` to `session.py`; archive
  now compacts a player's oldest `loop_archive` world memories beyond the window
  into a single `archive_rollup` (avg stability/tension + phase/tone/symbol
  histograms + window), marking absorbed records `archive_compacted` via
  memory_id upsert; `_initial_loop_scores` blends the rollup trend (weighted by
  loop_count) into the next loop's start scores; `memory_overview` and the
  Streamlit Memory panel surface a "Long-term summary".
- Verified: `.venv/bin/python -m compileall PASS; make test PASS with 54 tests
  and 2 skipped; make test-db PASS; make smoke-local PASS; Postgres e2e check
  PASS — with retention=2, 4 archives compacted to loop_archive=2,
  archive_compacted=2, archive_rollup=1 (loop_count 2, avg 70/22.5, populated
  histograms), and active world archives correctly excluded the compacted rows.
- Blockers: none.
- Next: monitor visual latency vs Phase 13 entry criteria, or begin Phase 14
  Developer Experience (lint/format/CI).

## 2026-05-30

- Status: `[x]` post-Phase-12 follow-ups complete (provider QA metric, Streamlit
  memory visibility, Phase 13 entry decision, memory summary policy).
- Changed: added `NarrativeMetrics` to `NarrativeDirector`, classifying each
  provider generation as success/provider_repair/local_repair/fallback, logging a
  `narrative outcome` line (new `outcome` log field) and surfacing ratios in
  `mythos_narrative.smoke`; added `RuntimeSessionService.memory_overview()` plus a
  Streamlit Memory panel showing world archives, narrative shards, novelty
  guidance, and the latest start adjustment; wrote
  `docs/plans/2026-05-30-visual-job.md` (defer async, entry criteria, measurement
  via existing `mythos.visual.generate` latency) and
  `docs/plans/2026-05-30-memory-summary.md` (retention window + statistical
  rollup), and recorded both decisions in `DECISIONS.md`.
- Verified: `.venv/bin/python -m compileall src tests streamlit_app.py agent.py`
  PASS; `make test` PASS with 48 tests and 2 skipped; `make test-db` PASS;
  `make smoke-local` PASS; service-level DB check PASS with `memory_overview`
  returning 1 world archive, 1 shard, 4 novelty notes, and a populated start
  adjustment. Ollama-path metric not exercised (Ollama offline this session);
  unit tests cover all four outcomes.
- Blockers: none.
- Next: implement memory summary rollups (per `docs/plans/2026-05-30-memory-summary.md`)
  or monitor visual latency against the Phase 13 entry criteria.

## 2026-05-30

- Status: `[x]` archive memory dedup complete.
- Changed: made archive persistence idempotent for non-Echo memories; runtime now
  skips saving `loop_archive` world memory or narrative shard when the same
  loop/player archive record already exists.
- Verified: `.venv/bin/python -m compileall src tests streamlit_app.py agent.py`
  PASS; `make test` PASS with 43 tests and 2 skipped; `make test-db` PASS;
  `make smoke-local` PASS; service-level DB check PASS with repeated archive
  preserving world memory `1 -> 1` and narrative shard `1 -> 1`.
- Blockers: none.
- Next: archive memory long-term summary policy or Streamlit memory visibility.

## 2026-05-30

- Status: `[x]` Phase 12 Narrative Runtime Depth implementation complete.
- Changed: added player-scoped world memory based initial loop score adjustment;
  new loops now derive conservative stability/tension deltas from recent archived
  `world_memories`, and store adjustment details in loop state for debugging.
- Verified: `.venv/bin/python -m compileall src tests streamlit_app.py agent.py`
  PASS; `make test` PASS with 41 tests and 2 skipped; `make test-db` PASS;
  `make smoke-local` PASS; service-level DB check PASS with stressed archive
  producing next loop `stability=57`, `tension=35`, and adjustment reasons.
- Blockers: none.
- Next: archive memory dedup/summary policy, Streamlit memory visibility, or
  Phase 13 visual job architecture.

## 2026-05-30

- Status: `[~]` Phase 12 choice intent novelty complete.
- Changed: added `recent_choice_patterns` to `NoveltySignal`; summarized recent
  scene choice intents into compact frequency patterns; added novelty notes that
  ask the director to avoid repeating recent choice intent structures.
- Verified: `.venv/bin/python -m compileall src tests streamlit_app.py agent.py`
  PASS; `make test` PASS with 37 tests and 2 skipped; `make test-db` PASS;
  `make smoke-local` PASS; service-level check confirmed `archivex1, rewritex1`
  and `explorex1, interactx1` patterns in novelty notes.
- Blockers: none.
- Next: design World Memory based stability/tension adjustments.

## 2026-05-30

- Status: `[~]` Phase 12 Ollama memory path stabilized.
- Changed: requested JSON object responses from Ollama; strengthened the
  Narrative Director prompt against envelope wrapping; added parser normalization
  for model outputs that place the scene under `contract.scene`; added local
  repair for common LLM variants; added novelty guard for provider payloads that
  repeat a recent title.
- Verified: `.venv/bin/python -m compileall src tests streamlit_app.py agent.py`
  PASS; `make test` PASS with 36 tests and 2 skipped; `make test-db` PASS;
  `make smoke-local` PASS; `make narrative-smoke` PASS through Ollama;
  service-level Ollama memory smoke PASS with one archived shard and a new
  non-fallback scene titled `The Echoing Core`.
- Blockers: none.
- Next: decide whether to add choice intent patterns to the novelty signal.

## 2026-05-30

- Status: `[~]` Phase 12 Narrative Runtime Depth in progress.
- Changed: added `NoveltyController`; extended `NarrativeContext` and narrative
  prompt payload with world memories, narrative shards, and novelty notes; added
  PostgreSQL `narrative_shards` CRUD; wired runtime start/choose/archive to read
  and write non-Echo memory; made fallback scenes reflect novelty context.
- Verified: `.venv/bin/python -m compileall src tests streamlit_app.py agent.py`
  PASS; `make test` PASS with 32 tests and 2 skipped; `make test-db` PASS;
  `make smoke-local` PASS; service-level DB check PASS with one archived world
  memory, one narrative shard, and a novelty-adjusted next fallback scene title;
  Browser Streamlit basic regression PASS. `make narrative-smoke` reached Ollama
  but fell back after validation/repair failure, so provider-level memory
  reflection remains open.
- Blockers: none.
- Next: improve Ollama JSON quality, then rerun memory reflection smoke.

## 2026-05-30

- Status: `[x]` Phase 11 Streamlit Demo Polish complete.
- Changed: added `list_players()` to the store interface and PostgreSQL store;
  added DB-backed saved player selector, saved loop selector, manual player/loop
  expanders, selected loop resume flow, runtime action spinner, and separated
  visual asset/Echo rendering to Streamlit.
- Verified: `.venv/bin/python -m compileall agent.py streamlit_app.py src tests`
  PASS; `make test` PASS; `make test-db` PASS; `make smoke-local` PASS;
  browser PASS for saved player selection, saved loop resume, archive, and next
  loop Echo carry-over.
- Blockers: none.
- Next: Phase 12 Narrative Runtime Depth.

## 2026-05-30

- Status: `[x]` docs management split complete.
- Changed: added `docs/README.md`, `docs/DOCS_POLICY.md`, `docs/STATUS.md`,
  `docs/COMPLETED_SUMMARY.md`, `docs/PROGRESS_LOG.md`, `docs/DECISIONS.md`,
  `docs/plans/2026-05-30-post-mvp.md`, and `docs/archive/README.md`; updated
  README doc index; moved `IMPLEMENTATION.md` to
  `docs/archive/IMPLEMENTATION_M0_M10.md`.
- Verified: documentation files reviewed for role separation, dated planning,
  retire/delete policy, and link consistency.
- Blockers: none.
- Next: use `STATUS.md` + `NEXT_PLAN.md` before starting Phase 11 work.

## 2026-05-30

- Status: `[x]` M10 Streamlit playable demo complete.
- Changed: added `RuntimeSessionService`; refactored CLI to share service layer;
  added `streamlit_app.py`; added Streamlit dependency and `make streamlit`;
  fixed Streamlit widget state sync after browser testing.
- Verified: `make test` PASS; `make test-db` PASS; `make smoke-local` PASS;
  `make connect-demo` PASS; browser flow PASS for player creation, loop start,
  3 turns, archive, Echo display, next loop Echo carry-over, free-form action,
  filesystem image preview, MinIO image URI, and Ollama narrative mode.
- Blockers: in-app browser `iab` was unavailable, so browser verification used
  Playwright MCP.
- Next: Phase 11 Streamlit Demo Polish.

## 2026-05-30

- Status: `[x]` post-MVP documentation and test-noise cleanup complete.
- Changed: updated README runtime usage; documented infra, CLI, smoke commands,
  image options, and Streamlit demo usage; quieted test log output.
- Verified: `make test` PASS; `make smoke-local` PASS.
- Blockers: none.
- Next: split future plan/progress docs to avoid overloading a single tracker.

## 2026-05-30

- Status: `[x]` M9 Observability and QA complete.
- Changed: added JSON logging, optional OTLP HTTP trace export, span context
  manager, timed helper, and smoke aggregation targets.
- Verified: `make smoke` PASS; Jaeger service and MythOS spans visible.
- Blockers: none.
- Next: Streamlit playable demo.

## 2026-05-30

- Status: `[x]` M0-M8 local runtime vertical slice complete.
- Changed: implemented local infra, schema, core models, PostgreSQL store,
  Narrative Director, Loop Engine, Visual Service, and CLI vertical slice.
- Verified: unit tests, DB tests, narrative smoke, visual smoke, CLI demo, and
  tiny FLUX image generation all passed during milestone work.
- Blockers: none.
- Next: observability, QA, and browser demo.
