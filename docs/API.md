# MythOS HTTP API (mythos_api)

P3 Web UI 디커플링의 백엔드 어댑터다. Streamlit과 동일한 `RuntimeSessionService`
오케스트레이션을 `/api/v1` REST + WebSocket으로 노출하고, 루트(`/`)에서 경량 PoC
클라이언트를 서빙한다. Streamlit은 무변경이며 이 어댑터는 추가형이다.

설계: `docs/plans/2026-06-03-web-ui-decoupling.md`, 프론트 결정: `docs/plans/2026-06-03-frontend-slice4.md`.

## 실행

```bash
make setup            # .[dev,web] 설치 (fastapi/uvicorn/httpx 포함)
make api              # python -m mythos_api  (기본 127.0.0.1:8000)
# MYTHOS_API_HOST / MYTHOS_API_PORT 로 바인드 주소 override
```

브라우저로 `http://127.0.0.1:8000/` 를 열면 PoC 클라이언트가 접속→루프→선택→이미지
흐름을 보여준다. 이미지 생성은 `make infra-up` + `make visual-worker`(또는 동기 모드)와
Ollama가 떠 있을 때만 채워진다.

## REST 엔드포인트 (`/api/v1`)

인증 레이어가 아직 없어 식별자(`player_id`/`loop_id`)는 요청 바디로 명시 전달한다.

| Method | Path | Body | 반환 |
| :-- | :-- | :-- | :-- |
| GET | `/api/v1/health` | — | `{status: ok}` |
| POST | `/api/v1/auth/connect` | `{display_name, player_id?, archetype?, scenario_id?}` | PlayerProfile |
| POST | `/api/v1/loops/begin` | `{player_id, scenario_id?, fallback?}` | RuntimeSnapshot |
| GET | `/api/v1/loops/active` | `?player_id=&scenario_id=` | RuntimeSnapshot |
| POST | `/api/v1/loops/choose` | `{loop_id, choice_id?, action?, scenario_id?, fallback?}` | RuntimeSnapshot |
| POST | `/api/v1/combat/begin` | `{loop_id, encounter_id, scenario_id?}` | CombatState |
| POST | `/api/v1/combat/action` | `{loop_id, action, scenario_id?}` | CombatState |
| POST | `/api/v1/assets/resolve` | `{storage_uri, expires_in?}` | `{url, expires_in}` (presigned) |

오류 매핑: not-found → 404, 그 외 RuntimeError → 409, malformed s3 uri → 400.

`RuntimeSnapshot` JSON 형태: `{player, loop_id, phase, location, stability, tension,
state, active_scene{title,narration,choices[],visual_brief,...}, assets[], image_result,
echo, bgm_path, combat}` (`src/mythos_api/serializers.py`).

## WebSocket: `/api/v1/loops/stream` (토큰 스트리밍 + 이미지)

하나의 소켓에서 `begin`/`choose`를 반복 전송한다.

```jsonc
// client → server
{"event": "begin",  "player_id": "...", "fallback": true, "with_image": false}
{"event": "choose", "loop_id": "...", "choice_id": "...", "with_image": true, "visual_async": true}

// server → client
{"type": "token", "content": "어"}          // 서사 토큰 (점진)
{"type": "snapshot", "data": { /* RuntimeSnapshot */ }}
{"type": "visual_status", "status": "pending",   "asset_id": "..."}
{"type": "visual_status", "status": "processing","asset_id": "..."}
{"type": "visual_status", "status": "succeeded", "asset_id": "...", "url": "https://…presigned"}
{"type": "error", "detail": "..."}
```

글이 먼저 스트리밍되고, 이미지는 생성이 끝나면 `visual_status`로 뒤따라 채워진다
(동기 생성은 즉시 terminal 프레임, 비동기는 pending 후 폴링).

## 테스트

`tests/test_api.py` — in-memory store를 FastAPI dependency override로 주입해
DB/Ollama/FLUX 없이 REST·WebSocket·정적 클라이언트·presigned·visual_status 로직을
검증한다. `make test`에 포함.

## 남은 트랙

- 옵션 A: 풀 Next.js/Vite SPA + PixiJS Canvas 전술 보드 (별도 Node 트랙).
