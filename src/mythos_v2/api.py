"""``/api/v2`` — Mythos 2.0 saves, AI GM and the daily-seed leaderboard (FastAPI ``APIRouter``).

Mounted by ``mythos_api.app.create_app`` via ``app.include_router(create_v2_router())``.

Identity (``mythos_v2.auth``; mode from ``MYTHOS_AUTH``, default ``open``):
  * ``Authorization: Bearer <Firebase ID token>`` (Google sign-in) → player ``g_<sha256(uid)[:32]>``.
    A token always wins over ``X-Player-Id``; a token that fails verification is a 401 in both modes.
  * mode ``open`` without a token: the ``X-Player-Id`` header (client-generated id; the ``g_`` prefix is
    reserved for signed-in players).
  * mode ``google``: saves, GM and leaderboard writes need a valid token, else 401
    ``{"detail": "sign-in required"}``.
  * contest demo (off unless ``MYTHOS_DEMO_CODES`` is set): a signed-out ``X-Player-Id`` plus a listed
    ``X-Demo-Code`` may call ``/gm/*`` and ``/plan`` as ``demo_<sha256(code|id)[:24]>`` (free allowance;
    never saves, daily writes or purchases).

Routes
  GET  /health                     public; store kind + GM backend
  GET  /config                     public; {auth, firebase web config | null, leaderboard}
  GET/PUT /profile                 MetaProfile JSON blob
  GET/PUT/DELETE /run              RunState JSON blob
  POST /history, GET /history      finished-run records (RunRecord)
  DELETE /account                  erase the player's saves, history and daily rows (+ the Firebase sign-in
                                   record when signed in) → {ok, removed, sign_in_record_deleted}
  GET  /plan                       tier (free|plus), features, AI budget meter, subscription (Signal+)
  POST /plan/play                  {purchaseToken} → verify a Google Play Signal+ purchase → plan
  POST /gm/narrate                 {kind, lang, context} → {text, source}
  POST /gm/improvise               {lang, event, action, stats, act} → Improvisation + source
  POST /gm/talk                    {mode: companion|ix|enemy|npc, lang, …} → {text, source} (+ intent for npc)
  POST /gm/report                  {route, kind, lang, text} → {ok}: flag an offensive AI line (no player id kept)
  PUT  /daily/{date}               {name, result, replay?} → {rank, total, best, improved, verified}  (identity
                                   required; ``replay`` is re-run by ``mythos_v2.replay`` → verified true/false/null)
  GET  /daily/{date}?archetype=&limit=   public board; ``me`` when the caller is identified
  GET  /admin/overview?days=       operator dashboard data (the ``/admin`` page); admin Google accounts only

The GM never blocks the game: every LLM call has a hard wall-clock timeout, a
global concurrency cap and a per-player rate budget; any miss serves the
deterministic authored fallback with HTTP 200 (``source: "fallback"``).

Env: MYTHOS_V2_STORE (auto|postgres|memory), MYTHOS_V2_MAX_BLOB_BYTES (524288),
MYTHOS_V2_NARRATE_TIMEOUT (14), MYTHOS_V2_IMPROVISE_TIMEOUT (12),
MYTHOS_V2_TALK_TIMEOUT (10), MYTHOS_V2_IX_TIMEOUT (4),
MYTHOS_V2_GM_PER_MINUTE (20), MYTHOS_V2_GM_PER_DAY (400),
MYTHOS_V2_WRITES_PER_MINUTE (120), MYTHOS_V2_DAILY_PER_MINUTE (10), MYTHOS_V2_GM_CONCURRENCY (4),
MYTHOS_V2_GM (on|off), MYTHOS_AUTH (open|google), MYTHOS_FIREBASE_PROJECT, MYTHOS_FIREBASE_WEB_CONFIG,
MYTHOS_DEMO_CODES.
"""

# No ``from __future__ import annotations`` here: the route signatures use a
# closure-local ``Annotated`` alias that FastAPI must evaluate eagerly.
import asyncio
import concurrent.futures
import contextvars
import hmac
import json
import os
import re
import threading
import time
import uuid
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from datetime import time as dtime
from typing import Annotated, Any, Literal, TypeVar

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt
from starlette.concurrency import run_in_threadpool

from mythos_v2.log import get_logger

from . import admin, daily, gm, npc, replay, talk, taunt
from .auth import (
    DEMO_PLAYER_PREFIX,
    GOOGLE_PLAYER_PREFIX,
    AccountDeleter,
    AuthConfig,
    CertsUnavailableError,
    Identity,
    TokenError,
    TokenVerifier,
    bearer_token,
    build_account_deleter,
    build_verifier,
    demo_player_id,
    player_id_for_uid,
)
from .billing import (
    BillingConfig,
    BillingError,
    Entitlement,
    GooglePlayVerifier,
    Plans,
    PurchaseVerifier,
)
from .budget import Budget, BudgetConfig, Tier
from .llm import TextLLM, Usage, build_text_llm, set_usage_sink, take_last_usage
from .npc import MAX_OPTIONS as NPC_MAX_OPTIONS
from .ratelimit import RateLimiter
from .store import (
    Slot,
    StoreHolder,
    StoreUnavailableError,
    V2Store,
)

