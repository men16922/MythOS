"""``/api/v2`` — Mythos 2.0 saves + AI GM (FastAPI ``APIRouter``).

Mounted by ``mythos_api.app.create_app`` via ``app.include_router(create_v2_router())``.

Identity: ``X-Player-Id`` header (client-generated uuid, or ``player_<cyrb53>``
derived from the invite key exactly like the classic SPA). Access: when
``MYTHOS_INVITE_KEYS`` is set, every route except ``/health`` requires a valid
``X-Invite-Key`` header or ``?invite=`` param — the same rule
``mythos_api.invite.InviteGateMiddleware`` applies to ``/api/v1``.

Routes
  GET  /health                     open; store kind + GM backend
  GET/PUT /profile                 MetaProfile JSON blob
  GET/PUT/DELETE /run              RunState JSON blob
  POST /history, GET /history      finished-run records (RunRecord)
  POST /gm/narrate                 {kind, lang, context} → {text, source}
  POST /gm/improvise               {lang, event, action, stats, act} → Improvisation + source

The GM never blocks the game: every LLM call has a hard wall-clock timeout, a
global concurrency cap and a per-player rate budget; any miss serves the
deterministic authored fallback with HTTP 200 (``source: "fallback"``).

Env: MYTHOS_V2_STORE (auto|postgres|memory), MYTHOS_V2_MAX_BLOB_BYTES (524288),
MYTHOS_V2_NARRATE_TIMEOUT (10), MYTHOS_V2_IMPROVISE_TIMEOUT (12),
MYTHOS_V2_GM_PER_MINUTE (20), MYTHOS_V2_GM_PER_DAY (400),
MYTHOS_V2_WRITES_PER_MINUTE (120), MYTHOS_V2_GM_CONCURRENCY (4), MYTHOS_V2_GM (on|off).
"""

# No ``from __future__ import annotations`` here: the route signatures use a
# closure-local ``Annotated`` alias that FastAPI must evaluate eagerly.
import asyncio
import concurrent.futures
import json
import os
import re
import threading
import time
import uuid
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Annotated, Any, Literal, TypeVar

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from mythos_runtime.observability import get_logger

from . import gm
from .llm import TextLLM, build_text_llm
from .ratelimit import RateLimiter
from .store import (
    HistoryConflictError,
    Slot,
    StoreHolder,
    StoreUnavailableError,
    V2Store,
)

API_V2_PREFIX = "/api/v2"
PLAYER_ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
RECORD_ID_RE = re.compile(r"^[A-Za-z0-9_.:-]{1,80}$")

_logger = get_logger("mythos.v2")
T = TypeVar("T")


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, "") or default)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, "") or default)
    except ValueError:
        return default


@dataclass(frozen=True)
class V2Settings:
    max_blob_bytes: int = 512 * 1024
    max_history_bytes: int = 64 * 1024
    max_gm_body_bytes: int = 16 * 1024
    max_context_bytes: int = 8 * 1024
    narrate_timeout: float = 10.0
    improvise_timeout: float = 12.0
    gm_per_minute: int = 20
    gm_per_day: int = 400
    writes_per_minute: int = 120
    gm_concurrency: int = 4

    @classmethod
    def from_env(cls) -> "V2Settings":
        return cls(
            max_blob_bytes=_env_int("MYTHOS_V2_MAX_BLOB_BYTES", 512 * 1024),
            narrate_timeout=_env_float("MYTHOS_V2_NARRATE_TIMEOUT", 10.0),
            improvise_timeout=_env_float("MYTHOS_V2_IMPROVISE_TIMEOUT", 12.0),
            gm_per_minute=_env_int("MYTHOS_V2_GM_PER_MINUTE", 20),
            gm_per_day=_env_int("MYTHOS_V2_GM_PER_DAY", 400),
            writes_per_minute=_env_int("MYTHOS_V2_WRITES_PER_MINUTE", 120),
            gm_concurrency=max(1, _env_int("MYTHOS_V2_GM_CONCURRENCY", 4)),
        )


# --- request models -----------------------------------------------------------


class NarrateBody(BaseModel):
    kind: Literal["event", "ix_loop_start", "chronicle", "boss", "bond", "act_intro"]
    lang: Literal["ko", "en"] = "ko"
    context: dict[str, Any] = Field(default_factory=dict)


