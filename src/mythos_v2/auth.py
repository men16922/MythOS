"""Sign-in for ``/api/v2``: Firebase Auth (Google) ID tokens → an opaque, stable player id.

Mode (env ``MYTHOS_AUTH``):
  ``open``   (default; local dev and tests) — ``X-Player-Id`` identifies the player as before; a Bearer
             token, when one is sent, must still verify (a bad token is never downgraded to anonymous).
  ``google`` (Cloud Run) — saves, the GM and leaderboard writes need a valid Firebase ID token.
Any other value fails closed to ``google`` (logged).

Verification follows Firebase's "verify ID tokens with a third-party JWT library" recipe (no firebase-admin):
RS256 against Google's securetoken x509 certs (cached per ``Cache-Control: max-age``; an unknown ``kid``
triggers at most one refresh a minute), ``aud`` = project, ``iss`` = https://securetoken.google.com/<project>,
``exp``/``iat``/``auth_time`` within 60 s leeway, non-empty ``sub`` and ``firebase.sign_in_provider`` ==
"google.com". The signature is checked with google-auth's ``crypt`` module; claims are checked here against
an injectable clock. ``verify`` may block on the cert fetch: call it off the event loop.

The uid never leaves this module in the clear: ``player_id = "g_" + sha256(uid)[:32]``. Never log the
token, uid, email or name.

Firebase project: ``MYTHOS_FIREBASE_PROJECT``, else ``PROJECT_ID``. Web config for ``GET /config`` (public by
design, never committed): ``MYTHOS_FIREBASE_WEB_CONFIG`` (a JSON object string), else the gitignored
``.firebase/web-config.json`` written by ``scripts/firebase/web-app.sh``.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import math
import os
import re
import threading
import time
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal, Protocol

from mythos_v2.config import PROJECT_ROOT, env
from mythos_v2.log import get_logger

AuthMode = Literal["open", "google"]

SECURETOKEN_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
)
ISSUER_PREFIX = "https://securetoken.google.com/"
GOOGLE_PROVIDER = "google.com"
CLOCK_LEEWAY_SECONDS = 60.0
#: An unknown ``kid`` refreshes the certs at most this often (bogus kids cannot hammer Google).
KID_REFRESH_SECONDS = 60.0
#: After a failed fetch, the next attempt waits this long (stale certs keep serving meanwhile).
FETCH_RETRY_SECONDS = 10.0
DEFAULT_CERT_MAX_AGE = 3600.0
MAX_CERT_MAX_AGE = 86_400.0
MIN_CERT_MAX_AGE = 60.0
MAX_TOKEN_CHARS = 4096
MAX_UID_CHARS = 128

GOOGLE_PLAYER_PREFIX = "g_"
GOOGLE_PLAYER_ID_RE = re.compile(r"^g_[0-9a-f]{32}$")

WEB_CONFIG_KEYS = ("apiKey", "authDomain", "projectId", "appId", "messagingSenderId")
WEB_CONFIG_FILE = PROJECT_ROOT / ".firebase" / "web-config.json"

_logger = get_logger("mythos.v2.auth")


class TokenError(Exception):
    """The token is not a valid Firebase Google sign-in. ``reason`` is short and safe to log."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class CertsUnavailableError(RuntimeError):
    """Google's signing certs could not be fetched and none are cached (mapped to HTTP 503)."""


@dataclass(frozen=True)
class Identity:
    """A verified Google sign-in. ``email`` is only ever compared (admin allow-list), never stored or logged."""

    uid: str
    email: str = ""
    email_verified: bool = False


class TokenVerifier(Protocol):
    def verify(self, token: str) -> str:
        """Return the Firebase uid, or raise ``TokenError`` / ``CertsUnavailableError``."""
        ...


#: ``() -> ({kid: x509 PEM}, max_age_seconds)``
CertFetcher = Callable[[], tuple[Mapping[str, str], float]]