API_V2_PREFIX = "/api/v2"
#: Any identity: client ids from ``X-Player-Id`` and the ``g_<32 hex>`` ids of signed-in players.
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


def _env_price() -> tuple[float, float] | None:
    """``MYTHOS_GM_PRICE_IN_PER_M`` / ``MYTHOS_GM_PRICE_OUT_PER_M`` (USD per million tokens), both or neither."""
    try:
        price_in = float(os.getenv("MYTHOS_GM_PRICE_IN_PER_M", ""))
        price_out = float(os.getenv("MYTHOS_GM_PRICE_OUT_PER_M", ""))
    except ValueError:
        return None
    return (price_in, price_out) if price_in >= 0 and price_out >= 0 else None


@dataclass(frozen=True)
class V2Settings:
    max_blob_bytes: int = 512 * 1024
    max_history_bytes: int = 64 * 1024
    max_gm_body_bytes: int = 16 * 1024
    max_context_bytes: int = 8 * 1024
    narrate_timeout: float = 14.0
    improvise_timeout: float = 12.0
    talk_timeout: float = 10.0
    ix_timeout: float = 5.5
    gm_per_minute: int = 20
    gm_per_day: int = 400
    writes_per_minute: int = 120
    daily_per_minute: int = 10
    admin_per_minute: int = 30
    reports_per_minute: int = 10
    gm_concurrency: int = 4
    #: USD per million (prompt, output) tokens for the dashboard's cost estimate; None = show tokens only.
    gm_price: tuple[float, float] | None = None

    @classmethod
    def from_env(cls) -> "V2Settings":
        return cls(
            max_blob_bytes=_env_int("MYTHOS_V2_MAX_BLOB_BYTES", 512 * 1024),
            narrate_timeout=_env_float("MYTHOS_V2_NARRATE_TIMEOUT", 14.0),
            improvise_timeout=_env_float("MYTHOS_V2_IMPROVISE_TIMEOUT", 12.0),
            talk_timeout=_env_float("MYTHOS_V2_TALK_TIMEOUT", 10.0),
            ix_timeout=_env_float("MYTHOS_V2_IX_TIMEOUT", 5.5),
            gm_per_minute=_env_int("MYTHOS_V2_GM_PER_MINUTE", 20),
            gm_per_day=_env_int("MYTHOS_V2_GM_PER_DAY", 400),
            writes_per_minute=_env_int("MYTHOS_V2_WRITES_PER_MINUTE", 120),
            daily_per_minute=_env_int("MYTHOS_V2_DAILY_PER_MINUTE", 10),
            admin_per_minute=_env_int("MYTHOS_V2_ADMIN_PER_MINUTE", 30),
            reports_per_minute=_env_int("MYTHOS_V2_REPORTS_PER_MINUTE", 10),
            gm_concurrency=max(1, _env_int("MYTHOS_V2_GM_CONCURRENCY", 4)),
            gm_price=_env_price(),
        )


# --- request models -----------------------------------------------------------


class NarrateBody(BaseModel):
    kind: Literal["event", "ix_loop_start", "chronicle", "boss", "bond", "act_intro", "echo"]
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


class TalkTurn(BaseModel):
    role: Literal["player", "companion"]
    text: str = Field(default="", max_length=talk.MAX_TURN_CHARS)


class TalkBody(BaseModel):
    """Companion chat (``companion`` + ``message`` + ``history``), an IX comms line (``trigger``), an enemy
    taunt (``enemy`` + ``moment``) or a Signal+ NPC line (``npc`` + ``message`` + ``history`` + ``options``).
    ``context`` carries the content-side facts (see ``mythos_v2.talk`` / ``mythos_v2.npc``)."""

    mode: Literal["companion", "ix", "enemy", "npc"]
    lang: Literal["ko", "en"] = "ko"
    companion: str = Field(default="", max_length=32)
    message: str = Field(default="", max_length=talk.MAX_MESSAGE_CHARS)
    history: list[TalkTurn] = Field(default_factory=list, max_length=talk.MAX_HISTORY_TURNS)
    trigger: talk.IxTrigger | None = None
    enemy: str = Field(default="", max_length=32)
    moment: taunt.TauntTrigger | None = None
    npc: str = Field(default="", max_length=32)
    #: The intents open at the NPC's current node: [{intent, label}] (``mythos_v2.npc.open_intents``).
    options: list[dict[str, Any]] = Field(default_factory=list, max_length=NPC_MAX_OPTIONS)
    context: dict[str, Any] = Field(default_factory=dict)


class DailyResultBody(BaseModel):
    """``engine/types.ts`` ``DailyResult`` — client-reported; these ranges are the only plausibility check.
    Strict types: no bool-as-int, no numeric strings. Unknown keys are ignored."""

    model_config = ConfigDict(extra="ignore")

    archetype: str = Field(pattern=daily.ARCHETYPE_PATTERN)
    won: StrictBool
    act: StrictInt = Field(ge=1, le=3)
    floors: StrictInt = Field(ge=0, le=80)
    echoes: StrictInt = Field(ge=0, le=999)
    kills: StrictInt = Field(ge=0, le=999)
    secs: StrictInt | None = Field(default=None, ge=1, le=86_400)

    def to_result(self) -> daily.DailyResult:
        return daily.DailyResult(
            archetype=self.archetype,
            won=self.won,
            act=self.act,
            floors=self.floors,
            echoes=self.echoes,
            kills=self.kills,
            secs=self.secs,
        )


