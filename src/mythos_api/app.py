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

import asyncio
from collections.abc import Iterator
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.concurrency import iterate_in_threadpool, run_in_threadpool

from mythos_api.serializers import player_to_dict, snapshot_to_dict
from mythos_api.service import get_service, get_storage_adapter
from mythos_core import AssetRecord
from mythos_runtime.combat_server import combat_action_response, combat_state_response
from mythos_runtime.options import RuntimeOptions, RuntimeSnapshot, RuntimeStreamEvent
from mythos_runtime.scenario import load_scenario
from mythos_runtime.session import RuntimeSessionService
from mythos_runtime.visual_service import MinIOStorageAdapter, VisualGenerationResult

API_PREFIX = "/api/v1"
STATIC_DIR = Path(__file__).parent / "static"
# Scenarios discoverable by the onboarding screen (resources/<id>/scenario.json).
_SCENARIO_IDS = ("neo-seoul", "glass-library")

# Terminal vs. in-flight image asset statuses, and bounded polling for the
# async (Redis worker) path so a never-finishing job can't hang the socket.
# The window must comfortably cover a real FLUX generation: a live run on MPS
# at 1024px exceeded 30s, so the succeeded frame was missed; 90s gives margin.
_TERMINAL_VISUAL = {"succeeded", "failed", "disabled"}
_VISUAL_POLL_INTERVAL_S = 1.0
_VISUAL_POLL_TRIES = 90


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
        with_image=bool(message.get("with_image", False)),
        visual_async=bool(message.get("visual_async", False)),
        image_every_turn=bool(message.get("image_every_turn", False)),
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


def _find_asset(
    service: RuntimeSessionService, loop_id: str, asset_id: str
) -> AssetRecord | None:
    """Look up one asset by id within a loop (store has only list_assets)."""
    for asset in service.store.list_assets(loop_id):
        if asset.asset_id == asset_id:
            return asset
    return None


def _visual_frame(
    storage: MinIOStorageAdapter,
    *,
    status: str,
    asset_id: str | None,
    storage_uri: str | None,
) -> dict[str, Any]:
    """Build a visual_status frame, signing the URL on success (design §2.2)."""
    frame: dict[str, Any] = {"type": "visual_status", "status": status, "asset_id": asset_id}
    if status == "succeeded" and storage_uri:
        frame["url"] = storage.presigned_url(storage_uri)
    return frame


def _terminal_visual_frame(
    storage: MinIOStorageAdapter, result: VisualGenerationResult
) -> dict[str, Any] | None:
    """Frame for an already-resolved image; None if still in flight (pending)."""
    asset_id = result.asset.asset_id if result.asset else None
    if result.status in _TERMINAL_VISUAL:
        return _visual_frame(
            storage, status=result.status, asset_id=asset_id, storage_uri=result.storage_uri
        )
    return None


async def _emit_visual_status(
    websocket: WebSocket,
    service: RuntimeSessionService,
    storage: MinIOStorageAdapter,
    snapshot: RuntimeSnapshot,
) -> None:
    """After the snapshot, stream the scene image lifecycle to the client.

    Synchronous generation arrives already-resolved (one terminal frame). The
    async Redis-worker path arrives ``pending``; we announce it and poll the
    store until the worker marks the asset terminal, relaying processing →
    succeeded/failed with a presigned URL on success.
    """
    result = snapshot.image_result
    if result is None:
        return
    terminal = _terminal_visual_frame(storage, result)
    if terminal is not None:
        await websocket.send_json(terminal)
        return

    asset_id = result.asset.asset_id if result.asset else None
    if asset_id is None:
        return
    loop_id = snapshot.loop.loop_id
    await websocket.send_json(
        {"type": "visual_status", "status": "pending", "asset_id": asset_id}
    )
    for _ in range(_VISUAL_POLL_TRIES):
        await asyncio.sleep(_VISUAL_POLL_INTERVAL_S)
        asset = await run_in_threadpool(_find_asset, service, loop_id, asset_id)
        if asset is None:
            continue
        if asset.status in _TERMINAL_VISUAL:
            await websocket.send_json(
                _visual_frame(
                    storage,
                    status=asset.status,
                    asset_id=asset_id,
                    storage_uri=asset.storage_uri,
                )
            )
            return
        await websocket.send_json(
            {"type": "visual_status", "status": "processing", "asset_id": asset_id}
        )


async def _run_stream(
    websocket: WebSocket,
    service: RuntimeSessionService,
    storage: MinIOStorageAdapter,
    message: dict[str, Any],
) -> None:
    """Drive one runtime token stream and relay it to the client socket.

    The runtime stream is a blocking sync generator (it calls Ollama), so we
    iterate it in a threadpool to avoid stalling the event loop, relaying each
    token as ``{"type": "token"}`` and the terminal frame as
    ``{"type": "snapshot"}``. After the snapshot we stream the scene image
    lifecycle as ``{"type": "visual_status"}`` frames (design §2.2).
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
                await _emit_visual_status(websocket, service, storage, event.snapshot)
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

    @app.get(f"{API_PREFIX}/scenarios")
    def scenarios() -> dict[str, Any]:
        # Onboarding data: scenario list + selectable archetypes.
        items: list[dict[str, Any]] = []
        for sid in _SCENARIO_IDS:
            try:
                s = load_scenario(sid)
            except Exception:
                continue
            items.append({
                "id": sid,
                "name": s.name,
                "brief": s.brief,
                "archetypes": [
                    {
                        "name": a.get("name"),
                        "attributes": a.get("attributes", []),
                        "starting_item": a.get("starting_item"),
                        "stats": a.get("stats", {}),
                    }
                    for a in s.archetypes
                ],
            })
        return {"scenarios": items}

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
        storage: MinIOStorageAdapter = Depends(get_storage_adapter),
    ) -> None:
        await websocket.accept()
        try:
            while True:
                message = await websocket.receive_json()
                await _run_stream(websocket, service, storage, message)
        except WebSocketDisconnect:
            return

    # Serve the PoC reference client at "/" (design slice 4 option B). Mounted
    # last so the API/WebSocket routes above take precedence over the catch-all.
    if STATIC_DIR.is_dir():
        app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

    return app