def player_id_for_uid(uid: str) -> str:
    return GOOGLE_PLAYER_PREFIX + hashlib.sha256(uid.encode("utf-8")).hexdigest()[:32]


def bearer_token(authorization: str | None) -> str | None:
    """The token of an ``Authorization: Bearer <token>`` header; ``""`` for an empty Bearer; None when the
    header is absent or uses another scheme."""
    if not authorization:
        return None
    scheme, _, token = authorization.strip().partition(" ")
    if scheme.lower() != "bearer":
        return None
    return token.strip()


# --- certs ----------------------------------------------------------------------------------------------------


def cache_max_age(cache_control: str) -> float:
    match = re.search(r"max-age\s*=\s*(\d+)", cache_control or "", re.IGNORECASE)
    if not match:
        return DEFAULT_CERT_MAX_AGE
    return max(MIN_CERT_MAX_AGE, min(MAX_CERT_MAX_AGE, float(match.group(1))))


def fetch_securetoken_certs(timeout: float = 5.0) -> tuple[dict[str, str], float]:
    """GET Google's securetoken x509 certs (blocking) → ({kid: PEM}, max-age seconds)."""
    import httpx

    response = httpx.get(SECURETOKEN_CERTS_URL, timeout=timeout)
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict):
        raise ValueError("unexpected cert payload")
    certs = {k: v for k, v in data.items() if isinstance(k, str) and isinstance(v, str)}
    return certs, cache_max_age(response.headers.get("cache-control", ""))


class _CertCache:
    """kid → RSA verifier, refreshed on expiry and (throttled) on an unknown kid. Thread-safe.

    A failed fetch keeps serving the stale set and is retried at most every ``FETCH_RETRY_SECONDS``;
    with nothing cached yet, ``verifier`` raises ``CertsUnavailableError`` until a fetch succeeds."""

    def __init__(self, fetcher: CertFetcher, clock: Callable[[], float]) -> None:
        self._fetcher = fetcher
        self._clock = clock
        self._lock = threading.Lock()
        self._verifiers: dict[str, Any] = {}
        self._loaded = False
        self._expires = -math.inf
        self._last_attempt = -math.inf
        self._last_kid_refresh = -math.inf

    def verifier(self, kid: str) -> Any | None:
        with self._lock:
            now = self._clock()
            refreshed = False
            if now >= self._expires and now - self._last_attempt >= FETCH_RETRY_SECONDS:
                refreshed = self._refresh(now)
            found = self._verifiers.get(kid)
            if (
                found is None
                and not refreshed
                and self._loaded
                and now - self._last_kid_refresh >= KID_REFRESH_SECONDS
            ):
                self._last_kid_refresh = now
                self._refresh(now)
                found = self._verifiers.get(kid)
            if not self._loaded:
                raise CertsUnavailableError("securetoken certs unavailable")
            return found

    def _refresh(self, now: float) -> bool:
        from google.auth.crypt import RSAVerifier

        self._last_attempt = now
        try:
            certs, max_age = self._fetcher()
        except Exception as exc:
            _logger.warning("v2 auth: cert fetch failed (%s)", type(exc).__name__)
            return False
        verifiers: dict[str, Any] = {}
        for kid, pem in certs.items():
            try:
                verifiers[kid] = RSAVerifier.from_string(pem)  # type: ignore[no-untyped-call]
            except Exception:
                _logger.warning("v2 auth: skipped an unreadable cert")
        if not verifiers:
            _logger.warning("v2 auth: cert fetch returned no usable certs")
            return False
        self._verifiers = verifiers
        self._loaded = True
        self._expires = now + max(MIN_CERT_MAX_AGE, min(MAX_CERT_MAX_AGE, max_age))
        return True


# --- tokens ---------------------------------------------------------------------------------------------------


