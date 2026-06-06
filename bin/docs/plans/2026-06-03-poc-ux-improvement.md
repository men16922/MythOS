# PoC 클라이언트 UI/UX 개선 방안

작성일: 2026-06-03
상태: Done (Phase 1·2·3 + 전투 플레이어블 완료, 2026-06-03)
대상: `src/mythos_api/static/{index.html, app.js}` (FastAPI가 `/`에 서빙하는 PoC 클라이언트)

## 0. 전제 — PoC와 Streamlit은 별개다

이 PoC 클라이언트는 **기존 `streamlit_app.py`와 완전히 별개**다(맞다). 목적이 다르다:

- **Streamlit**: 현재 실제 플레이용 풀 UI(전투 iframe, 오프닝 시네마틱, Codex, 세이브/로드 등).
- **PoC**: P3 FastAPI `/api/v1` 계약(REST·WebSocket·presigned URL)이 끝까지 동작함을 한 화면으로 실증하는 **레퍼런스 클라이언트**. Node 툴체인 없이 vanilla HTML/JS.

따라서 이 개선은 "PoC를 Streamlit으로 다시 만든다"가 아니라, **Streamlit의 검증된 UX 언어를 참고해 PoC 화면을 보기 좋고 읽기 좋게 다듬는다**가 목표다. 빌드리스(vanilla) 제약과 단일 파일 구조는 유지한다.

## 1. 현재 상태 진단 (스크린샷 기준)

`screenshots/2026-06-03` 2장 기준 문제점:

| # | 문제 | 근거 |
| :-- | :-- | :-- |
| P1 | **생성 이미지가 화면을 압도** — 폭 100%로 본문보다 훨씬 큼, 비율/프레임 통제 없음 | shot 1: 이미지가 뷰포트 대부분 차지 |
| P2 | **본문(narration) 가독성 낮음** — 작은 글씨, 영어 1줄, 위계 없음, 줄길이 통제 없음 | shot 1 상단 |
| P3 | **선택지가 얇은 바** — affordance 낮고 밋밋, 핫키/순번 없음 | shot 1 choices |
| P4 | **우측 HUD 빈약** — loop/gauge/log가 작은 raw 텍스트로 뭉쳐 있음 | shot 1 우측 |
| P5 | **색 체계 불일치** — PoC는 시안/블루(`#38e8ff`/`#070b14`), Streamlit은 녹청 터미널 | 코드 대조 |
| P6 | **전투 캔버스 빈약** — 320×240 고정이라 확대 시 blip 하나가 거대·휑함, 좌표/유닛/HP 라벨 없음 | shot 2 |
| P7 | **상단 헤더/여백 빈약** — 정보 밀도·정렬·간격이 정돈되지 않음 | shot 1 |

## 2. 참고할 Streamlit UX 언어 (`streamlit_app.py`)

| 요소 | Streamlit 패턴 | 적용 포인트 |
| :-- | :-- | :-- |
| 팔레트 | 배경 `#020706` + 녹청 스캔라인 `rgba(0,255,170,.055)`, 액센트 `#8fffea`/`rgba(41,255,198,*)`, 글로우 `box-shadow:0 0 22px rgba(0,255,170,.08)` | PoC 전역 색을 녹청 터미널로 통일(P5) |
| 타이포 | `SF Mono` 일관, 제목 `#8fffea` | 본문/제목 위계 정리(P2) |
| 선택지 | `command-card`: 핫키 라벨(COMMAND 01) + 타이틀 + 카피, 스캔라인 텍스처, `min-height` 확보 | 선택지를 카드화(P3) |
| HUD | `st.metric`(Phase/Stability/Tension) + `terminal-panel` 보더·글로우 | 우측 패널을 게이지 카드로(P4) |
| 이미지 | `st.image(width=220~420)`로 **크기 통제**, 프레임 | 이미지 패널 폭/비율 고정(P1) |
| 레이아웃 | `st.columns([0.32,0.68])` 비대칭 2단(본문 우선) | 본문 중심 그리드 재배치 |

## 3. 개선 제안 (파일별)

### 3.1 `index.html` — 레이아웃 & 스타일
1. **팔레트 토큰 교체**(P5): `--cyan→--term`(`#8fffea`), `--bg #020706`, 스캔라인 배경 오버레이, 글로우 보더. Streamlit과 동일 톤.
2. **3-zone 레이아웃**(P1·P2·P7):
   - 좌(주): 씬 카드(타이틀 → 내러티브 본문, `max-width: 68ch`, `font-size: 15~16px`, `line-height 1.7`) → 선택지 카드 스택.
   - 우(보조, 고정폭 ~320px): HUD(게이지 카드) + 이미지 패널 + 로그.
   - 이미지를 본문 아래 full-bleed가 아니라 **우측 패널 안에서 비율 고정**(`aspect-ratio`, `max-height`)으로 통제.
