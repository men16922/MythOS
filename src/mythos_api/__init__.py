"""Mythos 2.0 web server (SPA + `/api/v2`). Run with ``python -m mythos_api`` or ``make api``."""

from mythos_api.app import create_app

__all__ = ["create_app"]