class ReportBody(BaseModel):
    """A player flags an AI line as offensive. Only the line itself is kept, never who sent it."""

    model_config = ConfigDict(extra="ignore")

    route: Literal["narrate", "improvise", "talk"]
    kind: str = Field(pattern=r"^[a-z][a-z0-9_:-]{0,39}$")
    lang: Literal["ko", "en"]
    text: str = Field(min_length=1, max_length=2000)


class PlayPurchaseBody(BaseModel):
    purchase_token: str = Field(
        alias="purchaseToken", min_length=10, max_length=512, pattern=r"^[A-Za-z0-9._:-]+$"
    )


class DailySubmitBody(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    result: DailyResultBody
    #: The run's recorded actions (client ``ui/replay/record.ts``); re-run server-side to mark the result verified.
    replay: dict[str, Any] | None = None


# --- GM runner -----------------------------------------------------------------


#: Billed tokens of the LLM call made by the current request (set by ``_GMRunner.complete`` in the handler's own
#: task, read and cleared by ``log_gm``). Late completions after a timeout charge directly via ``on_late_usage``.
_CALL_USAGE: contextvars.ContextVar[Usage | None] = contextvars.ContextVar(
    "mythos_v2_gm_call_usage", default=None
)
_CALL_PLAYER: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "mythos_v2_gm_call_player", default=None
)


class _NoLLMError(RuntimeError):
    pass


class _BusyError(RuntimeError):
    pass


class _GMRunner:
    """Lazily-built LLM + global concurrency cap + hard wall-clock timeout."""

    def __init__(
        self,
        factory: Callable[[], TextLLM | None],
        concurrency: int,
        on_late_usage: Callable[[str, Usage], None] | None = None,
    ) -> None:
        self._factory = factory
        self._llm: TextLLM | None = None
        self._built = False
        self._lock = threading.Lock()
        self._slots = threading.BoundedSemaphore(concurrency)
        self._on_late_usage = on_late_usage
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

        player_id = _CALL_PLAYER.get()
        state_lock = threading.Lock()
        captured_usage: Usage | None = None
        timed_out = False

        def _run() -> str:
            nonlocal captured_usage
            if not self._slots.acquire(timeout=1.0):
                raise _BusyError
            try:
                take_last_usage()  # drop anything a previous call on this worker thread left behind
                # A hedged call's losing request finishes later: its tokens count like a late completion.
                on_late = self._on_late_usage
                set_usage_sink(
                    (lambda u: on_late(player_id, u)) if on_late is not None and player_id else None
                )
                text = llm.complete(
                    system,
                    user,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    timeout=timeout,
                    json_schema=json_schema,
                )
                usage = take_last_usage()
                with state_lock:
                    if timed_out:
                        late = True
                    else:
                        captured_usage = usage
                        late = False
                if late and usage is not None and player_id and self._on_late_usage is not None:
                    try:
                        self._on_late_usage(player_id, usage)
                    except Exception:
                        _logger.debug("v2 gm late spend not recorded", exc_info=True)
                return text
            finally:
                self._slots.release()

        loop = asyncio.get_running_loop()
        try:
            return await asyncio.wait_for(
                loop.run_in_executor(self._executor, _run), timeout=timeout
            )
        finally:
            with state_lock:
                if captured_usage is not None:
                    _CALL_USAGE.set(captured_usage)
                else:
                    timed_out = True

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


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401, detail="sign-in required", headers={"WWW-Authenticate": "Bearer"}
    )


def _err_detail(exc: BaseException) -> str:
    """A model-call error's own message, one line and short, for the log (status/code; never the prompt)."""
    return " ".join(str(exc).split())[:160]


def _client_player_id(raw: str | None) -> str | None:
    """A valid ``X-Player-Id`` (the signed-in ``g_`` namespace cannot be claimed by header), else None."""
    player_id = (raw or "").strip()
    if not PLAYER_ID_RE.fullmatch(player_id) or player_id.startswith(GOOGLE_PLAYER_PREFIX):
        return None
    return player_id


