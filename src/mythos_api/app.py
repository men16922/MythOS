"""FastAPI application exposing RuntimeSessionService as `/api/v1`.

First slice of the P3 Web UI decoupling (design §2.1 REST endpoints). This
adapter is additive: it does not touch the Streamlit UI and delegates all
authority to `RuntimeSessionService`/`CombatService`. WebSocket token
streaming (§2.2) and the distributed worker (§5) are later slices.

Deviation from the idealized design: because there is no session/cookie auth
layer yet, identifiers (`player_id`, `loop_id`) are carried explicitly in the
request bodies instead of being inferred from an auth context.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.concurrency import iterate_in_threadpool

from mythos_api.serializers import player_to_dict, snapshot_to_dict
from mythos_api.service import get_service, get_storage_adapter
from mythos_runtime.combat_server import combat_action_response, combat_state_response
from mythos_runtime.options import RuntimeOptions, RuntimeStreamEvent
from mythos_runtime.session import RuntimeSessionService
from mythos_runtime.visual_service import MinIOStorageAdapter

API_PREFIX = "/api/v1"
STATIC_DIR = Path(__file__).parent / "static"


# --- Request models ---------------------------------------------------------


class ConnectRequest(BaseModel):
    display_name: str = Field(min_length=1)
    player_id: str | None = None
    archetype: str | None = None
    scenario_id: str = "neo-seoul"


class BeginLoopRequest(BaseModel):
    player_id: str = Field(min_length=1)
    scenario_id: str = "neo-seoul"
    fallback: bool = False


class ChooseRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    choice_id: str | None = None
    action: str | None = None
    scenario_id: str = "neo-seoul"
    fallback: bool = False


class CombatBeginRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    encounter_id: str = Field(min_length=1)
    scenario_id: str = "neo-seoul"


class CombatActionRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    action: dict[str, Any]
    scenario_id: str = "neo-seoul"


class AssetResolveRequest(BaseModel):
    storage_uri: str = Field(min_length=1)
    expires_in: int = Field(default=600, ge=1, le=86400)


# --- Error mapping ----------------------------------------------------------


def _as_http_error(exc: RuntimeError) -> HTTPException:
    message = str(exc)
    lowered = message.lower()
    if "not found" in lowered or "has no scenes" in lowered:
        return HTTPException(status_code=404, detail=message)
    return HTTPException(status_code=409, detail=message)


# --- WebSocket streaming (design §2.2) --------------------------------------


def _stream_for(
    service: RuntimeSessionService,
    message: dict[str, Any],
) -> Iterator[RuntimeStreamEvent]:
    """Map an inbound socket message to the matching runtime token stream."""
    options = RuntimeOptions(
        scenario_id=message.get("scenario_id", "neo-seoul"),
        fallback=bool(message.get("fallback", False)),
    )
    event = message.get("event")
    if event == "begin":
        return service.stream_start_loop(message["player_id"], options)
    if event == "choose":
        return service.stream_choose(
            message["loop_id"],
            choice_id=message.get("choice_id"),
            action=message.get("action"),
            options=options,
        )
    raise KeyError(f"unknown event: {event!r}")


async def _run_stream(
    websocket: WebSocket,
    service: RuntimeSessionService,
    message: dict[str, Any],
) -> None:
    """Drive one runtime token stream and relay it to the client socket.

    The runtime stream is a blocking sync generator (it calls Ollama), so we
    iterate it in a threadpool to avoid stalling the event loop, relaying each
    token as ``{"type": "token"}`` and the terminal frame as
    ``{"type": "snapshot"}`` (design §2.2).
    """
    try:
        generator = _stream_for(service, message)
        async for event in iterate_in_threadpool(generator):
            if event.kind == "text":
                await websocket.send_json({"type": "token", "content": event.text})
            elif event.snapshot is not None:
                await websocket.send_json(
                    {"type": "snapshot", "data": snapshot_to_dict(event.snapshot)}
                )
    except KeyError as exc:
        await websocket.send_json({"type": "error", "detail": str(exc).strip("'\"")})
    except RuntimeError as exc:
        await websocket.send_json({"type": "error", "detail": str(exc)})


# --- App factory ------------------------------------------------------------


def create_app() -> FastAPI:
    app = FastAPI(title="Project MythOS API", version="0.1.0")

    @app.get("/api/v1/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post(f"{API_PREFIX}/auth/connect")
    def connect(
        body: ConnectRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        traits = {"archetype": body.archetype} if body.archetype else None
        player = service.create_player(
            body.display_name,
            player_id=body.player_id,
            traits=traits,
            scenario_id=body.scenario_id,
        )
        return player_to_dict(player)

    @app.post(f"{API_PREFIX}/loops/begin")
    def begin_loop(
        body: BeginLoopRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        options = RuntimeOptions(scenario_id=body.scenario_id, fallback=body.fallback)
        try:
            snapshot = service.start_loop(body.player_id, options)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc
        return snapshot_to_dict(snapshot)

    @app.get(f"{API_PREFIX}/loops/active")
    def active_loop(
        player_id: str,
        scenario_id: str = "neo-seoul",
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        options = RuntimeOptions(scenario_id=scenario_id)
        try:
            snapshot = service.resume(player_id=player_id, options=options)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc
        return snapshot_to_dict(snapshot)

    @app.post(f"{API_PREFIX}/loops/choose")
    def choose(
        body: ChooseRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        options = RuntimeOptions(scenario_id=body.scenario_id, fallback=body.fallback)
        try:
            snapshot = service.choose(
                body.loop_id,
                choice_id=body.choice_id,
                action=body.action,
                options=options,
            )
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc
        return snapshot_to_dict(snapshot)

    @app.post(f"{API_PREFIX}/combat/begin")
    def combat_begin(
        body: CombatBeginRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        options = RuntimeOptions(scenario_id=body.scenario_id, fallback=True)
        try:
            service.start_combat(body.loop_id, body.encounter_id, options)
            return combat_state_response(service, body.loop_id, body.scenario_id)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    @app.post(f"{API_PREFIX}/combat/action")
    def combat_action(
        body: CombatActionRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            return combat_action_response(
                service, body.loop_id, body.scenario_id, body.action
            )
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    @app.post(f"{API_PREFIX}/assets/resolve")
    def resolve_asset(
        body: AssetResolveRequest,
        storage: MinIOStorageAdapter = Depends(get_storage_adapter),
    ) -> dict[str, Any]:
        # Virtualize the logical s3:// storage_uri into a short-lived presigned
        # HTTPS URL; non-s3 URIs pass through unchanged (design §5.2).
        try:
            url = storage.presigned_url(body.storage_uri, expires_in=body.expires_in)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"url": url, "expires_in": body.expires_in}

    @app.websocket(f"{API_PREFIX}/loops/stream")
    async def loops_stream(
        websocket: WebSocket,
        service: RuntimeSessionService = Depends(get_service),
    ) -> None:
        await websocket.accept()
        try:
            while True:
                message = await websocket.receive_json()
                await _run_stream(websocket, service, message)
        except WebSocketDisconnect:
            return

    # Serve the PoC reference client at "/" (design slice 4 option B). Mounted
    # last so the API/WebSocket routes above take precedence over the catch-all.
    if STATIC_DIR.is_dir():
        app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

    return app
