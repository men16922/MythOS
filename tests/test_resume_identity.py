"""Regression tests for the T1 identity-swap bug (CBT feedback #3).

A live tester's session silently flipped identity (이용재 → 테스터) mid-loop.
Diagnosis: ``GET /api/v1/loops/active`` resumed by ``loop_id`` without checking
that the loop belongs to the requesting ``player_id`` — the returned snapshot's
``player`` is the *loop owner*, so a stale/foreign loop_id (e.g. from another
identity's localStorage token on a shared browser) swapped both the loop and
the displayed identity. These tests pin the ownership contract: a foreign
loop_id must be rejected, never served under the wrong identity.
"""

from __future__ import annotations

import sys
import unittest
from collections.abc import Iterator
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from test_session_combat import _InMemoryStore

from mythos_api.app import create_app
from mythos_api.service import get_service
from mythos_runtime.session import RuntimeSessionService


def _client(store: _InMemoryStore) -> TestClient:
    app = create_app()

    def _override() -> Iterator[RuntimeSessionService]:
        yield RuntimeSessionService(store, director=None)

    app.dependency_overrides[get_service] = _override
    return TestClient(app)


class ResumeIdentityTest(unittest.TestCase):
    """Two players, one loop each — resume must never cross identities."""

    def setUp(self) -> None:
        self.client = _client(_InMemoryStore())
        self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "이용재", "player_id": "player_a"},
        )
        self.client.post(
            "/api/v1/auth/connect",
            json={"display_name": "테스터", "player_id": "player_b"},
        )
        self.loop_a = self.client.post(
            "/api/v1/loops/begin", json={"player_id": "player_a", "fallback": True}
        ).json()["loop_id"]
        self.loop_b = self.client.post(
            "/api/v1/loops/begin", json={"player_id": "player_b", "fallback": True}
        ).json()["loop_id"]

    def test_foreign_loop_id_is_rejected_not_identity_swapped(self) -> None:
        # The exact live-bug shape: player A's session resumes with player B's
        # loop_id. Serving it would flip the header/narrative identity to B.
        response = self.client.get(f"/api/v1/loops/active?player_id=player_a&loop_id={self.loop_b}")
        self.assertEqual(response.status_code, 404)
        # Regardless of status handling, B's identity must never leak into A's session.
        if response.status_code == 200:  # pragma: no cover - documents the old bug
            self.fail(f"identity swap: {response.json()['player']}")

    def test_owned_loop_id_resumes_that_loop(self) -> None:
        response = self.client.get(f"/api/v1/loops/active?player_id=player_a&loop_id={self.loop_a}")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["loop_id"], self.loop_a)
        self.assertEqual(body["player"]["player_id"], "player_a")
        self.assertEqual(body["player"]["display_name"], "이용재")

    def test_player_fallback_resume_stays_within_own_identity(self) -> None:
        # Legacy resume tokens carry no loop_id; the player fallback must still
        # work and must serve only the requesting player's own loop.
        self.client.post("/api/v1/save-slots", json={"loop_id": self.loop_a, "label": "bookmark"})
        response = self.client.get("/api/v1/loops/active?player_id=player_a")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["player"]["player_id"], "player_a")
        self.assertEqual(body["loop_id"], self.loop_a)

    def test_unknown_loop_id_is_not_found(self) -> None:
        response = self.client.get("/api/v1/loops/active?player_id=player_a&loop_id=loop_missing")
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
