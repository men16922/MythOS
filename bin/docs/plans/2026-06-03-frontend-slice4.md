# P3 Slice 4 — Frontend 설계 결정

작성일: 2026-06-03
상태: 완료 (Vite + React + TS SPA 구현 완료)

P3 백엔드(slice 1·2·3: REST + WebSocket 스트리밍 + presigned URL)가 완성되어
프론트엔드가 붙을 수 있는 헤드리스 게임 엔진이 되었다. 이 문서는 프론트엔드
계층의 두 경로를 비교하고 진행 결정을 기록한다.

## 백엔드 계약 (붙는 대상)

```
REST  POST /api/v1/auth/connect   /loops/begin  GET /loops/active
      POST /loops/choose  /combat/begin  /combat/action  /assets/resolve
WS    /api/v1/loops/stream  → {type: token|snapshot|error}
```

## 두 경로

### A. 풀 Next.js/Vite SPA (설계 §3·§4 정공법)
- `frontend/` 신규 Node 프로젝트: React + Zustand + PixiJS/Konva Canvas, Vite dev proxy.
- 장점: 제품용 UI, 확장성, 설계 명세 그대로.
- 비용: Node/npm/TS 툴체인 신설, 기존 `make test`로 검증 불가(vitest/playwright + CI Node job 필요), 사실상 별도 프로젝트(다중 트랙).

### B. 경량 PoC 레퍼런스 클라이언트 (선택)
- `src/mythos_api/static/{index.html,app.js}` — vanilla JS(fetch + WebSocket + DOM), 빌드 없음.
- `app.py`가 `StaticFiles(html=True)`로 마운트하여 `python -m mythos_api`만으로 제공.
- 장점: 툴체인 0, 기존 `make test`에 `GET /` 200 편입, 반나절, A안의 호출 시퀀스 명세이자 스모크.
- 한계: 제품 UI 아님. Canvas 전투는 blip 최소 증명 수준.

## 결정

**B 먼저 → 확인 후 A를 별도 트랙으로.**

근거:
1. 지금 최우선 가치는 REST+WS+presigned가 끝까지 게임을 돌린다는 실증.
2. B의 `app.js`는 A 구현 시 그대로 호출 시퀀스 명세가 되어 버리는 코드가 아님.
3. A는 Node/CI/Canvas를 끌어오는 별도 프로젝트 결정 → B로 계약을 굳힌 뒤 시작이 회귀·되돌리기 리스크가 낮음.

## B 구현 스펙

- `static/index.html`: 접속 폼(이름·fallback 토글), 내러티브 영역, 선택지 버튼, 장면 이미지, 상태 로그, 최소 전투 캔버스.
- `static/app.js`:
  1. `connect` → `player_id` 저장.
  2. WS 연결 → `{event:begin, player_id, fallback}` → `token` 누적 타이핑 → `snapshot` 확정.
  3. 선택지 클릭 → `{event:choose, loop_id, choice_id, fallback}` → 재스트리밍.
  4. snapshot.assets[].storage_uri → `POST /assets/resolve` → `<img>`.
  5. (선택) snapshot.combat.radar.blips → `<canvas>` 점 렌더.
- `app.py`: 모든 라우트 등록 후 `app.mount("/", StaticFiles(directory=static, html=True))` (API/WS 라우트가 우선).
- 검증: `tests/test_api.py`에 `GET /` 200 + `index.html` 본문 포함 확인 추가.

## A 착수 시 (후속 트랙)
- `frontend/` Vite+React, `vite.config.ts` dev proxy `/api`, Zustand GameState(설계 §3.1), CombatCanvas(PixiJS), CI에 Node job.
