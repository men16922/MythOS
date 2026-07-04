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

from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.concurrency import iterate_in_threadpool, run_in_threadpool
from starlette.responses import Response

from mythos_api.invite import InviteGateMiddleware
from mythos_api.limits import (
    LOOP_CAP_MESSAGE,
    admin_invite_keys,
    loop_cap_exceeded,
    stable_player_id,
)
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
    scene_id: str | None = None
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


class ChooseBoonRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    boon_id: str = Field(min_length=1)
    scenario_id: str = "neo-seoul"
    lang: str = "ko"


class InscribeEchoRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    echo_id: str = Field(min_length=1)
    scenario_id: str = "neo-seoul"
    lang: str = "ko"


class MarketExchangeRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    give: str = Field(min_length=1)
    get: str = Field(min_length=1)
    scenario_id: str = "neo-seoul"
    lang: str = "ko"


class LoadSlotRequest(BaseModel):
    player_id: str = Field(min_length=1)
    slot_id: str = Field(min_length=1)
    scenario_id: str = "neo-seoul"
    lang: str = "ko"


class EquipRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    item_id: str = Field(min_length=1)
    equipped: bool = True
    # "player" (default) or a party member id — companions wear gear too.
    wearer: str | None = None
    lang: str = "ko"


class ManualSaveRequest(BaseModel):
    loop_id: str = Field(min_length=1)
    label: str | None = None


class AssetResolveRequest(BaseModel):
    storage_uri: str = Field(min_length=1)
    expires_in: int = Field(default=600, ge=1, le=86400)


class LearnSkillRequest(BaseModel):
    skill_id: str = Field(min_length=1)
    scenario_id: str = "neo-seoul"
    lang: str = "ko"


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
        image_sync_fallback=True,  # Cloud Run has no Redis worker; fall back to sync Imagen
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
            scene_id=message.get("scene_id"),
            options=options,
        )
    raise KeyError(f"unknown event: {event!r}")


def _find_asset(service: RuntimeSessionService, loop_id: str, asset_id: str) -> AssetRecord | None:
    """Look up one asset by id within a loop (store has only list_assets)."""
    for asset in service.store.list_assets(loop_id):
        if asset.asset_id == asset_id:
            return asset
    return None


