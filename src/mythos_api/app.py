"""Mythos 2.0 web server: the SPA, its art, and the `/api/v2` backend (saves + AI GM).

The game itself runs in the browser (`src/mythos_ui/src/v2`); this process only
- serves the prebuilt SPA (`src/mythos_api/static`, committed) and the game art (`/resources`),
- mounts `/api/v2` (`mythos_v2.create_v2_router`: profile/run saves, GM narrate/improvise/talk, the
  daily-seed leaderboard, Google sign-in via Firebase ID tokens),
- answers CORS for the Android app (Capacitor WebView, origin https://localhost).

The 1.x runtime that used to live here (`/api/v1`, WebSocket loops, admin dashboard) is archived on
branch `1.0`.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from mythos_v2.api import create_v2_router

STATIC_DIR = Path(__file__).parent / "static"
RESOURCES_DIR = Path(__file__).resolve().parent.parent.parent / "resources"


class _NoCacheStaticFiles(StaticFiles):
    """Serve the SPA bundle with ``Cache-Control: no-cache``.

    The bundle is emitted as fixed filenames (``/app.js``, ``/assets/*.js``) without content hashes, so
    browsers would otherwise serve a stale build from heuristic cache after a rebuild. ``no-cache`` forces
    revalidation each load while ETag/Last-Modified still allow cheap 304s.
    """

    def file_response(self, *args: Any, **kwargs: Any) -> Response:
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "no-cache"
        return response


def _cors_origins() -> list[str]:
    """Origins allowed to call the API cross-origin (env ``MYTHOS_CORS_ORIGINS``, comma-separated)."""
    raw = os.getenv(
        "MYTHOS_CORS_ORIGINS", "https://localhost,http://localhost,capacitor://localhost"
    )
    return [o.strip() for o in raw.split(",") if o.strip()]


def create_app() -> FastAPI:
    app = FastAPI(title="Mythos 2.0", version="2.0.0")
    # The Android app calls /api/v2 cross-origin; the router applies the sign-in rule itself
    # (Authorization: Bearer <Firebase ID token>, or X-Player-Id in open mode). No cookies are used.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins(),
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-Player-Id", "Authorization"],
        max_age=600,
    )

    @app.get("/api/health")
    @app.get("/api/v1/health", include_in_schema=False)  # kept for existing uptime probes
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(create_v2_router())

    if RESOURCES_DIR.is_dir():
        app.mount("/resources", StaticFiles(directory=RESOURCES_DIR), name="resources")

    # No favicon asset: answer the browser's automatic request instead of 404ing through the SPA mount.
    @app.get("/favicon.ico", include_in_schema=False)
    async def _favicon() -> Response:
        return Response(status_code=204)

    # Last: the catch-all SPA mount must not shadow the API routes above.
    if STATIC_DIR.is_dir():
        app.mount("/", _NoCacheStaticFiles(directory=STATIC_DIR, html=True), name="static")

    return app