def _b64url(segment: str) -> bytes:
    if not re.fullmatch(r"[A-Za-z0-9_-]*", segment):
        raise TokenError("malformed")
    try:
        return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))
    except (binascii.Error, ValueError) as exc:
        raise TokenError("malformed") from exc


def _json_segment(segment: str) -> dict[str, Any]:
    try:
        value = json.loads(_b64url(segment))
    except (ValueError, UnicodeDecodeError) as exc:
        raise TokenError("malformed") from exc
    if not isinstance(value, dict):
        raise TokenError("malformed")
    return value


def _number(claims: Mapping[str, Any], name: str) -> float:
    value = claims.get(name)
    if isinstance(value, bool) or not isinstance(value, int | float) or not math.isfinite(value):
        raise TokenError(f"missing {name}")
    return float(value)


class FirebaseTokenVerifier:
    """Verifies Firebase ID tokens for one project. ``fetcher``/``clock`` are injectable for tests."""

    def __init__(
        self,
        project_id: str,
        *,
        fetcher: CertFetcher | None = None,
        clock: Callable[[], float] = time.time,
        leeway: float = CLOCK_LEEWAY_SECONDS,
    ) -> None:
        self.project_id = project_id
        self._issuer = ISSUER_PREFIX + project_id
        self._clock = clock
        self._leeway = leeway
        self._certs = _CertCache(fetcher or fetch_securetoken_certs, clock)

    def verify_identity(self, token: str) -> Identity:
        if not token or len(token) > MAX_TOKEN_CHARS:
            raise TokenError("malformed")
        parts = token.split(".")
        if len(parts) != 3:
            raise TokenError("malformed")
        header = _json_segment(parts[0])
        claims = _json_segment(parts[1])
        signature = _b64url(parts[2])
        if header.get("alg") != "RS256":
            raise TokenError("bad alg")
        kid = header.get("kid")
        if not isinstance(kid, str) or not kid:
            raise TokenError("missing kid")
        verifier = self._certs.verifier(kid)
        if verifier is None:
            raise TokenError("unknown kid")
        signed = f"{parts[0]}.{parts[1]}".encode("ascii")
        if not verifier.verify(signed, signature):
            raise TokenError("bad signature")
        return self._check_claims(claims)

    def verify(self, token: str) -> str:
        return self.verify_identity(token).uid

    def _check_claims(self, claims: Mapping[str, Any]) -> Identity:
        now = self._clock()
        if claims.get("aud") != self.project_id:
            raise TokenError("bad aud")
        if claims.get("iss") != self._issuer:
            raise TokenError("bad iss")
        if now > _number(claims, "exp") + self._leeway:
            raise TokenError("expired")
        if _number(claims, "iat") > now + self._leeway:
            raise TokenError("issued in the future")
        if "auth_time" in claims and _number(claims, "auth_time") > now + self._leeway:
            raise TokenError("auth_time in the future")
        uid = claims.get("sub")
        if not isinstance(uid, str) or not uid or len(uid) > MAX_UID_CHARS:
            raise TokenError("bad sub")
        firebase = claims.get("firebase")
        provider = firebase.get("sign_in_provider") if isinstance(firebase, dict) else None
        if provider != GOOGLE_PROVIDER:
            raise TokenError("not a Google sign-in")
        email = claims.get("email")
        return Identity(
            uid=uid,
            email=email.strip().lower() if isinstance(email, str) else "",
            email_verified=claims.get("email_verified") is True,
        )


class _UnconfiguredVerifier:
    """No Firebase project configured: every token is rejected."""

    def verify(self, token: str) -> str:
        raise TokenError("no firebase project configured")

    def verify_identity(self, token: str) -> Identity:
        raise TokenError("no firebase project configured")


def build_verifier(project_id: str | None) -> TokenVerifier:
    if not project_id:
        return _UnconfiguredVerifier()
    return FirebaseTokenVerifier(project_id)


# --- config ---------------------------------------------------------------------------------------------------


