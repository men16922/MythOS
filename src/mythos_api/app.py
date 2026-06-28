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
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.concurrency import iterate_in_threadpool, run_in_threadpool
from starlette.responses import Response

from mythos_api.invite import InviteGateMiddleware
from mythos_api.limits import LOOP_CAP_MESSAGE, loop_cap_exceeded
from mythos_api.localize import localize_for
from mythos_api.serializers import (
    memory_overview_to_dict,
    player_to_dict,
    run_summary_to_dict,
    save_slot_to_dict,
    snapshot_to_dict,
)
from mythos_api.service import SigningStorageAdapter, get_service, get_storage_adapter
from mythos_core import Actor, AssetRecord
from mythos_runtime.combat_server import combat_action_response, combat_state_response
from mythos_runtime.observability import get_logger, timed
from mythos_runtime.options import RuntimeOptions, RuntimeSnapshot, RuntimeStreamEvent
from mythos_runtime.progression import (
    DEFAULT_ARCHETYPE,
    latest_meta_progression,
    scenario_unlock_met,
)
from mythos_runtime.scenario import load_scenario, load_scenario_i18n
from mythos_runtime.session import RuntimeSessionService
from mythos_runtime.visual_service import VisualGenerationResult

API_PREFIX = "/api/v1"
STATIC_DIR = Path(__file__).parent / "static"


class _NoCacheStaticFiles(StaticFiles):
    """Serve the SPA bundle with ``Cache-Control: no-cache``.

    The bundle is emitted as fixed filenames (``/app.js``, ``/assets/index.css``)
    without content hashes, so browsers would otherwise serve a stale build from
    heuristic cache after a rebuild. ``no-cache`` forces revalidation each load
    while ETag/Last-Modified still allow cheap 304s.
    """

    def file_response(self, *args: Any, **kwargs: Any) -> Response:
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "no-cache"
        return response
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
    lang: str = "ko"


class ChooseRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    choice_id: str | None = None
    action: str | None = None
    scenario_id: str = "neo-seoul"
    fallback: bool = False
    lang: str = "ko"


class CombatBeginRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    encounter_id: str = Field(min_length=1)
    scenario_id: str = "neo-seoul"
    party_members: list[dict[str, Any]] | None = None
    lang: str = "ko"


class CombatActionRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    action: dict[str, Any]
    scenario_id: str = "neo-seoul"
    lang: str = "ko"


class EquipRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    item_id: str = Field(min_length=1)
    equipped: bool = True


class ManualSaveRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    label: str | None = None


class AssetResolveRequest(BaseModel):
    storage_uri: str = Field(min_length=1)
    expires_in: int = Field(default=600, ge=1, le=86400)


class LearnSkillRequest(BaseModel):
    skill_id: str = Field(min_length=1)
    scenario_id: str = "neo-seoul"


# --- Error mapping ----------------------------------------------------------


def _as_http_error(exc: RuntimeError) -> HTTPException:
    message = str(exc)
    lowered = message.lower()
    if "not found" in lowered or "has no scenes" in lowered or "no active loop" in lowered:
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
        language=str(message.get("lang", "ko")),
        with_image=bool(message.get("with_image", False)),
        visual_async=bool(message.get("visual_async", False)),
        image_every_turn=bool(message.get("image_every_turn", False)),
        # Streamlit player-preset parity: 512x512 / 4 steps keeps mflux generation
        # fast (~8-15s) instead of the 1024x1024 default (~70-100s measured).
        image_width=int(message.get("image_width", 512)),
        image_height=int(message.get("image_height", 512)),
        image_steps=int(message.get("image_steps", 4)),
    )
    event = message.get("event")
    if event == "begin":
        if loop_cap_exceeded(service, message["player_id"]):
            raise RuntimeError(LOOP_CAP_MESSAGE)  # relayed as a {"type":"error"} frame
        return service.stream_start_loop(message["player_id"], options)
    if event == "choose":
        return service.stream_choose(
            message["loop_id"],
            choice_id=message.get("choice_id"),
            action=message.get("action"),
            options=options,
        )
    raise KeyError(f"unknown event: {event!r}")


def _find_asset(service: RuntimeSessionService, loop_id: str, asset_id: str) -> AssetRecord | None:
    """Look up one asset by id within a loop (store has only list_assets)."""
    for asset in service.store.list_assets(loop_id):
        if asset.asset_id == asset_id:
            return asset
    return None