def _entry_dict(rank: int, entry: daily.DailyEntry) -> dict[str, Any]:
    return {
        "rank": rank,
        "name": entry.name,
        "result": entry.result.to_dict(),
        "verified": entry.verified,
    }


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
    auth: AuthConfig | None = None,
    verifier: TokenVerifier | None = None,
    now: Callable[[], datetime] | None = None,
    account_deleter: AccountDeleter | None = None,
    budget_config: BudgetConfig | None = None,
    billing_config: BillingConfig | None = None,
    purchase_verifier: PurchaseVerifier | None = None,
) -> APIRouter:
    """Build the ``/api/v2`` router. Defaults read the environment; tests inject
    ``store_factory=MemoryV2Store``, a fake ``llm_factory``, an ``AuthConfig``, a token ``verifier``
    a ``now`` clock (for the KST date windows) and an ``account_deleter`` (Firebase user removal)."""
    cfg = settings or V2Settings.from_env()
    auth_cfg = auth or AuthConfig.from_env()
    token_verifier = verifier or build_verifier(auth_cfg.project_id)
    deleter = account_deleter or build_account_deleter(auth_cfg.project_id)
    clock = now or (lambda: datetime.now(UTC))
    holder = StoreHolder(store_factory)
    budget = Budget(budget_config or BudgetConfig.from_env(cfg.gm_price), holder.get, now=clock)
    runner = _GMRunner(
        llm_factory or build_text_llm, cfg.gm_concurrency, on_late_usage=budget.charge
    )
    gm_limiter = RateLimiter(cfg.gm_per_minute, cfg.gm_per_day)
    write_limiter = RateLimiter(cfg.writes_per_minute)
    daily_limiter = RateLimiter(cfg.daily_per_minute)
    admin_limiter = RateLimiter(cfg.admin_per_minute)
    report_limiter = RateLimiter(cfg.reports_per_minute)
    gm_stats = admin.GMStats(clock())
    bill_cfg = billing_config or BillingConfig.from_env()
    plans = Plans(
        bill_cfg,
        holder.get,
        purchase_verifier or GooglePlayVerifier(bill_cfg.package, bill_cfg.skus),
        now=clock,
        granted=lambda pid: pid in admin_players,
    )

    @asynccontextmanager
    async def _lifespan(_app: Any) -> AsyncIterator[None]:
        yield
        runner.close()
        await run_in_threadpool(holder.close)

    router = APIRouter(prefix=API_V2_PREFIX, tags=["v2"], lifespan=_lifespan)

    async def signed_in_player(request: Request) -> str | None:
        """The player of a verified Bearer token; None without one; 401 for a token that fails."""
        uid = await signed_in_uid(request)
        return None if uid is None else player_id_for_uid(uid)

    #: Players whose verified token carried an allow-listed admin email (``MYTHOS_ADMIN_EMAILS``): no monthly AI
    #: allowance and Signal+ features. Learned per process from real tokens; the email itself is never kept.
    admin_players: set[str] = set()

    def note_admin(who: Identity) -> str:
        if who.email_verified and who.email and who.email in auth_cfg.admin_emails:
            admin_players.add(player_id_for_uid(who.uid))
        return who.uid

    async def signed_in_uid(request: Request) -> str | None:
        """The Firebase uid of a verified Bearer token; None without one; 401 for a token that fails."""
        token = bearer_token(request.headers.get("authorization"))
        if token is None:
            return None
        identify = (
            getattr(token_verifier, "verify_identity", None) if auth_cfg.admin_emails else None
        )
        try:
            if identify is not None:
                uid = note_admin(await run_in_threadpool(identify, token))
            else:
                uid = await run_in_threadpool(token_verifier.verify, token)
        except TokenError as exc:
            _logger.info("v2 auth: token rejected", extra={"outcome": exc.reason})
            raise _unauthorized() from None
        except CertsUnavailableError:
            raise HTTPException(status_code=503, detail="sign-in check unavailable") from None
        return uid

    async def require_player(
        request: Request,
        x_player_id: Annotated[str | None, Header()] = None,
    ) -> str:
        player_id = await signed_in_player(request)
        if player_id is not None:
            return player_id
        if auth_cfg.mode == "google":
            raise _unauthorized()
        client_id = _client_player_id(x_player_id)
        if client_id is None:
            raise HTTPException(status_code=400, detail="missing or invalid X-Player-Id")
        return client_id

    async def optional_player(
        request: Request,
        x_player_id: Annotated[str | None, Header()] = None,
    ) -> str | None:
        player_id = await signed_in_player(request)
        if player_id is not None or auth_cfg.mode == "google":
            return player_id
        return _client_player_id(x_player_id)

    async def gm_player(
        request: Request,
        x_player_id: Annotated[str | None, Header()] = None,
        x_demo_code: Annotated[str | None, Header()] = None,
    ) -> str:
        """``require_player`` for the AI GM routes and ``/plan``, plus the contest demo path: a signed-out
        device sending a code from ``MYTHOS_DEMO_CODES`` gets its own ``demo_`` id (free allowance, GM only)."""
        player_id = await signed_in_player(request)
        if player_id is not None:
            return player_id
        code = (x_demo_code or "").strip()
        client_id = _client_player_id(x_player_id)
        if code and client_id and any(hmac.compare_digest(code, c) for c in auth_cfg.demo_codes):
            return demo_player_id(code, client_id)
        return await require_player(request, x_player_id)

    async def require_admin(request: Request) -> str:
        """An allow-listed Google account (verified email), else 401/403. Returns a rate-limit key.

        ``MYTHOS_ADMIN_EMAILS`` is the allow-list; nothing about the caller is logged. In mode ``open`` with
        ``MYTHOS_ADMIN_OPEN=1`` (local dev) no sign-in is needed."""
        if auth_cfg.admin_open:
            return "admin:dev"
        token = bearer_token(request.headers.get("authorization"))
        if token is None:
            raise _unauthorized()
        identify = getattr(token_verifier, "verify_identity", None)
        if identify is None:
            raise HTTPException(status_code=403, detail="admin only")
        try:
            who: Identity = await run_in_threadpool(identify, token)
        except TokenError as exc:
            _logger.info("v2 admin: token rejected", extra={"outcome": exc.reason})
            raise _unauthorized() from None
        except CertsUnavailableError:
            raise HTTPException(status_code=503, detail="sign-in check unavailable") from None
        if not (who.email_verified and who.email and who.email in auth_cfg.admin_emails):
            _logger.info("v2 admin: not an admin", extra={"outcome": "forbidden"})
            raise HTTPException(status_code=403, detail="admin only")
        return "admin:" + player_id_for_uid(who.uid)

    def limit_gm_body(request: Request) -> None:
        declared = request.headers.get("content-length", "")
        if declared.isdigit() and int(declared) > cfg.max_gm_body_bytes:
            raise HTTPException(status_code=413, detail="request too large")

    player_dep = Annotated[str, Depends(require_player)]
    gm_player_dep = Annotated[str, Depends(gm_player)]
    optional_player_dep = Annotated[str | None, Depends(optional_player)]

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

    @router.get("/config")
    async def v2_config() -> dict[str, Any]:
        """What the client needs before sign-in: the auth mode and the public Firebase web config."""
        firebase = dict(auth_cfg.web_config) if auth_cfg.web_config else None
        return {"auth": auth_cfg.mode, "firebase": firebase, "leaderboard": True}

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
        await store_call(lambda s: s.append_history(player_id, rid, data))
        return {"ok": True, "id": rid}

    @router.get("/history")
    async def v2_get_history(
        player_id: player_dep, limit: Annotated[int, Query(ge=1, le=100)] = 30
    ) -> dict[str, Any]:
        records = await store_call(lambda s: s.list_history(player_id, limit))
        return {"records": records}

    # --- account deletion (Play policy: in-app + web) -------------------------------------------------

    @router.delete("/account")
    async def v2_delete_account(
        request: Request,
        x_player_id: Annotated[str | None, Header()] = None,
    ) -> dict[str, Any]:
        """Erase everything the server keeps for the caller: both save slots, run history and daily-board rows,
        then (signed in) the Firebase sign-in record with the Google email/name/photo. The data rows go first,
        so a failed record removal never leaves game data behind; ``sign_in_record_deleted`` is false then and
        a repeat call retries it. Nothing about the player is logged."""
        uid = await signed_in_uid(request)
        if uid is not None:
            player_id = player_id_for_uid(uid)
        elif auth_cfg.mode == "google":
            raise _unauthorized()
        else:
            client_id = _client_player_id(x_player_id)
            if client_id is None:
                raise HTTPException(status_code=400, detail="missing or invalid X-Player-Id")
            player_id = client_id
        check_write_rate(player_id)
        removed = await store_call(lambda s: s.delete_player(player_id))
        record_deleted: bool | None = None
        if uid is not None:
            record_deleted = await run_in_threadpool(deleter.delete_user, uid)
        _logger.info(
            "v2 account deleted",
            extra={"outcome": "ok" if record_deleted is not False else "sign-in-record-kept"},
        )
        return {"ok": True, "removed": removed, "sign_in_record_deleted": record_deleted}

    # --- daily-seed leaderboard ----------------------------------------------------------------------

    def board_day(day_key: str, window_days: int) -> date:
        day = daily.parse_day(day_key)
        if day is None or not daily.in_window(day, daily.today_kst(clock()), window_days):
            raise HTTPException(
                status_code=422,
                detail=f"date must be a real YYYY-MM-DD within the last {window_days} days (KST)",
            )
        return day

    @router.put("/daily/{day_key}")
    async def v2_put_daily(
        day_key: str, body: DailySubmitBody, player_id: player_dep
    ) -> dict[str, Any]:
        day = board_day(day_key, daily.SUBMIT_WINDOW_DAYS)
        if not daily_limiter.allow(player_id):
            raise HTTPException(status_code=429, detail="too many writes")
        result = body.result.to_result()
        name = daily.clean_name(body.name)
        verified = await run_in_threadpool(
            replay.verify, body.replay, result.to_dict(), day.isoformat()
        )
        sub = await store_call(lambda s: s.submit_daily(day, player_id, name, result, verified))
        return {
            "rank": sub.rank,
            "total": sub.total,
            "best": sub.best.to_dict(),
            "improved": sub.improved,
            "verified": verified,
        }

    @router.get("/daily/{day_key}")
    async def v2_get_daily(
        day_key: str,
        archetype: Annotated[str, Query(pattern=daily.ARCHETYPE_PATTERN)],
        player_id: optional_player_dep,
        limit: Annotated[int, Query(ge=1, le=50)] = 20,
    ) -> dict[str, Any]:
        day = board_day(day_key, daily.READ_WINDOW_DAYS)
        board = await store_call(lambda s: s.daily_board(day, archetype, limit, player_id))
        return {
            "date": day.isoformat(),
            "archetype": archetype,
            "total": board.total,
            "entries": [
                {
                    **_entry_dict(rank, entry),
                    "me": player_id is not None and entry.player_id == player_id,
                }
                for rank, entry in board.entries
            ],
            "me": _entry_dict(*board.me) if board.me is not None else None,
        }

    # --- operator dashboard ----------------------------------------------------------------------------

    @router.get("/admin/overview")
    async def v2_admin_overview(
        admin_key: Annotated[str, Depends(require_admin)],
        days: Annotated[int, Query(ge=1, le=admin.MAX_DAYS)] = admin.DEFAULT_DAYS,
    ) -> dict[str, Any]:
        if not admin_limiter.allow(admin_key):
            raise HTTPException(status_code=429, detail="too many requests")
        moment = clock()
        first_day = daily.today_kst(moment) - timedelta(days=days - 1)
        since = datetime.combine(first_day, dtime.min, tzinfo=daily.KST)

        def _load(s: V2Store) -> tuple[Any, Any, Any, Any, Any, str]:
            return (
                s.admin_players(),
                s.admin_runs(since),
                s.admin_daily(first_day),
                s.admin_gm_usage(first_day),
                s.admin_gm_reports(since),
                s.kind,
            )

        players, runs, daily_rows, gm_usage, reports, store_kind = await store_call(_load)
        server = {
            "auth": auth_cfg.mode,
            "store": store_kind,
            "gm": runner.name,
            "gm_stats": gm_stats.snapshot(),
        }
        return admin.build_overview(
            players,
            runs,
            daily_rows,
            gm_usage,
            now=moment,
            days=days,
            server=server,
            gm_price=cfg.gm_price,
            gm_reports=reports,
        )

    # --- Signal+ plan and AI budget ------------------------------------------------------------------

    def plan_dict(player_id: str, tier: Tier, ent: Entitlement | None) -> dict[str, Any]:
        signed_in = player_id.startswith(GOOGLE_PLAYER_PREFIX)
        admin = player_id in admin_players
        demo = player_id.startswith(DEMO_PLAYER_PREFIX)
        features = (["ai"] if signed_in or demo or auth_cfg.mode == "open" else []) + (
            ["crpg"] if tier == "plus" else []
        )
        return {
            "tier": tier,
            "signedIn": signed_in,
            # Play's obfuscatedAccountId for a purchase: the server only honours tokens bought for this id.
            "accountId": player_id if signed_in else None,
            "features": features,
            "budget": {**budget.status(player_id, tier), "unlimited": True}
            if admin
            else budget.status(player_id, tier),
            "admin": admin,
            "demo": demo,
            "subscription": None
            if ent is None
            else {
                "sku": ent.sku,
                "state": ent.state,
                "expiresAt": ent.expires_at.isoformat() if ent.expires_at else None,
            },
            "skus": list(bill_cfg.skus),
        }

    @router.get("/plan")
    async def v2_plan(player_id: gm_player_dep) -> dict[str, Any]:
        """The caller's tier, AI budget meter and subscription. Re-checks an expired subscription with Google."""

        def _load() -> dict[str, Any]:
            ent = plans.entitlement(player_id, refresh=True)
            return plan_dict(player_id, plans.tier(player_id), ent)

        return await store_call(lambda _s: _load())

    @router.post("/plan/play")
    async def v2_plan_play(body: PlayPurchaseBody, player_id: player_dep) -> dict[str, Any]:
        """Redeem a Google Play Signal+ purchase for the signed-in caller."""
        if not player_id.startswith(GOOGLE_PLAYER_PREFIX):
            raise _unauthorized()
        check_write_rate(player_id)

        def _redeem() -> dict[str, Any]:
            ent = plans.redeem(player_id, body.purchase_token)
            return plan_dict(player_id, plans.tier(player_id), ent)

        try:
            result = await store_call(lambda _s: _redeem())
        except BillingError as exc:
            _logger.info("v2 plan purchase rejected", extra={"outcome": exc.reason})
            status = 503 if exc.reason.startswith(("unreachable", "no play", "http")) else 422
            raise HTTPException(
                status_code=status, detail=f"purchase not verified: {exc.reason}"
            ) from None
        _logger.info("v2 plan purchase", extra={"player_id": player_id, "outcome": result["tier"]})
        return result

    # --- AI GM -------------------------------------------------------------------

    async def gm_refusal(player_id: str) -> str | None:
        """Why this player may not make a GM call now (``rate_limited`` / ``budget`` / ``ceiling``), else None."""
        _CALL_PLAYER.set(player_id)
        if not gm_limiter.allow(player_id):
            return "rate_limited"
        if player_id in admin_players:
            return await run_in_threadpool(lambda: budget.refusal(player_id, "plus", exempt=True))
        return await run_in_threadpool(lambda: budget.refusal(player_id, plans.tier(player_id)))

    async def log_gm(
        route: str, player_id: str, outcome: str, started: float, **extra: Any
    ) -> None:
        gm_stats.record(route, outcome)
        _CALL_PLAYER.set(None)
        used = _CALL_USAGE.get()
        _CALL_USAGE.set(None)
        if used is not None:
            try:
                await asyncio.wait_for(
                    run_in_threadpool(lambda: budget.charge(player_id, used)), timeout=2.0
                )
            except Exception as exc:
                _logger.warning("v2 gm spend not recorded: %s", type(exc).__name__)
        # Durable per-day counter for the operator dashboard. Best effort and bounded: a slow or failing
        # store never delays or fails the reply (the authored/LLM text is already decided).
        day = daily.today_kst(clock())
        try:
            await asyncio.wait_for(
                run_in_threadpool(
                    lambda: holder.get().record_gm_usage(
                        day,
                        route,
                        outcome,
                        used.prompt_tokens if used else 0,
                        used.output_tokens if used else 0,
                    )
                ),
                timeout=2.0,
            )
        except Exception as exc:
            _logger.debug("v2 gm usage not recorded: %s", type(exc).__name__)
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
    async def v2_gm_narrate(body: NarrateBody, player_id: gm_player_dep) -> dict[str, Any]:
        if len(json.dumps(body.context, default=str)) > cfg.max_context_bytes:
            raise HTTPException(status_code=413, detail="context too large")
        started = time.perf_counter()
        context = gm.sanitize_context(body.context)
        text: str | None = None
        if (refused := await gm_refusal(player_id)) is not None:
            outcome = refused
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
                if text and talk.absent_companion_named(text, context):
                    text = None
                outcome = "llm" if text else "rejected"
            except Exception as exc:
                outcome = _outcome_for(exc)
                if outcome == "error":
                    _logger.warning(
                        "v2 gm narrate failed: %s: %s", type(exc).__name__, _err_detail(exc)
                    )
        source = "llm"
        if text is None:
            text = gm.fallback_narration(body.kind, body.lang, context)
            source = "fallback"
        await log_gm("narrate", player_id, outcome, started, status=body.kind)
        return {"text": text, "source": source}

    @router.post("/gm/improvise", dependencies=[Depends(limit_gm_body)])
    async def v2_gm_improvise(body: ImproviseBody, player_id: gm_player_dep) -> dict[str, Any]:
        started = time.perf_counter()
        action = gm.normalize_action(body.action)
        cls = gm.classify_action(action)
        verdict: gm.Adjudication | None = None
        if cls.abusive:
            outcome = "rejected_input"
        elif (refused := await gm_refusal(player_id)) is not None:
            outcome = refused
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
                    _logger.warning(
                        "v2 gm improvise failed: %s: %s", type(exc).__name__, _err_detail(exc)
                    )
        if verdict is None:
            verdict = gm.fallback_improvisation(action, cls)
        await log_gm("improvise", player_id, outcome, started)
        return verdict.to_dict()

    async def talk_companion(
        body: TalkBody, player_id: str, context: dict[str, Any]
    ) -> tuple[str, str, str]:
        companion = body.companion.strip()
        if not talk.valid_companion_id(companion):
            raise HTTPException(status_code=422, detail="companion id is required")
        message = talk.normalize_message(body.message)
        if not message:
            raise HTTPException(status_code=422, detail="message is required")
        history = talk.normalize_history([(turn.role, turn.text) for turn in body.history])
        deflect = talk.screen_message(message) != "ok"
        text: str | None = None
        if deflect:
            outcome = "deflected"
        elif talk.player_turns(history) >= talk.MAX_PLAYER_MESSAGES:
            outcome = "turn_cap"
        elif (refused := await gm_refusal(player_id)) is not None:
            outcome = refused
        else:
            system, user = talk.companion_messages(companion, body.lang, context, history, message)
            try:
                raw = await runner.complete(
                    system,
                    user,
                    max_tokens=talk.COMPANION_MAX_TOKENS,
                    temperature=0.85,
                    timeout=cfg.talk_timeout,
                )
                text = talk.clean_companion_reply(raw, companion, body.lang, context)
                outcome = "llm" if text else "rejected"
            except Exception as exc:
                outcome = _outcome_for(exc)
                if outcome == "error":
                    _logger.warning(
                        "v2 gm talk failed: %s: %s", type(exc).__name__, _err_detail(exc)
                    )
        if text is not None:
            return text, "llm", outcome
        fallback = talk.fallback_companion(companion, body.lang, message, history, deflect=deflect)
        return fallback, "fallback", outcome

    async def talk_ix(
        body: TalkBody, player_id: str, context: dict[str, Any]
    ) -> tuple[str, str, str]:
        trigger = body.trigger
        if trigger is None:
            raise HTTPException(status_code=422, detail="trigger is required")
        text: str | None = None
        if (refused := await gm_refusal(player_id)) is not None:
            outcome = refused
        else:
            system, user = talk.ix_messages(trigger, body.lang, context)
            try:
                raw = await runner.complete(
                    system,
                    user,
                    max_tokens=talk.IX_MAX_TOKENS,
                    temperature=0.7,
                    timeout=cfg.ix_timeout,
                )
                text = talk.clean_ix_line(raw, body.lang, context)
                outcome = "llm" if text else "rejected"
            except Exception as exc:
                outcome = _outcome_for(exc)
                if outcome == "error":
                    _logger.warning(
                        "v2 gm talk failed: %s: %s", type(exc).__name__, _err_detail(exc)
                    )
        if text is not None:
            return text, "llm", outcome
        return talk.fallback_ix(trigger, body.lang, context), "fallback", outcome

    async def talk_enemy(
        body: TalkBody, player_id: str, context: dict[str, Any]
    ) -> tuple[str, str, str]:
        """One taunt from a talking enemy. The client shows its own authored line first, so a miss returns ""."""
        enemy = body.enemy.strip()
        if body.moment is None or not taunt.valid_speaker(enemy):
            raise HTTPException(status_code=422, detail="unknown enemy or taunt")
        text: str | None = None
        if (refused := await gm_refusal(player_id)) is not None:
            outcome = refused
        else:
            system, user = taunt.taunt_messages(enemy, body.moment, body.lang)
            try:
                raw = await runner.complete(
                    system,
                    user,
                    max_tokens=taunt.TAUNT_MAX_TOKENS,
                    temperature=0.8,
                    timeout=cfg.ix_timeout,
                )
                text = taunt.clean_taunt(raw, enemy, body.lang, context)
                outcome = "llm" if text else "rejected"
            except Exception as exc:
                outcome = _outcome_for(exc)
                if outcome == "error":
                    _logger.warning(
                        "v2 gm talk failed: %s: %s", type(exc).__name__, _err_detail(exc)
                    )
        return (text, "llm", outcome) if text is not None else ("", "fallback", outcome)

    async def talk_npc(
        body: TalkBody, player_id: str, context: dict[str, Any]
    ) -> tuple[str, str, str, str | None]:
        """A district NPC answers and names the intent the player's line attempts. A miss returns no line and a
        keyword guess at the intent (the client keeps its option buttons either way)."""
        who = body.npc.strip()
        if not npc.valid_npc(who):
            raise HTTPException(status_code=422, detail="unknown npc")
        message = talk.normalize_message(body.message)
        if not message:
            raise HTTPException(status_code=422, detail="message is required")
        intents = npc.open_intents(body.options)
        history = talk.normalize_history([(turn.role, turn.text) for turn in body.history])
        text: str | None = None
        intent: str | None = None
        if talk.screen_message(message) != "ok":
            outcome = "deflected"
        elif talk.player_turns(history) >= talk.MAX_PLAYER_MESSAGES:
            outcome = "turn_cap"
        elif (refused := await gm_refusal(player_id)) is not None:
            outcome = refused
        else:
            system, user = npc.npc_messages(who, body.lang, context, history, message, intents)
            try:
                raw = await runner.complete(
                    system,
                    user,
                    max_tokens=npc.NPC_MAX_TOKENS,
                    temperature=0.7,
                    timeout=cfg.talk_timeout,
                    json_schema=npc.NPC_JSON_SCHEMA,
                )
                text, intent = npc.clean_npc_reply(raw, who, body.lang, context, intents)
                # The model answered but named no open intent: a clear keyword match still counts.
                intent = intent or npc.fallback_intent(message, intents)
                outcome = "llm" if text else "rejected"
            except Exception as exc:
                outcome = _outcome_for(exc)
                if outcome == "error":
                    _logger.warning(
                        "v2 gm talk failed: %s: %s", type(exc).__name__, _err_detail(exc)
                    )
        if text is None:
            return "", "fallback", outcome, npc.fallback_intent(message, intents)
        return text, "llm", outcome, intent

    @router.post("/gm/report", dependencies=[Depends(limit_gm_body)])
    async def v2_gm_report(body: ReportBody, player_id: gm_player_dep) -> dict[str, Any]:
        """Keep a flagged AI line for the operator (``/admin``). The player id only feeds the rate limit."""
        if not report_limiter.allow(player_id):
            raise HTTPException(status_code=429, detail="too many reports")
        text = body.text.strip()
        if not text:
            raise HTTPException(status_code=422, detail="text is required")
        await store_call(lambda s: s.record_gm_report(body.route, body.kind, body.lang, text))
        _logger.info("v2 gm report", extra={"status": f"{body.route}:{body.kind}"})
        return {"ok": True}

    @router.post("/gm/talk", dependencies=[Depends(limit_gm_body)])
    async def v2_gm_talk(body: TalkBody, player_id: gm_player_dep) -> dict[str, Any]:
        """Companion chat reply or one IX comms line. Never changes game state; any miss
        serves an authored line (``source: "fallback"``)."""
        if len(json.dumps(body.context, default=str)) > cfg.max_context_bytes:
            raise HTTPException(status_code=413, detail="context too large")
        started = time.perf_counter()
        context = gm.sanitize_context(body.context)
        if body.mode == "npc":
            text, source, outcome, intent = await talk_npc(body, player_id, context)
            await log_gm("talk", player_id, outcome, started, status=f"npc:{body.npc.strip()}")
            return {"text": text, "source": source, "intent": intent}
        if body.mode == "companion":
            text, source, outcome = await talk_companion(body, player_id, context)
            status = f"companion:{body.companion.strip()}"
        elif body.mode == "enemy":
            text, source, outcome = await talk_enemy(body, player_id, context)
            status = f"enemy:{body.enemy.strip()}:{body.moment}"
        else:
            text, source, outcome = await talk_ix(body, player_id, context)
            status = f"ix:{body.trigger}"
        await log_gm("talk", player_id, outcome, started, status=status)
        return {"text": text, "source": source}

    return router


__all__ = ["API_V2_PREFIX", "PLAYER_ID_RE", "V2Settings", "create_v2_router"]