3. **선택지 command-card**(P3): 각 선택지를 핫키(`[1] [2]`) + 라벨 + intent 캡션 카드로. hover 글로우, 키보드 1~4 단축키.
4. **HUD 게이지 카드**(P4): Phase/Stability/Tension/Autonomy를 라벨+수치+막대(progress bar)로. 스탯 막대는 색으로 위험도 표현.
5. **헤더 정리**(P7): 타이틀 + 접속 상태(접속/루프 id) + 컨트롤(이름/fallback/이미지 토글)을 한 줄 정렬.

### 3.2 `app.js` — 동작 & 렌더
6. **이미지 렌더 통제**(P1): 우측 패널에 삽입, 로딩 중 스켈레톤/플레이스홀더, `visual_status`에 따라 "생성 중" 진행 표시 → 완료 시 페이드인.
7. **타입라이터 옵션**(선택): 토큰 누적 시 부드러운 출력(Streamlit 오프닝 참고). 과하지 않게.
8. **전투 캔버스 개선**(P6):
   - 캔버스를 컨테이너 폭에 맞춰 반응형(`devicePixelRatio` 스케일), 셀 비율 유지.
   - blip에 **라벨/HP/팩션 색** 표기, 선택 유닛 사거리 링, 격자 좌표 흐리게.
   - 빈 전투(레이더 없음) 시 "전투 없음" 안내.
9. **상태 토스트/로그 정리**(P4): 우측 로그를 접이식·모노 컬러로, 핵심 상태는 상단 status로 분리.

### 3.3 반응형
10. 880px 이하에서 우측 패널을 본문 아래로 스택(현 미디어쿼리 강화), 이미지/캔버스 폭 100% 안전화.

## 4. 스코프 & 단계

- **Phase 1(핵심 가독성)** — `[x]` 완료(2026-06-03): 팔레트(녹청 터미널)·본문 중심 2단 레이아웃·command-card 선택지(+키보드 1-9)·HUD 게이지 막대·이미지 aspect 프레임 크기 통제·토큰 스트리밍 캐럿. `516fa5d`.
- **Phase 2(전투/연출)** — `[x]` 완료(2026-06-03): 전투 캔버스 실데이터(radar.arena.w/h) 반응형, 팩션 색·이름·HP 막대·사망 디밍·현재 턴 링·방어 호·reachable 사거리 하이라이트. 타입라이터(토큰 큐 → 글자 단위 출력, 완료 후 선택지 노출). `1191dea`.
- **Phase 3(마감)** — `[x]` 완료(2026-06-03): 와이드 중앙 정렬·560/900px 반응형, 접이식 로그 `<details>`, 터미널 스크롤바. `2f59550`.

- **Phase 4(전투 플레이어블)** — `[x]` 완료(2026-06-03): 스크린샷 피드백("조작할 게 없다") 반영. 전투 활성 시 좌측에 전투 컨트롤(표적 선택·사거리 표시·공격/방어/대기/도주·스킬+쿨다운·FOCUS/라운드)을 렌더하고 `POST /api/v1/combat/action`으로 턴 진행, 응답 prose·보드·컨트롤 갱신. 보드 reachable 칸 클릭으로 이동, 종료 시 outcome 배너(승리/도주→계속 WS choose, 패배→새 루프). `997594f`.

> 브라우저 육안 확인은 사용자 몫(`make api` → `http://127.0.0.1:8000`). 라이브 flow(connect→begin→combat/begin→action)는 검증됨.

각 Phase는 `index.html`+`app.js` 2파일 내 변경, 빌드리스 유지. 검증은 `tests/test_api.py`의 `GET /`·`/app.js` 본문 체크 + `make api` 라이브 육안.

## 5. 비목표 (Non-goals)

- Streamlit 기능(전투 iframe 실전투, Codex, 세이브/로드, 시네마틱)을 PoC에 복제하지 않는다.
- Node/npm/번들러 도입 없음(그건 별도 트랙 "옵션 A 풀 SPA").
- 게임 로직/백엔드 변경 없음 — 순수 프레젠테이션.

## 6. 참고

- 백엔드 계약: `docs/API.md`, `docs/plans/2026-06-03-web-ui-decoupling.md`
- 프론트 결정(B→A): `docs/plans/2026-06-03-frontend-slice4.md`
- 참고 UI: `streamlit_app.py` `_inject_player_css`(L171~), `command-card`(L268~), `_render_hud`(L3852~)