def _visual_frame(
    storage: SigningStorageAdapter,
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
    storage: SigningStorageAdapter, result: VisualGenerationResult
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
    storage: SigningStorageAdapter,
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
    await websocket.send_json({"type": "visual_status", "status": "pending", "asset_id": asset_id})
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
    storage: SigningStorageAdapter,
    message: dict[str, Any],
) -> None:
    """Drive one runtime token stream and relay it to the client socket.

    The runtime stream is a blocking sync generator (it calls Ollama), so we
    iterate it in a threadpool to avoid stalling the event loop, relaying each
    token as ``{"type": "token"}`` and the terminal frame as
    ``{"type": "snapshot"}``. After the snapshot we stream the scene image
    lifecycle as ``{"type": "visual_status"}`` frames (design §2.2).
    """
    logger = get_logger("mythos.api")
    loop_id = message.get("loop_id", "unknown")
    event_name = message.get("event", "unknown")
    with timed(
        "mythos.api.stream_choose",
        logger,
        "token streaming pipeline finished",
        loop_id=loop_id,
        event=event_name,
    ):
        try:
            generator = _stream_for(service, message)
            async for event in iterate_in_threadpool(generator):
                if event.kind == "text":
                    await websocket.send_json({"type": "token", "content": event.text})
                elif event.snapshot is not None:
                    snap = localize_for(
                        snapshot_to_dict(event.snapshot),
                        message.get("scenario_id", "neo-seoul"),
                        message.get("lang", "ko"),
                    )
                    await websocket.send_json({"type": "snapshot", "data": snap})
                    await _emit_visual_status(websocket, service, storage, event.snapshot)
        except KeyError as exc:
            await websocket.send_json({"type": "error", "detail": str(exc).strip("'\"")})
        except RuntimeError as exc:
            await websocket.send_json({"type": "error", "detail": str(exc)})


