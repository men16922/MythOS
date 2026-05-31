"""Local JSON bridge for the Streamlit combat iframe.

The combat UI runs inside a single iframe and talks to this localhost-only
server with fetch() calls. The server delegates all authority to
RuntimeSessionService/CombatService; it only maps JSON actions to PlayerAction
and returns compact combat state for client-side rendering.
"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse

from mythos_combat import PlayerAction
from mythos_memory import PostgresMythOSStore
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.session import RuntimeSessionService

_SERVER_LOCK = threading.Lock()
_SERVER: ThreadingHTTPServer | None = None
_SERVER_PORT: int | None = None


def ensure_combat_server() -> int:
    """Start the localhost combat bridge once and return its port."""
    global _SERVER, _SERVER_PORT
    with _SERVER_LOCK:
        if _SERVER is not None and _SERVER_PORT is not None:
            return _SERVER_PORT
        server = ThreadingHTTPServer(("127.0.0.1", 0), _CombatRequestHandler)
        _SERVER = server
        _SERVER_PORT = int(server.server_address[1])
        thread = threading.Thread(target=server.serve_forever, name="mythos-combat-server", daemon=True)
        thread.start()
        return _SERVER_PORT


def combat_action_response(
    service: RuntimeSessionService,
    loop_id: str,
    scenario_id: str,
    action_dict: dict[str, Any],
) -> dict[str, Any]:
    """Apply one combat action and return the new combat payload."""
    action = _player_action_from_dict(action_dict)
    snapshot = service.combat_action(loop_id, action, _combat_options(scenario_id))
    return _snapshot_response(service, snapshot.loop.loop_id, scenario_id, snapshot.combat, snapshot.scene.narration)


def combat_state_response(
    service: RuntimeSessionService,
    loop_id: str,
    scenario_id: str,
) -> dict[str, Any]:
    """Return the current active or finished combat payload without mutating it."""
    loop = service.store.get_loop(loop_id)
    if loop is None:
        raise RuntimeError(f"loop not found: {loop_id}")
    combat = service._combat_snapshot(loop, _combat_options(scenario_id))
    latest = service.store.get_latest_scene(loop_id)
    prose = latest.narration if latest is not None and latest.scene_type == "combat" else ""
    return _snapshot_response(service, loop_id, scenario_id, combat, prose)


def _snapshot_response(
    service: RuntimeSessionService,
    loop_id: str,
    scenario_id: str,
    combat: dict[str, Any] | None,
    prose: str,
) -> dict[str, Any]:
    loop = service.store.get_loop(loop_id)
    if loop is None:
        raise RuntimeError(f"loop not found: {loop_id}")
    if combat is None:
        raise RuntimeError(f"loop_id={loop_id} has no combat payload")
    state = loop.state if isinstance(loop.state, dict) else {}
    return {
        "ok": True,
        "loop_id": loop_id,
        "scenario_id": scenario_id,
        "combat": combat,
        "prose": prose,
        "inventory": _inventory_counts(state.get("_inventory", [])),
        "party": state.get("_party", {}),
        "loop_phase": loop.phase.value,
    }


def _combat_options(scenario_id: str) -> RuntimeOptions:
    return RuntimeOptions(
        fast_mode=True,
        fallback=True,
        with_image=False,
        scenario_id=scenario_id,
        visual_async=False,
        image_sync_fallback=False,
    )


def _player_action_from_dict(data: dict[str, Any]) -> PlayerAction:
    action_type = str(data.get("type", "wait"))
    move_to: tuple[int, int] | None = None
    if isinstance(data.get("move_to"), list | tuple) and len(data["move_to"]) == 2:
        move_to = (int(data["move_to"][0]), int(data["move_to"][1]))
    elif "x" in data and "y" in data:
        move_to = (int(data["x"]), int(data["y"]))
    return PlayerAction(
        type=action_type,
        target_id=str(data["target_id"]) if data.get("target_id") else None,
        weapon_id=str(data["weapon_id"]) if data.get("weapon_id") else None,
        move_to=move_to,
        item_id=str(data["item_id"]) if data.get("item_id") else None,
        skill_id=str(data["skill_id"]) if data.get("skill_id") else None,
    )


def _inventory_counts(raw_inventory: Any) -> dict[str, dict[str, Any]]:
    counts: dict[str, dict[str, Any]] = {}
    if not isinstance(raw_inventory, list):
        return counts
    for entry in raw_inventory:
        if isinstance(entry, dict):
            item_id = str(entry.get("id", ""))
            name = str(entry.get("name", item_id))
        else:
            item_id = str(entry)
            name = item_id
        if not item_id:
            continue
        current = counts.setdefault(item_id, {"id": item_id, "name": name, "count": 0})
        current["count"] = int(current["count"]) + 1
    return counts


class _CombatRequestHandler(BaseHTTPRequestHandler):
    server_version = "MythOSCombatBridge/1.0"

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send_json({"ok": True})

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/combat/state":
            self._send_json({"ok": False, "error": "not found"}, status=404)
            return
        params = parse_qs(parsed.query)
        self._with_service(
            lambda service: combat_state_response(
                service,
                _single_param(params, "loop_id"),
                _single_param(params, "scenario_id", "neo-seoul"),
            )
        )

    def do_POST(self) -> None:  # noqa: N802
        if urlparse(self.path).path != "/combat/action":
            self._send_json({"ok": False, "error": "not found"}, status=404)
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            data = json.loads(raw)
            if not isinstance(data, dict):
                raise ValueError("request body must be a JSON object")
        except Exception as exc:
            self._send_json({"ok": False, "error": str(exc)}, status=400)
            return
        self._with_service(
            lambda service: combat_action_response(
                service,
                str(data.get("loop_id", "")),
                str(data.get("scenario_id", "neo-seoul")),
                data.get("action", {}) if isinstance(data.get("action"), dict) else {},
            )
        )

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        return

    def _with_service(self, fn) -> None:
        store = PostgresMythOSStore()
        try:
            service = RuntimeSessionService(store)
            payload = fn(service)
            self._send_json(payload)
        except Exception as exc:
            self._send_json({"ok": False, "error": str(exc)}, status=500)
        finally:
            store.close()

    def _send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def _single_param(params: dict[str, list[str]], key: str, default: str = "") -> str:
    values = params.get(key)
    if not values:
        return default
    return values[0]
