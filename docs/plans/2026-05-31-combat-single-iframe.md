# 전투화면 단일 자기완결형 iframe 재구성 (flicker/흰박스 근본 해결)

작성일: 2026-05-31 · 상태: 완료

## Context (왜)

현재 전투 UI는 Streamlit 네이티브 위젯 + `st.iframe`(보드) + 숨김 `st.text_input` 다리로 구성되며,
**매 액션마다 Streamlit rerun → `st.iframe` 재마운트(srcdoc 리로드)** 가 발생한다. 그 결과:

- **깜박임**: 이동/스킬/공격마다 보드 iframe이 흰색으로 깜빡인 뒤 다시 그려진다. `@st.fragment`로
  범위를 줄여도 보드 iframe 자체가 매번 remount되어 근본 해결이 안 된다.
- **흰 박스**: 보드↔서버 통신용 `hidden_combat_action` text input이 부모 페이지에 실재해야 하는데,
  숨김 CSS가 타이밍/셀렉터 문제로 새어 흰 입력칸으로 보인다.

→ 둘 다 "Streamlit 위젯 + per-action rerun + iframe remount" 구조의 한계. 합의된 방향(옵션 1):
**전투 표현 계층 전체를 하나의 자기완결형 iframe**으로 모으고, 전투 중에는 **Streamlit을 rerun하지
않는다.** 엔진/DB/서사/`CombatService`/스키마는 그대로 둔다.

## 설계 개요 (Option A: 로컬 JSON 엔드포인트 + 단일 iframe)

전투 중 모든 인터랙션을 iframe 내부에서 처리하고, 턴 처리는 **Streamlit 프로세스 안에서 도는
경량 로컬 HTTP 엔드포인트**에 `fetch`로 위임한다. Streamlit rerun은 **전투 진입(1회 마운트)과
전투 종료 후 다음 장면 전환(1회)** 에서만 일어난다 → per-action rerun/remount 소멸 → flicker 없음.
네이티브 전투 버튼이 사라지므로 흰 박스도 원천 제거(숨김 input은 종료 신호 1회용으로만 잔존).

```
[Streamlit fragment] 최초 1회: st.iframe(combat_app srcdoc) + 숨김 exit-input 렌더
        │ (srcdoc = localhost:8501 same-origin)
        ▼
[combat iframe]  보드+로스터+컨트롤+로그+결과를 자체 렌더
        │ 액션마다 fetch POST(text/plain, CORS) → 127.0.0.1:{port}/combat/action
        ▼
[combat_server (백그라운드 스레드, Streamlit 프로세스 내)]
        │ RuntimeSessionService.combat_action(...) → 엔진/DB
        ▼  JSON 응답(radar/available/finished/outcome/rewards/summary/prose/inventory/focus)
[combat iframe] 응답으로 in-place 재렌더 (Streamlit rerun 없음 → 깜박임 없음)
        │ 전투 종료 + "다음 장면" 클릭 시: window.parent 숨김 input에 {type:"exit"} 기록(1회)
        ▼
[Streamlit] rerun → choose()로 다음 서사 장면 진입 / 패배 시 메인 복귀
```

**대안 검토 — Option B(Streamlit 양방향 custom component)**: remount는 막지만 per-action script
rerun이 남고, JS 빌드 또는 component 핸드셰이크 구현이 필요. 이 repo는 JS 빌드 체계가 없고 기존에
로컬 서버 패턴을 쓴 이력이 있어 **Option A 채택**.

## 변경/신규 파일

### 1) `src/mythos_runtime/combat_server.py` (신규)
- 프로세스당 1회 기동하는 백그라운드 `http.server`(127.0.0.1 바인드, daemon 스레드). 모듈 전역 +
  락으로 단일 인스턴스 보장, 포트 반환. **정적 파일 서빙 안 함**(os.chdir 불필요 → 과거 CWD 버그 무관).
- 라우트:
  - `OPTIONS *` → CORS 프리플라이트 200(`Access-Control-Allow-Origin: *`).
  - `POST /combat/action` (body=JSON 문자열, `Content-Type: text/plain`로 프리플라이트 회피).
  - `GET /combat/state?loop_id=&scenario_id=` (초기/재동기화용).
- HTTP와 분리된 **순수 핸들러**로 테스트 가능하게:
  - `combat_action_response(service, loop_id, scenario_id, action_dict) -> dict`
  - `combat_state_response(service, loop_id, scenario_id) -> dict`
  요청마다 `PostgresMythOSStore()` + `RuntimeSessionService` 생성(기존 `_load_current_snapshot`
  패턴과 동일, 요청별 커넥션). 응답 JSON은 기존 `session._combat_snapshot()` 결과
  (`radar/available/finished/outcome/rewards/summary`)에 `prose`(최근 combat scene narration)·
  `inventory`(소비품 카운트)·party HP를 추가.
- 엔진 호출은 **이미지 생성 비활성 `RuntimeOptions`**(combat 턴은 key beat 아님)로 호출해 턴 응답을
  빠르게 유지. `action_dict → PlayerAction(type, target_id, skill_id, item_id, move_to)` 매핑.
