"""Invite-key gating for the closed beta (cost + access safety, DEPLOY.md §9).

When ``MYTHOS_INVITE_KEYS`` is set (comma-separated allowed keys), the API requires a
valid key on the cost-bearing endpoints — ``/api/v1/*`` except ``/api/v1/health`` — via
the ``X-Invite-Key`` header (REST) or an ``?invite=`` query param (REST or WebSocket).
When unset, the gate is fully open, so local dev / tests / the un-gated deploy are
behavior-preserving. The SPA reads ``?invite=`` from its URL and forwards it.
"""

from __future__ import annotations

import os
from collections.abc import Awaitable, Callable
from typing import Any
from urllib.parse import unquote

_GATED_PREFIX = "/api/v1/"
# Cost-free endpoints that stay open pre-invite: health probes and the client
# boot config (BGM default etc.) — the boot screen reads config before any key.
_OPEN_PATHS = {"/api/v1/health", "/api/v1/client-config"}


def allowed_invite_keys() -> set[str]:
    raw = os.getenv("MYTHOS_INVITE_KEYS", "")
    return {k.strip() for k in raw.split(",") if k.strip()}


def _is_gated_path(path: str) -> bool:
    return path.startswith(_GATED_PREFIX) and path not in _OPEN_PATHS


def _extract_key(scope: dict[str, Any]) -> str | None:
    for name, value in scope.get("headers", []):
        if name == b"x-invite-key":
            return str(value.decode("latin-1")).strip()
    query = scope.get("query_string", b"").decode("latin-1")
    for part in query.split("&"):
        if part.startswith("invite="):
            return unquote(part[len("invite=") :]).strip()
    return None


def _request_allowed(scope: dict[str, Any], keys: set[str]) -> bool:
    if not keys or not _is_gated_path(scope.get("path", "")):
        return True
    key = _extract_key(scope)
    return key is not None and key in keys


async def _send_http_401(send: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
    body = b'{"detail":"invalid or missing invite key"}'
    await send(
        {
            "type": "http.response.start",
            "status": 401,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})


class InviteGateMiddleware:
    """ASGI middleware enforcing the invite key on http + websocket scopes."""

    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(
        self,
        scope: dict[str, Any],
        receive: Callable[[], Awaitable[dict[str, Any]]],
        send: Callable[[dict[str, Any]], Awaitable[None]],
    ) -> None:
        if scope["type"] in ("http", "websocket"):
            # Read keys per-request so deploy/tests can set the env without a rebuild.
            if not _request_allowed(scope, allowed_invite_keys()):
                if scope["type"] == "websocket":
                    await send({"type": "websocket.close", "code": 1008})
                else:
                    await _send_http_401(send)
                return
        await self.app(scope, receive, send)
