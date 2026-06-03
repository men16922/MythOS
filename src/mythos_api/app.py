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

from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

from mythos_api.serializers import player_to_dict, snapshot_to_dict
from mythos_api.service import get_service
from mythos_runtime.combat_server import combat_action_response, combat_state_response
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.session import RuntimeSessionService

API_PREFIX = "/api/v1"


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


# --- Error mapping ----------------------------------------------------------


def _as_http_error(exc: RuntimeError) -> HTTPException:
    message = str(exc)
    lowered = message.lower()
    if "not found" in lowered or "has no scenes" in lowered:
        return HTTPException(status_code=404, detail=message)
    return HTTPException(status_code=409, detail=message)


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

    return app
