"""Unit tests for the FastAPI adapter (P3 Web UI decoupling, first slice).

Uses Starlette's TestClient with an in-memory store injected via FastAPI's
dependency override, so no Postgres or Ollama is required. The narrative path
runs in fallback mode (canned scenes); combat uses the deterministic fallback
encounter, mirroring tests/test_combat_server.py.
"""

from __future__ import annotations

import sys
import unittest
from collections.abc import Iterator
from pathlib import Path
from typing import Any, cast

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from test_session_combat import _InMemoryStore, _seed_loop

from mythos_api.app import create_app
from mythos_api.service import get_service
from mythos_runtime.session import RuntimeSessionService


def _client(store: _InMemoryStore) -> TestClient:
    app = create_app()

    def _override() -> Iterator[RuntimeSessionService]:
        yield RuntimeSessionService(store, director=None)

    app.dependency_overrides[get_service] = _override
    return TestClient(app)


class ApiHealthTest(unittest.TestCase):
    def test_health_ok(self) -> None:
        client = _client(_InMemoryStore())
        response = client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})


class ApiNarrativeFlowTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.client = _client(self.store)

    def test_connect_creates_player(self) -> None:
        response = self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_api"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["player_id"], "player_api")
        self.assertEqual(body["display_name"], "테스터")

    def test_begin_loop_returns_snapshot(self) -> None:
        self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_api"},
        )
        response = self.client.post(
            "/api/v1/loops/begin",
            json={"player_id": "player_api", "fallback": True},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["loop_id"].startswith("loop_"))
        # The fallback first scene advances CONNECT -> EXPLORE on apply.
        self.assertEqual(body["phase"], "explore")
        self.assertIn("active_scene", body)
        self.assertIn("narration", body["active_scene"])
        self.assertIsInstance(body["active_scene"]["choices"], list)

    def test_choose_advances_snapshot(self) -> None:
        self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_api"},
        )
        begin = self.client.post(
            "/api/v1/loops/begin",
            json={"player_id": "player_api", "fallback": True},
        ).json()
        loop_id = begin["loop_id"]
        first_choice = begin["active_scene"]["choices"][0]["choice_id"]

        response = self.client.post(
            "/api/v1/loops/choose",
            json={"loop_id": loop_id, "choice_id": first_choice, "fallback": True},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["loop_id"], loop_id)
        self.assertGreaterEqual(body["active_scene"]["turn_index"], 1)

    def test_begin_loop_missing_player_is_not_found(self) -> None:
        response = self.client.post(
            "/api/v1/loops/begin",
            json={"player_id": "ghost", "fallback": True},
        )
        self.assertEqual(response.status_code, 404)


def _drain_to_snapshot(ws: Any) -> dict[str, Any]:
    frame = ws.receive_json()
    while frame["type"] == "token":
        frame = ws.receive_json()
    return cast(dict[str, Any], frame)


class ApiStreamTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.client = _client(self.store)
        self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_ws"},
        )

    def test_begin_streams_token_then_snapshot(self) -> None:
        with self.client.websocket_connect("/api/v1/loops/stream") as ws:
            ws.send_json({"event": "begin", "player_id": "player_ws", "fallback": True})
            first = ws.receive_json()
            self.assertEqual(first["type"], "token")
            self.assertTrue(first["content"])
            snapshot = _drain_to_snapshot(ws)
            self.assertEqual(snapshot["type"], "snapshot")
            self.assertTrue(snapshot["data"]["loop_id"].startswith("loop_"))

    def test_choose_streams_on_same_socket(self) -> None:
        with self.client.websocket_connect("/api/v1/loops/stream") as ws:
            ws.send_json({"event": "begin", "player_id": "player_ws", "fallback": True})
            begin = _drain_to_snapshot(ws)
            loop_id = begin["data"]["loop_id"]
            choice_id = begin["data"]["active_scene"]["choices"][0]["choice_id"]

            ws.send_json(
                {"event": "choose", "loop_id": loop_id, "choice_id": choice_id, "fallback": True}
            )
            advanced = _drain_to_snapshot(ws)
            self.assertEqual(advanced["data"]["loop_id"], loop_id)
            self.assertGreaterEqual(advanced["data"]["active_scene"]["turn_index"], 1)

    def test_unknown_event_returns_error(self) -> None:
        with self.client.websocket_connect("/api/v1/loops/stream") as ws:
            ws.send_json({"event": "nope"})
            frame = ws.receive_json()
            self.assertEqual(frame["type"], "error")

    def test_begin_missing_player_returns_error(self) -> None:
        with self.client.websocket_connect("/api/v1/loops/stream") as ws:
            ws.send_json({"event": "begin", "player_id": "ghost", "fallback": True})
            frame = ws.receive_json()
            self.assertEqual(frame["type"], "error")


class ApiCombatFlowTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.client = _client(self.store)
        self.loop_id = _seed_loop(self.store, "player_combat", "비접속자 (Ghost)")

    def test_combat_begin_returns_active_payload(self) -> None:
        response = self.client.post(
            "/api/v1/combat/begin",
            json={"loop_id": self.loop_id, "encounter_id": "patrol_ambush"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["ok"])
        self.assertIn("radar", body["combat"])
        self.assertFalse(body["combat"]["finished"])

    def test_combat_action_applies_skill(self) -> None:
        self.client.post(
            "/api/v1/combat/begin",
            json={"loop_id": self.loop_id, "encounter_id": "patrol_ambush"},
        )
        response = self.client.post(
            "/api/v1/combat/action",
            json={"loop_id": self.loop_id, "action": {"type": "skill", "skill_id": "packet_shot"}},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["ok"])
        self.assertIn("combat", body)


if __name__ == "__main__":
    unittest.main()