- 재사용: `session._combat_snapshot`, `mythos_combat.PlayerAction`, `RuntimeSessionService.combat_action`.

### 2) `streamlit_app.py`
- **`_render_combat_arena_fragment` 단순화**:
  - `combat_server` 기동 후 포트 확보(세션/모듈 캐시).
  - 초기 config: `loop_id`, `scenario_id`, `port`, 초기 combat JSON(`_combat_snapshot` 동등),
    시나리오 skill/item 메타(이름·비용·쿨다운·kind), 포트레이트 data URI 맵(`_combat_portrait_data_uri`),
    SFX base64 맵(`_get_b64_sfx`).
  - `st.iframe(_build_combat_app_html(config), height=...)` **1회** + 숨김 exit-input 1회.
  - 숨김 input 처리: `{type:"exit","outcome":...}` 수신 시 → 승리/계속이면
    `service.choose(action="전투 결과를 정리하고 다음 장면으로 이동한다.")` + `_set_snapshot` + 전체 rerun,
    패배면 `_return_to_player_main(...)`. (기존 `_render_combat_outcome` 버튼 로직을 이 핸들러로 이관.)
  - **per-action `_dispatch`/`st.rerun(scope="fragment")` 제거**(액션은 iframe→엔드포인트로 처리).
- **`_build_combat_app_html(config)` 신규**: 단일 자기완결 렌더러.
  - 기존 `_COMBAT_BOARD_CSS`/`_COMBAT_BOARD_JS` 확장: 보드(드래그/클릭) + 파티/적 로스터 +
    focus 게이지 + 컨트롤(스킬/아이템/공격/방어/도주) + 콘솔 로그 + 종료 시 결과 패널/버튼.
  - 모든 액션: `fetch(POST /combat/action)` → 응답 JSON으로 `renderAll(state)` in-place 갱신.
    select/hover/reachable 하이라이트는 순수 클라이언트(서버 왕복 없음).
  - SFX: 주입된 base64로 클릭/이동/승패 재생.
  - 종료+continue/return 클릭 시에만 `window.parent.document` 숨김 input에 `{type:"exit"}` 기록.
- **정리**: active-combat에서 쓰던 Streamlit 네이티브 컨트롤 경로(`_render_combat_controls` 버튼/
  `_dispatch`, `_render_tactical_board_interactive`의 board+hidden input, `_render_combat_outcome`
  버튼)는 새 렌더러로 대체되어 fragment에서 호출하지 않음(미사용 정리 단계에서 제거).
- 재사용: `_combat_portrait_data_uri`, `_get_b64_sfx`, `_return_to_player_main`, `load_scenario`.

### 3) `src/mythos_runtime/session.py` (소폭)
- 엔드포인트가 쓰기 좋게 `_combat_snapshot`을 직접 호출하거나 공개 래퍼(`combat_state(loop_id, options)`)
  추가. 최소 변경 우선.

### 4) `tests/test_combat_server.py` (신규)
- `tests/test_session_combat.py`의 `_InMemoryStore` 패턴 재사용해 `RuntimeSessionService` 주입.
- 순수 핸들러 테스트: start_combat 후
  `combat_action_response(service, loop_id, sid, {"type":"skill","skill_id":"packet_shot"})`가
  기대 키와 상태 변화(focus/적 HP)를 반환하는지, `combat_state_response`가 활성 전투 JSON을
  반환하는지(HTTP 소켓 없이 함수 단위 검증).

## 리스크 / 메모
- 로컬 POST 엔드포인트가 전투 변이를 수행 → 127.0.0.1 바인드, 외부 비노출, CORS는 로컬 데모 한정.
  `docs/DECISIONS.md`에 "전투 표현 분리: 로컬 JSON 엔드포인트 + 단일 iframe(no per-action rerun)" 기록.
- 종료 신호는 same-origin srcdoc의 `window.parent` 접근(검증된 경로) 1회만 사용 → 저빈도라 안정.
- 엔진/`CombatService`/스키마 **무변경** → 기존 27개 전투 테스트 그대로 통과해야 함.
- 이미지: 전투 턴은 엔드포인트에서 비활성, 포트레이트(data URI)만 사용. 종료 후 서사 장면에서 기존
  비주얼 파이프라인 정상.
- 스레드/DB: 요청별 store 생성(psycopg 요청별 커넥션). 단일 워커 스레드 서버로 충분(1인 플레이).

## Verification (착수 시)
- `make test`(118+신규) / `make typecheck` / 변경 파일 ruff PASS — 엔진·서비스 회귀 없음 확인.
- `tests/test_combat_server.py`로 액션/상태 핸들러 JSON·상태전이 검증.
- Streamlit headless 부팅 200 OK.
- **브라우저 수동 회귀(필수)**: 전투 진입 → (1) 깜박임 無, (2) 흰 박스 無, (3) 플레이어 선택→이동칸
  표시→클릭/드래그 이동, (4) 스킬/아이템/공격/방어/도주 동작·집중/쿨다운 갱신, (5) 승리→다음 장면,
  (6) 패배→메인 복귀.