def _attach_slot_thumbnails(service: RuntimeSessionService, slots: list[dict[str, Any]]) -> None:
    """Resolve a representative ``thumb_url`` for each save slot, in place. Prefers the
    curated anchor image the player saw (static ``/resources/...`` — free, no signing);
    otherwise signs the slot's generated scene asset. Slots with neither get no thumb
    (the UI shows a placeholder). The signer is built lazily and only when needed."""
    storage: SigningStorageAdapter | None = None
    storage_failed = False
    for slot in slots:
        metadata = slot.get("metadata") if isinstance(slot.get("metadata"), dict) else {}
        curated = (metadata or {}).get("curated_image")
        if curated:
            slot["thumb_url"] = f"/resources/{slot.get('scenario_id', 'neo-seoul')}/{curated}"
            continue
        asset_id, loop_id = slot.get("asset_id"), slot.get("loop_id")
        if not asset_id or not loop_id:
            continue
        asset = _find_asset(service, str(loop_id), str(asset_id))
        if asset is None or asset.status != "succeeded" or not asset.storage_uri:
            continue
        if storage is None and not storage_failed:
            try:
                storage = get_storage_adapter()
            except Exception:
                storage_failed = True
        if storage is not None:
            try:
                slot["thumb_url"] = storage.presigned_url(asset.storage_uri)
            except Exception:
                pass


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
        # Localize the assembled onboarding DATA (archetype/scenario unlock_hints,
        # character name/role/keywords, skill/encounter/ally names) at the serving
        # boundary, the same way snapshot/combat/memory payloads are. The prose fields
        # were already overlaid above; re-localizing them is a no-op (no Korean left).
        items = [localize_for(item, str(item["id"]), lang) for item in items]
        return {"scenarios": items}

    @app.get(f"{API_PREFIX}/auth/verify-invite")
    def verify_invite(request: Request) -> dict[str, bool]:
        """Invite-key probe for the SPA gate screen. This route is under the gated
        ``/api/v1/*`` prefix, so the ``InviteGateMiddleware`` rejects a missing/invalid
        key with 401 before reaching here; a 200 means the key is valid (or gating is
        disabled, so the app is open). Cheap — no DB or service work.

        ``is_admin`` drives operator-only UI (the Dev Console): true ONLY when the
        presented key is an admin key (``MYTHOS_ADMIN_KEYS``). Everyone else — beta
        testers and ungated/keyless local visitors — gets false, so the Dev Console is
        hidden unless you hold an admin key."""
        key = (
            request.headers.get("x-invite-key") or request.query_params.get("invite") or ""
        ).strip()
        is_admin = key != "" and key in admin_invite_keys()
        return {"ok": True, "is_admin": is_admin}

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
        scenario_id: str = "neo-seoul",
        lang: str = "ko",
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            scenes = service.store.list_scenes(loop_id)
            scenes = sorted(scenes, key=lambda s: s.turn_index)
            # The action taken *in* a scene is the player event that produced the
            # next scene (shared turn_index = scene.turn_index + 1).
            events = service.store.list_events(loop_id)
            action_by_turn = {e.turn_index: e.action for e in events if e.actor == Actor.PLAYER}
            resp = {
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
            # Localize code-generated titles/actions (combat "교전 R…", etc.) at the
            # serving boundary like every other endpoint. Prefer the loop's own
            # scenario over the query default. Free-form LLM narration stays as
            # generated (already EN for EN loops; legacy KO prose isn't glossary-
            # translatable after the fact).
            loop = service.store.get_loop(loop_id)
            resolved_scenario = (
                str(loop.state.get("scenario_id"))
                if loop is not None
                and isinstance(loop.state, dict)
                and loop.state.get("scenario_id")
                else scenario_id
            )
            return localize_for(resp, resolved_scenario, lang)
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
                scene_id=body.scene_id,
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

    @app.post(f"{API_PREFIX}/boons/choose")
    def choose_boon(
        body: ChooseBoonRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        options = RuntimeOptions(scenario_id=body.scenario_id, language=body.lang)
        try:
            snapshot = service.choose_boon(body.loop_id, body.boon_id, options)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc
        return localize_for(snapshot_to_dict(snapshot), body.scenario_id, body.lang)

    @app.post(f"{API_PREFIX}/echoes/inscribe")
    def inscribe_echo(
        body: InscribeEchoRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        options = RuntimeOptions(scenario_id=body.scenario_id, language=body.lang)
        try:
            snapshot = service.inscribe_echo(body.loop_id, body.echo_id, options)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc
        return localize_for(snapshot_to_dict(snapshot), body.scenario_id, body.lang)

    @app.post(f"{API_PREFIX}/market/exchange")
    def market_exchange(
        body: MarketExchangeRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        options = RuntimeOptions(scenario_id=body.scenario_id, language=body.lang)
        try:
            snapshot = service.exchange_material(body.loop_id, body.give, body.get, options)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc
        return localize_for(snapshot_to_dict(snapshot), body.scenario_id, body.lang)

    @app.post(f"{API_PREFIX}/loops/{{loop_id}}/equip")
    def equip_item(
        loop_id: str,
        body: EquipRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            snapshot = service.equip_item(
                loop_id, body.item_id, body.equipped, wearer=body.wearer
            )
            # This was the one snapshot endpoint returning raw KO server strings
            # (axis_label/result_preview/stakes) — an equip toggle then swapped an
            # EN session's whole snapshot to Korean (live 2026-07-04).
            scenario_id = str(
                snapshot.loop.state.get("scenario_id") or "neo-seoul"
                if isinstance(snapshot.loop.state, dict)
                else "neo-seoul"
            )
            return localize_for(snapshot_to_dict(snapshot), scenario_id, body.lang)
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
            return localize_for(memory_overview_to_dict(overview, language=lang), scenario_id, lang)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    @app.get(f"{API_PREFIX}/save-slots")
    def list_save_slots(
        player_id: str,
        lang: str = "ko",
        scenario_id: str = "neo-seoul",
        limit: int = 60,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        try:
            slots = service.list_save_slots(player_id, limit=max(1, min(limit, 200)))
            payload = localize_for(
                {"slots": [save_slot_to_dict(slot) for slot in slots]}, scenario_id, lang
            )
            _attach_slot_thumbnails(service, payload["slots"])
            return payload
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

    @app.post(f"{API_PREFIX}/save-slots/load")
    def load_save_slot(
        body: LoadSlotRequest,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        options = RuntimeOptions(scenario_id=body.scenario_id, language=body.lang)
        try:
            snapshot = service.load_save_slot(body.player_id, body.slot_id, options)
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc
        return localize_for(snapshot_to_dict(snapshot), body.scenario_id, body.lang)

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
            # Localize the user-facing error so EN players don't get a raw Korean
            # toast (glossary/phrase-backed at the serving boundary).
            raise HTTPException(
                status_code=400,
                detail=localize_for(str(exc), body.scenario_id, body.lang),
            ) from exc
        except RuntimeError as exc:
            raise _as_http_error(exc) from exc

    # --- Admin endpoints (admin-key gated) ------------------------------------

    _ADMIN_DASHBOARD_HTML = (Path(__file__).parent / "admin_dashboard.html").read_text()

    @app.get("/admin/dashboard", include_in_schema=False)
    def admin_dashboard_page(request: Request) -> Response:
        """Serve the standalone admin tester dashboard page. The page itself
        checks the invite key via the API call; we serve it unconditionally
        (the API endpoint returns 403 for non-admins)."""
        from starlette.responses import HTMLResponse
        return HTMLResponse(_ADMIN_DASHBOARD_HTML)

    @app.get(f"{API_PREFIX}/admin/tester-status")
    def admin_tester_status(
        request: Request,
        service: RuntimeSessionService = Depends(get_service),
    ) -> dict[str, Any]:
        """Per-invite-key player dashboard data. Admin-only (returns 403 for
        non-admin keys). Returns detailed status for every configured tester key."""
        key = (
            request.headers.get("x-invite-key")
            or request.query_params.get("invite")
            or ""
        ).strip()
        if key not in admin_invite_keys():
            raise HTTPException(status_code=403, detail="admin only")

        import os

        raw_keys = os.getenv("MYTHOS_INVITE_KEYS", "")
        admin_keys_set = admin_invite_keys()
        all_keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
        # Exclude admin keys from the tester list
        tester_keys = [k for k in all_keys if k not in admin_keys_set]

        testers: list[dict[str, Any]] = []
        for tkey in tester_keys:
            pid = stable_player_id(tkey)
            player = service.store.get_player(pid)

            # Player hasn't used this key yet
            if not player:
                testers.append({
                    "invite_key": tkey,
                    "player_id": pid,
                    "registered": False,
                    "display_name": None,
                    "archetype": None,
                    "created_at": None,
                    "last_activity": None,
                    "total_loops": 0,
                    "active_loops": 0,
                    "ended_loops": 0,
                    "max_turn": 0,
                    "active_loop": None,
                    "combats_won": 0,
                    "combats_lost": 0,
                    "endings_reached": [],
                    "allies_met": [],
                    "total_runs_completed": 0,
                })
                continue

            loops = service.store.list_loops(pid)

            # Categorize loops
            active_loops = [lp for lp in loops if lp.phase.value not in ("archive", "ended")]
            ended_loops = [lp for lp in loops if lp.phase.value in ("archive", "ended")]

            # Run summaries for completed loops
            try:
                run_summaries = service.list_run_summaries(pid, limit=50)
            except Exception:
                run_summaries = []

            # Last activity: most recent loop's started_at or ended_at
            last_activity = None
            if loops:
                dates = [lp.started_at for lp in loops]
                dates += [lp.ended_at for lp in loops if lp.ended_at]
                last_activity = max(dates).isoformat() if dates else None

            # Most progressed loop
            max_turn = 0
            for lp in loops:
                turn = lp.state.get("turn_index", 0) if lp.state else 0
                if turn > max_turn:
                    max_turn = turn

            # Aggregate combat stats from run summaries
            total_combats_won = sum(r.combats_won for r in run_summaries)
            total_combats_lost = sum(r.combats_lost for r in run_summaries)
            endings_reached = [
                {"ending_id": r.ending_id, "ending_label": r.ending_label, "turns": r.turns}
                for r in run_summaries
                if r.ending_id
            ]

            # Allies met across all runs
            all_allies = set()
            for r in run_summaries:
                all_allies.update(r.allies_met)

            # Active loop detail
            active_detail = None
            if active_loops:
                al = active_loops[0]
                active_detail = {
                    "loop_id": al.loop_id,
                    "phase": al.phase.value,
                    "stability": al.stability,
                    "tension": al.tension,
                    "location": al.location_id,
                    "turn_index": al.state.get("turn_index", 0) if al.state else 0,
                    "started_at": al.started_at.isoformat(),
                }

            testers.append({
                "invite_key": tkey,
                "player_id": pid,
                "registered": player is not None,
                "display_name": player.display_name if player else None,
                "archetype": (player.traits or {}).get("archetype") if player else None,
                "created_at": player.created_at.isoformat() if player and player.created_at else None,
                "last_activity": last_activity,
                "total_loops": len(loops),
                "active_loops": len(active_loops),
                "ended_loops": len(ended_loops),
                "max_turn": max_turn,
                "active_loop": active_detail,
                "combats_won": total_combats_won,
                "combats_lost": total_combats_lost,
                "endings_reached": endings_reached,
                "allies_met": sorted(all_allies),
                "total_runs_completed": len(run_summaries),
            })

        return {"testers": testers, "total_keys": len(tester_keys)}

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
