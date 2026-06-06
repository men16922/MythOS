# MythOS HTTP API

최종 갱신: 2026-06-06

`src/mythos_api`는 `RuntimeSessionService`를 FastAPI `/api/v1` REST + WebSocket으로 노출한다.
루트(`/`)는 빌드된 React SPA(`src/mythos_ui`)를 서빙한다. Streamlit은 별도 demo layer지만 같은 runtime service를 호출한다.

## Run

```bash
make api              # python -m mythos_api, default 127.0.0.1:8000
make dev-up           # infra + migration + visual worker + API foreground
make dev-down
```

브라우저: `http://127.0.0.1:8000/`

## REST Endpoints

Base path: `/api/v1`

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API health |
| `GET` | `/scenarios` | scenario/archetype metadata |
| `POST` | `/auth/connect` | create/update player |
| `POST` | `/loops/begin` | start loop |
| `GET` | `/loops/active?player_id=&scenario_id=` | resume active loop |
| `POST` | `/loops/choose` | choose option or free action |
| `GET` | `/loops/{loop_id}/scenes` | scene/action history |
| `POST` | `/combat/begin` | start encounter |
| `POST` | `/combat/action` | dispatch combat action |
| `GET` | `/memory?player_id=` | codex/dev memory overview |
| `POST` | `/assets/resolve` | convert `s3://...` asset URI to presigned URL |

Error mapping:

- not found -> `404`
- invalid request / malformed storage URI -> `400`
- runtime conflict -> `409`

## WebSocket

Path: `/api/v1/loops/stream`

Client events:

```json
{"event": "begin", "player_id": "...", "fallback": true, "with_image": false}
{"event": "choose", "loop_id": "...", "choice_id": "...", "with_image": true, "visual_async": true}
```

Server frames:

```json
{"type": "token", "content": "어"}
{"type": "snapshot", "data": {}}
{"type": "visual_status", "status": "pending", "asset_id": "..."}
{"type": "visual_status", "status": "processing", "asset_id": "..."}
{"type": "visual_status", "status": "succeeded", "asset_id": "...", "url": "https://..."}
{"type": "error", "detail": "..."}
```

Text streams first. Images arrive later through `visual_status` when async generation is enabled.

## Tests

- `tests/test_api.py`: in-memory FastAPI dependency override, REST/WS/static asset behavior.
- Browser regression: `make test-e2e` uses `?fallback=1&image=0` for deterministic React flow.
