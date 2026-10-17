"""Vertex AI spend cap for the MythOS project (Cloud Run function, Pub/Sub-triggered by a Cloud Billing budget).

The budget (`make vertex-cap`, docs/online.md "Vertex spend cap") posts its status to a Pub/Sub topic several times a
day: ``{"costAmount", "budgetAmount", "costIntervalStart", ...}`` where the cost already has credits subtracted. When the
month's cost reaches the budget, this disables ``aiplatform.googleapis.com`` in the project, so the game's GM falls back
to authored lines (the game keeps working). When a new month starts and the cost is back under the budget, it enables
the API again. Budgets for months before ``CAP_START`` (YYYY-MM) are ignored.

Env: PROJECT_ID, CAP_START (e.g. 2026-11), SERVICE (default aiplatform.googleapis.com).
"""

from __future__ import annotations

import base64
import json
import os
from typing import Any

import functions_framework
import google.auth
from google.auth.transport.requests import AuthorizedSession

PROJECT = os.environ["PROJECT_ID"]
SERVICE = os.getenv("SERVICE", "aiplatform.googleapis.com")
CAP_START = os.getenv("CAP_START", "")
API = f"https://serviceusage.googleapis.com/v1/projects/{PROJECT}/services/{SERVICE}"


def log(text: str) -> None:
    """One line to stdout (Cloud Logging picks it up; the functions framework swallows root-logger output)."""
    print(f"vertex-cap: {text}", flush=True)


def _session() -> AuthorizedSession:
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    return AuthorizedSession(creds)


def decide(msg: dict[str, Any], enabled: bool) -> str:
    """'disable' | 'enable' | 'none' for one budget notification."""
    start = str(msg.get("costIntervalStart") or "")[:7]
    if CAP_START and start and start < CAP_START:
        return "none"
    cost = float(msg.get("costAmount") or 0)
    budget = float(msg.get("budgetAmount") or 0)
    if budget <= 0:
        return "none"
    if cost >= budget and enabled:
        return "disable"
    if cost < budget and not enabled:
        return "enable"
    return "none"


@functions_framework.cloud_event
def on_budget(event: Any) -> None:
    raw = event.data.get("message", {}).get("data", "")
    msg = json.loads(base64.b64decode(raw).decode() or "{}")
    s = _session()
    state = s.get(API, timeout=20).json().get("state")
    action = decide(msg, state == "ENABLED")
    log(
        f"budget {msg.get('budgetDisplayName')}: cost {msg.get('costAmount')} / {msg.get('budgetAmount')}"
        f" ({msg.get('costIntervalStart')}), {SERVICE} {state} -> {action}"
    )
    if action == "disable":
        r = s.post(f"{API}:disable", json={"disableDependentServices": False}, timeout=60)
        log(f"disabled {SERVICE}: {r.status_code} {r.text[:200]}")
    elif action == "enable":
        r = s.post(f"{API}:enable", json={}, timeout=60)
        log(f"enabled {SERVICE}: {r.status_code} {r.text[:200]}")