def parse_auth_mode(raw: str | None) -> AuthMode:
    value = (raw or "").strip().lower()
    if value in {"", "open"}:
        return "open"
    if value != "google":
        _logger.error("MYTHOS_AUTH is neither 'open' nor 'google'; requiring Google sign-in")
    return "google"


def load_web_config(raw: str | None = None, path: Path | None = None) -> dict[str, str] | None:
    """The public Firebase web config (the five keys the client SDK needs), or None.

    ``raw`` defaults to ``MYTHOS_FIREBASE_WEB_CONFIG``; when that is unset the file at ``path`` (default
    ``.firebase/web-config.json``) is read. Values are never logged.
    """
    text = raw if raw is not None else os.getenv("MYTHOS_FIREBASE_WEB_CONFIG")
    source = "MYTHOS_FIREBASE_WEB_CONFIG"
    if text is None or not text.strip():
        file = path or WEB_CONFIG_FILE
        if not file.is_file():
            return None
        source = file.name
        try:
            text = file.read_text(encoding="utf-8")
        except OSError:
            _logger.warning("v2 auth: could not read the Firebase web config file")
            return None
    try:
        data = json.loads(text)
    except ValueError:
        _logger.warning("v2 auth: %s is not JSON; /config serves no Firebase config", source)
        return None
    if not isinstance(data, dict):
        _logger.warning("v2 auth: %s is not a JSON object", source)
        return None
    picked = {key: data.get(key) for key in WEB_CONFIG_KEYS}
    if not all(isinstance(value, str) and value for value in picked.values()):
        _logger.warning("v2 auth: %s lacks one of %s", source, ", ".join(WEB_CONFIG_KEYS))
        return None
    return {key: str(value) for key, value in picked.items()}


def parse_admin_emails(raw: str | None) -> frozenset[str]:
    """``MYTHOS_ADMIN_EMAILS``: comma/space separated, case-insensitive."""
    return frozenset(part.lower() for part in re.split(r"[,\s]+", raw or "") if "@" in part)


@dataclass(frozen=True)
class AuthConfig:
    mode: AuthMode = "open"
    project_id: str | None = None
    web_config: dict[str, str] | None = None
    #: Google accounts (verified email) allowed into ``/admin``. Empty = nobody.
    admin_emails: frozenset[str] = frozenset()
    #: Local dev only (``MYTHOS_ADMIN_OPEN=1`` and mode ``open``): ``/admin`` data needs no sign-in.
    admin_open: bool = False

    @classmethod
    def from_env(cls) -> AuthConfig:
        mode = parse_auth_mode(os.getenv("MYTHOS_AUTH"))
        project = env("MYTHOS_FIREBASE_PROJECT", "PROJECT_ID")
        if mode == "google" and not project:
            _logger.error(
                "MYTHOS_AUTH=google without MYTHOS_FIREBASE_PROJECT/PROJECT_ID: every sign-in fails"
            )
        admin_open = mode == "open" and (os.getenv("MYTHOS_ADMIN_OPEN") or "").strip() == "1"
        return cls(
            mode=mode,
            project_id=project,
            web_config=load_web_config(),
            admin_emails=parse_admin_emails(os.getenv("MYTHOS_ADMIN_EMAILS")),
            admin_open=admin_open,
        )


__all__ = [
    "GOOGLE_PLAYER_ID_RE",
    "GOOGLE_PLAYER_PREFIX",
    "SECURETOKEN_CERTS_URL",
    "WEB_CONFIG_KEYS",
    "AuthConfig",
    "AuthMode",
    "CertFetcher",
    "CertsUnavailableError",
    "FirebaseTokenVerifier",
    "Identity",
    "TokenError",
    "TokenVerifier",
    "bearer_token",
    "build_verifier",
    "cache_max_age",
    "fetch_securetoken_certs",
    "load_web_config",
    "parse_admin_emails",
    "parse_auth_mode",
    "player_id_for_uid",
]