class ImproviseEvent(BaseModel):
    title: str = Field(default="", max_length=400)
    text: str = Field(default="", max_length=4000)
    options: list[str] = Field(default_factory=list, max_length=8)


class ImproviseBody(BaseModel):
    lang: Literal["ko", "en"] = "ko"
    event: ImproviseEvent = Field(default_factory=ImproviseEvent)
    action: str = Field(default="", max_length=2000)
    stats: dict[str, Any] = Field(default_factory=dict)
    act: int = 1


# --- GM runner -----------------------------------------------------------------


class _NoLLMError(RuntimeError):
    pass


class _BusyError(RuntimeError):
    pass


class _GMRunner:
    """Lazily-built LLM + global concurrency cap + hard wall-clock timeout."""

    def __init__(self, factory: Callable[[], TextLLM | None], concurrency: int) -> None:
        self._factory = factory
        self._llm: TextLLM | None = None
        self._built = False
        self._lock = threading.Lock()
        self._slots = threading.BoundedSemaphore(concurrency)
        # Own pool (not the loop's default executor): a hung provider call never
        # occupies shared threads, and loop shutdown never waits on it.
        self._executor = concurrent.futures.ThreadPoolExecutor(
            max_workers=concurrency * 2, thread_name_prefix="v2-gm"
        )

    def llm(self) -> TextLLM | None:
        if not self._built:
            with self._lock:
                if not self._built:
                    try:
                        self._llm = self._factory()
                    except Exception:
                        _logger.warning("v2 gm: LLM backend unavailable", exc_info=True)
                        self._llm = None
                    self._built = True
        return self._llm

    @property
    def name(self) -> str:
        llm = self.llm()
        return llm.name if llm is not None else "off"

    async def complete(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int,
        temperature: float,
        timeout: float,
        json_schema: dict[str, Any] | None = None,
    ) -> str:
        llm = self.llm()
        if llm is None:
            raise _NoLLMError

        def _run() -> str:
            if not self._slots.acquire(timeout=1.0):
                raise _BusyError
            try:
                return llm.complete(
                    system,
                    user,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    timeout=timeout,
                    json_schema=json_schema,
                )
            finally:
                self._slots.release()

        loop = asyncio.get_running_loop()
        return await asyncio.wait_for(loop.run_in_executor(self._executor, _run), timeout=timeout)

    def close(self) -> None:
        self._executor.shutdown(wait=False, cancel_futures=True)


def _outcome_for(exc: BaseException) -> str:
    if isinstance(exc, _NoLLMError):
        return "disabled"
    if isinstance(exc, _BusyError):
        return "busy"
    if isinstance(exc, TimeoutError) or "timeout" in type(exc).__name__.lower():
        return "timeout"
    return "error"


def _default_invite_keys() -> set[str]:
    # Lazy: mythos_api.app imports this module, so a module-level import would cycle.
    from mythos_api.invite import allowed_invite_keys

    return allowed_invite_keys()


def _norm_stats(raw: dict[str, Any]) -> dict[str, int]:
    out: dict[str, int] = {}
    for key in gm.STATS:
        value = raw.get(key)
        number = value if isinstance(value, int | float) and not isinstance(value, bool) else 5
        out[key] = max(0, min(20, int(number)))
    return out


# --- router factory --------------------------------------------------------------