# --- App factory ------------------------------------------------------------


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Release the shared Postgres pool on shutdown (replaces the deprecated
    ``@app.on_event("shutdown")`` hook). Startup needs no work; the pool is
    created lazily on first store access."""
    yield
    from mythos_memory.postgres_store import PostgresMythOSStore

    PostgresMythOSStore.close_pool()


@dataclass(frozen=True)
class _ScenarioProseL10n:
    """Localized player-facing scenario prose for the ``/scenarios`` payload."""

    name: str
    brief: str
    ui_copy: dict[str, Any]
    endings_overlay: list[dict[str, Any]] | None
    archetypes_overlay: dict[str, Any]


def _localized_scenario_prose(s: Any, lang: str) -> _ScenarioProseL10n:
    """Apply the additive i18n overlay to the player-facing scenario prose the
    ``/scenarios`` endpoint serves (name, brief, ui_copy.session_intro, ending titles,
    archetype name/attributes/starting_item).

    Behavior-preserving: when no overlay exists for ``lang`` (e.g. ``ko``), the
    scenario's own (Korean) prose is returned unchanged. The caller maps the endings
    overlay onto each ending's ``title`` by index and the archetype overlay by id.
    """
    i18n = load_scenario_i18n(s.scenario_id, lang)
    if not i18n:
        return _ScenarioProseL10n(s.name, s.brief, s.ui_copy, None, {})
    name = str(i18n.get("name") or s.name)
    brief = str(i18n.get("brief") or s.brief)
    ui_copy = dict(s.ui_copy) if isinstance(s.ui_copy, dict) else {}
    # Top-level ui_copy prose overlay (e.g. signal_body boot splash); session_intro is
    # merged separately below so its nested fields are field-merged, not replaced whole.
    ui_overlay = i18n.get("ui_copy")
    if isinstance(ui_overlay, dict):
        for key, value in ui_overlay.items():
            ui_copy[key] = value
    intro_overlay = i18n.get("session_intro")
    base_intro = ui_copy.get("session_intro")
    if isinstance(intro_overlay, dict) and isinstance(base_intro, dict):
        merged_intro = dict(base_intro)
        for key in ("title", "body", "objective", "continue_button"):
            if intro_overlay.get(key):
                merged_intro[key] = intro_overlay[key]
        # rules is a plain string list → replace wholesale.
        if isinstance(intro_overlay.get("rules"), list):
            merged_intro["rules"] = intro_overlay["rules"]
        # cinematic_shots are dicts carrying a language-neutral `image` path, so merge
        # per index (overlay only truthy text fields) — a whole-list replace would drop
        # the base image (the EN overlay has no image → broken opening cut).
        overlay_shots = intro_overlay.get("cinematic_shots")
        base_shots = base_intro.get("cinematic_shots")
        if isinstance(overlay_shots, list) and isinstance(base_shots, list):
            merged_shots: list[Any] = []
            for i, base_shot in enumerate(base_shots):
                shot = dict(base_shot) if isinstance(base_shot, dict) else base_shot
                ov = overlay_shots[i] if i < len(overlay_shots) else None
                if isinstance(shot, dict) and isinstance(ov, dict):
                    for k, v in ov.items():
                        if v:  # skip null/empty so a missing image never clobbers base
                            shot[k] = v
                merged_shots.append(shot)
            merged_intro["cinematic_shots"] = merged_shots
        elif isinstance(overlay_shots, list):
            merged_intro["cinematic_shots"] = overlay_shots
        ui_copy["session_intro"] = merged_intro
    endings_overlay = i18n.get("endings")
    archetypes_overlay = i18n.get("archetypes")
    return _ScenarioProseL10n(
        name=name,
        brief=brief,
        ui_copy=ui_copy,
        endings_overlay=endings_overlay if isinstance(endings_overlay, list) else None,
        archetypes_overlay=archetypes_overlay if isinstance(archetypes_overlay, dict) else {},
    )


def create_app() -> FastAPI:
    app = FastAPI(title="Project MythOS API", version="0.1.0", lifespan=_lifespan)

    # Closed-beta invite gate (no-op unless MYTHOS_INVITE_KEYS is set). Outermost so it
    # guards /api/v1/* (REST + WS) before any handler; /health and static stay open.
    app.add_middleware(InviteGateMiddleware)

    @app.get("/api/v1/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get(f"{API_PREFIX}/scenarios")
    def scenarios(
        player_id: str | None = None,
        lang: str = "ko",
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        # Onboarding data: scenario list + selectable archetypes. ``lang`` selects the
        # additive i18n overlay for player-facing prose (default ko = unchanged).
        items: list[dict[str, Any]] = []
        memories = service.store.list_player_memories(player_id) if player_id else []
        for sid in _SCENARIO_IDS:
            try:
                s = load_scenario(sid)
            except Exception:
                continue
            prose = _localized_scenario_prose(s, lang)
            endings_overlay = prose.endings_overlay
            arche_l10n = prose.archetypes_overlay
            unlocked_archetypes = {DEFAULT_ARCHETYPE}
            if player_id:
                progress = latest_meta_progression(memories, player_id, sid)
                unlocked_archetypes = set(progress.unlocked_archetypes)
            scenario_unlocked = scenario_unlock_met(s.unlock, memories, player_id or "")
            items.append(
                {
                    "id": sid,
                    "name": prose.name,
                    "brief": prose.brief,
                    "ui_copy": prose.ui_copy,
                    "unlocked": scenario_unlocked,
                    "unlock_hint": "" if scenario_unlocked else s.unlock_hint,
                    "archetypes": [
                        {
                            "id": a.get("id"),
                            "name": (arche_l10n.get(str(a.get("id"))) or {}).get("name")
                            or a.get("name"),
                            "attributes": (arche_l10n.get(str(a.get("id"))) or {}).get("attributes")
                            or a.get("attributes", []),
                            "starting_item": (arche_l10n.get(str(a.get("id"))) or {}).get(
                                "starting_item"
                            )
                            or a.get("starting_item"),
                            "stats": a.get("stats", {}),
                            "base_skills": a.get("base_skills", []),
                            "unlock": a.get("unlock"),
                            "unlock_hint": a.get("unlock_hint", ""),
                            "unlocked": not bool(a.get("unlock"))
                            or str(a.get("id")) in unlocked_archetypes,
                        }
                        for a in s.archetypes
                    ],
                    "skills": [
                        {
                            "id": skill_id,
                            "name": skill.get("name", skill_id),
                            "role": skill.get("role", ""),
                            "tags": skill.get("tags", []),
                            "cost": skill.get("cost", {}),
                            "range": skill.get("range"),
                            "cooldown": skill.get("cooldown", 0),
                            "tier": skill.get("tier", 0),
                            "epiphany": skill.get("epiphany"),
                            "unlock_hint": skill.get("unlock_hint", ""),
                        }
                        for skill_id, skill in (
                            s.combat.get("skills", {}) if isinstance(s.combat, dict) else {}
                        ).items()
                        if isinstance(skill, dict)
                    ],
                    "endings": [
                        {
                            "id": e.get("id"),
                            "title": (
                                endings_overlay[i].get("name")
                                if endings_overlay
                                and i < len(endings_overlay)
                                and isinstance(endings_overlay[i], dict)
                                and endings_overlay[i].get("name")
                                else e.get("title")
                            ),
                            "condition": e.get("condition"),
                        }
                        for i, e in enumerate(s.endings)
                    ]
                    if s.endings
                    else [],
                    "characters": [
                        {
                            "name": c.get("name"),
                            "alias": c.get("alias", ""),
                            "role": c.get("role", ""),
                            "keywords": c.get("keywords", []),
                            "portrait": f"/resources/{sid}/{c.get('image')}"
                            if c.get("image")
                            else None,
                        }
                        for c in s.characters
                        if c.get("name") and c.get("image")
                    ],
                    # Combat-simulator metadata: selectable encounters and allies
                    # so the SPA can launch a fight directly from the main screen.
                    "encounters": [
                        {
                            "id": eid,
                            "name": (enc.get("name") if isinstance(enc, dict) else eid) or eid,
                        }
                        for eid, enc in (
                            s.combat.get("encounters", {}) if isinstance(s.combat, dict) else {}
                        ).items()
                    ],
                    "allies": [
                        {
                            "id": aid,
                            "name": (ally.get("name") if isinstance(ally, dict) else aid) or aid,
                        }
                        for aid, ally in (
                            s.combat.get("allies", {}) if isinstance(s.combat, dict) else {}
                        ).items()
                    ],
                }
            )
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
        if loop_cap_exceeded(service, body.player_id):
            raise HTTPException(status_code=429, detail=LOOP_CAP_MESSAGE)
        options = RuntimeOptions(
            scenario_id=body.scenario_id, fallback=body.fallback, language=body.lang
        )
        try:
            snapshot = service.start_loop(body.player_id, options)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc
        return localize_for(snapshot_to_dict(snapshot), body.scenario_id, body.lang)

    @app.get(f"{API_PREFIX}/loops/active")
    def active_loop(
        player_id: str,
        loop_id: str | None = None,
        scenario_id: str = "neo-seoul",
        lang: str = "ko",
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        options = RuntimeOptions(scenario_id=scenario_id, language=lang)
        try:
            if loop_id:
                snapshot = service.resume(loop_id=loop_id, options=options)
            else:
                snapshot = service.resume(player_id=player_id, options=options)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc
        return localize_for(snapshot_to_dict(snapshot), scenario_id, lang)

    @app.get(f"{API_PREFIX}/loops/{{loop_id}}/scenes")
    def list_loop_scenes(
        loop_id: str,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            scenes = service.store.list_scenes(loop_id)
            scenes = sorted(scenes, key=lambda s: s.turn_index)
            # The action taken *in* a scene is the player event that produced the
            # next scene (shared turn_index = scene.turn_index + 1).
            events = service.store.list_events(loop_id)
            action_by_turn = {e.turn_index: e.action for e in events if e.actor == Actor.PLAYER}
            return {
                "scenes": [
                    {
                        "sceneId": s.scene_id,
                        "title": s.title,
                        "text": s.narration,
                        "turnIndex": s.turn_index,
                        "sceneType": s.scene_type,
                        "action": action_by_turn.get(s.turn_index + 1),
                    }
                    for s in scenes
                ]
            }
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @app.post(f"{API_PREFIX}/loops/choose")
    def choose(
        body: ChooseRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        options = RuntimeOptions(
            scenario_id=body.scenario_id, fallback=body.fallback, language=body.lang
        )
        try:
            snapshot = service.choose(
                body.loop_id,
                choice_id=body.choice_id,
                action=body.action,
                options=options,
            )
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc
        return localize_for(snapshot_to_dict(snapshot), body.scenario_id, body.lang)

    @app.post(f"{API_PREFIX}/combat/begin")
    def combat_begin(
        body: CombatBeginRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        options = RuntimeOptions(scenario_id=body.scenario_id, fallback=True, language=body.lang)
        try:
            service.start_combat(
                body.loop_id,
                body.encounter_id,
                options,
                party_members=body.party_members or None,
            )
            resp = combat_state_response(service, body.loop_id, body.scenario_id)
            return localize_for(resp, body.scenario_id, body.lang)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    @app.post(f"{API_PREFIX}/combat/action")
    def combat_action(
        body: CombatActionRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            resp = combat_action_response(service, body.loop_id, body.scenario_id, body.action)
            return localize_for(resp, body.scenario_id, body.lang)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    @app.post(f"{API_PREFIX}/loops/{{loop_id}}/equip")
    def equip_item(
        loop_id: str,
        body: EquipRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            snapshot = service.equip_item(loop_id, body.item_id, body.equipped)
            return snapshot_to_dict(snapshot)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    @app.post(f"{API_PREFIX}/assets/resolve")
    def resolve_asset(
        body: AssetResolveRequest,
        storage: SigningStorageAdapter = Depends(get_storage_adapter),
    ) -> dict[str, Any]:
        # Virtualize the logical s3:// storage_uri into a short-lived presigned
        # HTTPS URL; non-s3 URIs pass through unchanged (design §5.2).
        try:
            url = storage.presigned_url(body.storage_uri, expires_in=body.expires_in)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"url": url, "expires_in": body.expires_in}

    @app.get(f"{API_PREFIX}/memory")
    def get_memory_overview(
        player_id: str,
        lang: str = "ko",
        scenario_id: str = "neo-seoul",
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            overview = service.memory_overview(player_id)
            return localize_for(memory_overview_to_dict(overview), scenario_id, lang)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    @app.get(f"{API_PREFIX}/save-slots")
    def list_save_slots(
        player_id: str,
        lang: str = "ko",
        scenario_id: str = "neo-seoul",
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            slots = service.list_save_slots(player_id)
            return localize_for(
                {"slots": [save_slot_to_dict(slot) for slot in slots]}, scenario_id, lang
            )
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    @app.post(f"{API_PREFIX}/save-slots")
    def save_slot(
        body: ManualSaveRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            slot = service.save_slot(body.loop_id, label=body.label)
            return save_slot_to_dict(slot)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    @app.get(f"{API_PREFIX}/runs")
    def list_runs(
        player_id: str,
        lang: str = "ko",
        scenario_id: str = "neo-seoul",
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            runs = service.list_run_summaries(player_id)
            return localize_for(
                {"runs": [run_summary_to_dict(run) for run in runs]}, scenario_id, lang
            )
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    @app.get(f"{API_PREFIX}/players/{{player_id}}/skills")
    def get_skill_tree(
        player_id: str,
        scenario_id: str = "neo-seoul",
        lang: str = "ko",
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            return localize_for(service.skill_tree(player_id, scenario_id), scenario_id, lang)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    @app.post(f"{API_PREFIX}/players/{{player_id}}/skills/learn")
    def learn_skill(
        player_id: str,
        body: LearnSkillRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            return service.learn_skill(player_id, body.scenario_id, body.skill_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    @app.websocket(f"{API_PREFIX}/loops/stream")
    async def loops_stream(
        websocket: WebSocket,
        service: RuntimeSessionService = Depends(get_service),
        storage: SigningStorageAdapter = Depends(get_storage_adapter),
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
    resources_dir = Path(__file__).resolve().parent.parent.parent / "resources"
    if resources_dir.is_dir():
        app.mount("/resources", StaticFiles(directory=resources_dir), name="resources")

    # Silence the browser's automatic /favicon.ico request — there is no favicon
    # asset, so the catch-all static mount below would 404 it on every page load.
    # Registered before the mount so it takes precedence over the catch-all.
    @app.get("/favicon.ico", include_in_schema=False)
    async def _favicon() -> Response:
        return Response(status_code=204)

    if STATIC_DIR.is_dir():
        app.mount("/", _NoCacheStaticFiles(directory=STATIC_DIR, html=True), name="static")

    return app
