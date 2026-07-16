"""FastAPI backend adapter for Project MythOS (P3 Web UI decoupling).

This package exposes the same orchestration that the Streamlit UI uses
(`RuntimeSessionService`) as a `/api/v1` REST surface so a decoupled
frontend (Next.js/Vite) can drive the game over HTTP. See
`bin/docs/plans/2026-06-03-web-ui-decoupling.md` for the full design.

Installed via the optional `web` extra: ``pip install -e ".[web]"``.
"""

from mythos_api.app import create_app
from mythos_api.serializers import player_to_dict, snapshot_to_dict

__all__ = ["create_app", "player_to_dict", "snapshot_to_dict"]