def create_v2_router(
    *,
    store_factory: Callable[[], V2Store] | None = None,
    llm_factory: Callable[[], TextLLM | None] | None = None,
    settings: V2Settings | None = None,
    invite_keys: Callable[[], set[str]] | None = None,
) -> APIRouter:
    """Build the ``/api/v2`` router. Defaults read the environment; tests inject
    ``store_factory=MemoryV2Store`` and a fake ``llm_factory``."""
    cfg = settings or V2Settings.from_env()
    holder = StoreHolder(store_factory)
    runner = _GMRunner(llm_factory or build_text_llm, cfg.gm_concurrency)
    gm_limiter = RateLimiter(cfg.gm_per_minute, cfg.gm_per_day)
    write_limiter = RateLimiter(cfg.writes_per_minute)
    keys_of = invite_keys or _default_invite_keys

    @asynccontextmanager
    async def _lifespan(_app: Any) -> AsyncIterator[None]:
        yield
        runner.close()
        await run_in_threadpool(holder.close)

    router = APIRouter(prefix=API_V2_PREFIX, tags=["v2"], lifespan=_lifespan)

    def require_player(
        request: Request,
        x_player_id: Annotated[str | None, Header()] = None,
    ) -> str:
        keys = keys_of()
        if keys:
            key = (
                request.headers.get("x-invite-key") or request.query_params.get("invite") or ""
            ).strip()
            if key not in keys:
                raise HTTPException(status_code=401, detail="invalid or missing invite key")
        player_id = (x_player_id or "").strip()
        if not PLAYER_ID_RE.fullmatch(player_id):
            raise HTTPException(status_code=400, detail="missing or invalid X-Player-Id")
        return player_id

    def limit_gm_body(request: Request) -> None:
        declared = request.headers.get("content-length", "")
        if declared.isdigit() and int(declared) > cfg.max_gm_body_bytes:
            raise HTTPException(status_code=413, detail="request too large")

    player_dep = Annotated[str, Depends(require_player)]

    async def store_call(fn: Callable[[V2Store], T]) -> T:
        def _run() -> T:
            return fn(holder.get())

        try:
            return await run_in_threadpool(_run)
        except StoreUnavailableError as exc:
            _logger.warning("v2 store unavailable: %s", exc)
            raise HTTPException(status_code=503, detail="save store unavailable") from exc

    async def read_json_object(request: Request, limit: int) -> dict[str, Any]:
        declared = request.headers.get("content-length", "")
        if declared.isdigit() and int(declared) > limit:
            raise HTTPException(status_code=413, detail=f"payload exceeds {limit} bytes")
        chunks: list[bytes] = []
        total = 0
        async for chunk in request.stream():
            total += len(chunk)
            if total > limit:
                raise HTTPException(status_code=413, detail=f"payload exceeds {limit} bytes")
            chunks.append(chunk)
        try:
            data = json.loads(b"".join(chunks) or b"null")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="body must be JSON") from exc
        if not isinstance(data, dict):
            raise HTTPException(status_code=400, detail="body must be a JSON object")
        return data

    def check_write_rate(player_id: str) -> None:
        if not write_limiter.allow(player_id):
            raise HTTPException(status_code=429, detail="too many writes")

    # --- health ------------------------------------------------------------------

    @router.get("/health")
    async def v2_health() -> dict[str, Any]:
        try:
            kind = await run_in_threadpool(lambda: holder.get().kind)
        except Exception:
            kind = "unavailable"
        return {"status": "ok", "store": kind, "gm": runner.name}

    # --- saves -------------------------------------------------------------------

    async def get_slot(player_id: str, slot: Slot) -> dict[str, Any]:
        blob = await store_call(lambda s: s.get_save(player_id, slot))
        if blob is None:
            return {"data": None, "updated_at": None}
        return {"data": blob.data, "updated_at": blob.updated_at.isoformat()}

    async def put_slot(request: Request, player_id: str, slot: Slot) -> dict[str, Any]:
        data = await read_json_object(request, cfg.max_blob_bytes)
        check_write_rate(player_id)
        updated = await store_call(lambda s: s.put_save(player_id, slot, data))
        return {"ok": True, "updated_at": updated.isoformat()}

    @router.get("/profile")
    async def v2_get_profile(player_id: player_dep) -> dict[str, Any]:
        return await get_slot(player_id, "profile")

    @router.put("/profile")
    async def v2_put_profile(request: Request, player_id: player_dep) -> dict[str, Any]:
        return await put_slot(request, player_id, "profile")

    @router.get("/run")
    async def v2_get_run(player_id: player_dep) -> dict[str, Any]:
        return await get_slot(player_id, "run")

    @router.put("/run")
    async def v2_put_run(request: Request, player_id: player_dep) -> dict[str, Any]:
        return await put_slot(request, player_id, "run")

    @router.delete("/run")
    async def v2_delete_run(player_id: player_dep) -> dict[str, Any]:
        check_write_rate(player_id)
        deleted = await store_call(lambda s: s.delete_save(player_id, "run"))
        return {"ok": True, "deleted": deleted}

    @router.post("/history")
    async def v2_post_history(request: Request, player_id: player_dep) -> dict[str, Any]:
        data = await read_json_object(request, cfg.max_history_bytes)
        record_id = data.get("id")
        if not isinstance(record_id, str) or not RECORD_ID_RE.fullmatch(record_id):
            record_id = f"run_{uuid.uuid4().hex}"
            data = {**data, "id": record_id}
        check_write_rate(player_id)
        rid: str = record_id
        try:
            await store_call(lambda s: s.append_history(player_id, rid, data))
        except HistoryConflictError as exc:
            raise HTTPException(status_code=409, detail="record id already used") from exc
        return {"ok": True, "id": rid}

    @router.get("/history")
    async def v2_get_history(
        player_id: player_dep, limit: Annotated[int, Query(ge=1, le=100)] = 30
    ) -> dict[str, Any]:
        records = await store_call(lambda s: s.list_history(player_id, limit))
        return {"records": records}

    # --- AI GM -------------------------------------------------------------------

    def log_gm(route: str, player_id: str, outcome: str, started: float, **extra: Any) -> None:
        _logger.info(
            "v2 gm %s",
            route,
            extra={
                "player_id": player_id,
                "outcome": outcome,
                "provider": runner.name,
                "latency_ms": round((time.perf_counter() - started) * 1000),
                **extra,
            },
        )

    @router.post("/gm/narrate", dependencies=[Depends(limit_gm_body)])
    async def v2_gm_narrate(body: NarrateBody, player_id: player_dep) -> dict[str, Any]:
        if len(json.dumps(body.context, default=str)) > cfg.max_context_bytes:
            raise HTTPException(status_code=413, detail="context too large")
        started = time.perf_counter()
        context = gm.sanitize_context(body.context)
        text: str | None = None
        if not gm_limiter.allow(player_id):
            outcome = "rate_limited"
        else:
            system, user = gm.narrate_messages(body.kind, body.lang, context)
            limits = gm.narrate_limits(body.kind, body.lang)
            try:
                raw = await runner.complete(
                    system,
                    user,
                    max_tokens=limits.max_tokens,
                    temperature=0.8,
                    timeout=cfg.narrate_timeout,
                )
                text = gm.clean_narration(raw, body.kind, body.lang)
                outcome = "llm" if text else "rejected"
            except Exception as exc:
                outcome = _outcome_for(exc)
                if outcome == "error":
                    _logger.warning("v2 gm narrate failed: %s", type(exc).__name__)
        source = "llm"
        if text is None:
            text = gm.fallback_narration(body.kind, body.lang, context)
            source = "fallback"
        log_gm("narrate", player_id, outcome, started, status=body.kind)
        return {"text": text, "source": source}

    @router.post("/gm/improvise", dependencies=[Depends(limit_gm_body)])
    async def v2_gm_improvise(body: ImproviseBody, player_id: player_dep) -> dict[str, Any]:
        started = time.perf_counter()
        action = gm.normalize_action(body.action)
        cls = gm.classify_action(action)
        verdict: gm.Adjudication | None = None
        if cls.abusive:
            outcome = "rejected_input"
        elif not gm_limiter.allow(player_id):
            outcome = "rate_limited"
        else:
            system, user = gm.improvise_messages(
                lang=body.lang,
                title=body.event.title,
                text=body.event.text,
                options=body.event.options,
                action=action,
                stats=_norm_stats(body.stats),
                act=max(1, min(3, body.act)),
            )
            try:
                raw = await runner.complete(
                    system,
                    user,
                    max_tokens=600,
                    temperature=0.4,
                    timeout=cfg.improvise_timeout,
                    json_schema=gm.IMPROVISE_JSON_SCHEMA,
                )
                verdict = gm.adjudicate_llm_output(raw, action, body.lang, cls)
                outcome = "llm" if verdict else "rejected"
            except Exception as exc:
                outcome = _outcome_for(exc)
                if outcome == "error":
                    _logger.warning("v2 gm improvise failed: %s", type(exc).__name__)
        if verdict is None:
            verdict = gm.fallback_improvisation(action, cls)
        log_gm("improvise", player_id, outcome, started)
        return verdict.to_dict()

    return router


__all__ = ["API_V2_PREFIX", "PLAYER_ID_RE", "V2Settings", "create_v2_router"]
