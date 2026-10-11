"""Operator dashboard: ``/api/v2/admin/overview`` access control, aggregation and the ``/admin`` page —
memory store + fake token verifier, no network."""

from __future__ import annotations

import unittest
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient

from mythos_api.app import create_app
from mythos_v2.api import V2Settings, create_v2_router
from mythos_v2.auth import (
    AuthConfig,
    CertsUnavailableError,
    Identity,
    TokenError,
    parse_admin_emails,
)
from mythos_v2.daily import DailyResult, today_kst
from mythos_v2.store import MemoryV2Store

ADMIN_EMAIL = "Owner@Example.com"
NOW = datetime.now(UTC)  # stores stamp rows with the real clock, so the router clock must agree
TODAY = today_kst(NOW)


class AdminVerifier:
    """``good:<uid>`` (no email) · ``admin`` · ``unverified`` · ``other`` · ``down``."""

    def verify(self, token: str) -> str:
        return self.verify_identity(token).uid

    def verify_identity(self, token: str) -> Identity:
        if token == "down":
            raise CertsUnavailableError("down")
        if token == "admin":
            return Identity("uid-admin", ADMIN_EMAIL.lower(), True)
        if token == "unverified":
            return Identity("uid-admin", ADMIN_EMAIL.lower(), False)
        if token == "other":
            return Identity("uid-other", "someone@example.com", True)
        if token.startswith("good:"):
            return Identity(token[5:])
        raise TokenError("bad signature")


def _client(
    store: MemoryV2Store,
    *,
    admin_emails: str = ADMIN_EMAIL,
    admin_open: bool = False,
    mode: str = "google",
    verifier: Any = None,
) -> TestClient:
    app = FastAPI()
    app.include_router(
        create_v2_router(
            store_factory=lambda: store,
            llm_factory=lambda: None,
            settings=V2Settings(),
            auth=AuthConfig(
                mode="google" if mode == "google" else "open",
                project_id="demo-mythos",
                admin_emails=parse_admin_emails(admin_emails),
                admin_open=admin_open,
            ),
            verifier=verifier or AdminVerifier(),
            now=lambda: NOW,
        )
    )
    return TestClient(app)


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _seed(store: MemoryV2Store) -> None:
    store.put_save(
        "g_" + "a" * 32,
        "profile",
        {
            "playerName": "Nova",
            "loops": 5,
            "wins": 2,
            "bestAct": 3,
            "totalEchoes": 120,
            "paradoxUnlocked": 1,
            "unlocks": ["a", "b", "c"],
            "endingsSeen": ["x"],
        },
    )
    store.put_save(
        "g_" + "a" * 32,
        "run",
        {
            "archetype": "ghost",
            "act": 2,
            "paradox": 1,
            "hp": 31,
            "maxHp": 60,
            "tally": {"floors": 7},
        },
    )
    store.put_save("g_" + "b" * 32, "profile", {"playerName": "<b>x</b>", "loops": 1})
    for rid, player, result, act, killed in [
        ("r1", "g_" + "a" * 32, "victory", 3, ""),
        ("r2", "g_" + "a" * 32, "defeat", 2, "drone_swarm"),
        ("r3", "g_" + "b" * 32, "defeat", 1, "drone_swarm"),
        ("r4", "g_" + "b" * 32, "abandoned", 1, ""),
    ]:
        store.append_history(
            player,
            rid,
            {
                "id": rid,
                "result": result,
                "archetype": "ghost" if rid != "r3" else "breaker",
                "act": act,
                "floors": 10 if result == "victory" else 4,
                "echoes": 9,
                "endingId": "end_a" if result == "victory" else "",
                "killedBy": killed,
                "daily": TODAY.isoformat() if rid == "r1" else None,
            },
        )
    store.submit_daily(
        TODAY,
        "g_" + "a" * 32,
        "Nova",
        DailyResult("ghost", True, 3, 12, 5, 40, 600),
    )


class AdminAccessTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = MemoryV2Store()
        _seed(self.store)
        self.client = _client(self.store)
        self.url = "/api/v2/admin/overview"

    def test_no_token_is_401(self) -> None:
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.headers.get("www-authenticate"), "Bearer")

    def test_bad_token_is_401(self) -> None:
        self.assertEqual(self.client.get(self.url, headers=bearer("nope")).status_code, 401)

    def test_x_player_id_never_grants_admin(self) -> None:
        res = self.client.get(self.url, headers={"X-Player-Id": "player_0123456789"})
        self.assertEqual(res.status_code, 401)

    def test_signed_in_non_admin_is_403(self) -> None:
        for token in ("other", "good:uid-1", "unverified"):
            with self.subTest(token=token):
                self.assertEqual(self.client.get(self.url, headers=bearer(token)).status_code, 403)

    def test_certs_down_is_503(self) -> None:
        self.assertEqual(self.client.get(self.url, headers=bearer("down")).status_code, 503)

    def test_empty_allow_list_admits_nobody(self) -> None:
        client = _client(self.store, admin_emails="")
        self.assertEqual(client.get(self.url, headers=bearer("admin")).status_code, 403)

    def test_allow_list_is_case_insensitive_and_admin_gets_data(self) -> None:
        res = self.client.get(self.url, headers=bearer("admin"))
        self.assertEqual(res.status_code, 200, res.text)
        self.assertIn("totals", res.json())

    def test_a_verifier_without_identity_support_is_403(self) -> None:
        class IdOnly:
            def verify(self, token: str) -> str:
                return "uid"

        client = _client(self.store, verifier=IdOnly())
        self.assertEqual(client.get(self.url, headers=bearer("admin")).status_code, 403)

    def test_open_mode_needs_the_dev_flag(self) -> None:
        closed = _client(self.store, mode="open")
        self.assertEqual(closed.get(self.url).status_code, 401)
        dev = _client(self.store, mode="open", admin_open=True)
        self.assertEqual(dev.get(self.url).status_code, 200)

    def test_days_is_bounded(self) -> None:
        for days in (0, 61):
            res = self.client.get(self.url, params={"days": days}, headers=bearer("admin"))
            self.assertEqual(res.status_code, 422)


class AdminOverviewTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = MemoryV2Store()
        _seed(self.store)
        self.client = _client(self.store)
        res = self.client.get("/api/v2/admin/overview?days=7", headers=bearer("admin"))
        self.assertEqual(res.status_code, 200, res.text)
        self.data = res.json()

    def test_totals(self) -> None:
        t = self.data["totals"]
        self.assertEqual((t["players"], t["signed_in"], t["anonymous"]), (2, 2, 0))
        self.assertEqual(t["with_active_run"], 1)
        self.assertEqual(t["runs_started"], 6)
        self.assertEqual(t["wins_lifetime"], 2)
        self.assertEqual(
            (t["finished_in_window"], t["victories_in_window"], t["defeats_in_window"]),
            (4, 1, 2),
        )
        self.assertEqual(t["abandoned_in_window"], 1)
        self.assertAlmostEqual(t["win_rate_in_window"], 0.333, places=3)

    def test_per_day_covers_the_window_and_today_holds_the_runs(self) -> None:
        rows = self.data["per_day"]
        self.assertEqual(len(rows), 7)
        self.assertEqual(rows[-1]["day"], TODAY.isoformat())
        self.assertEqual(rows[0]["runs"], 0)
        today = rows[-1]
        self.assertEqual(
            (today["runs"], today["wins"], today["defeats"], today["abandoned"]), (4, 1, 2, 1)
        )
        self.assertEqual((today["players"], today["daily_runs"], today["daily_players"]), (2, 1, 1))

    def test_archetypes_deaths_endings(self) -> None:
        ghost = next(a for a in self.data["archetypes"] if a["id"] == "ghost")
        self.assertEqual((ghost["runs"], ghost["wins"], ghost["defeats"]), (3, 1, 1))
        self.assertEqual(self.data["deaths"]["killed_by"], [{"id": "drone_swarm", "count": 2}])
        self.assertEqual(self.data["deaths"]["by_act"], {"1": 1, "2": 1})
        self.assertEqual(self.data["endings"], [{"id": "end_a", "count": 1}])

    def test_players_are_pseudonymous_and_sorted(self) -> None:
        players = self.data["players"]
        self.assertEqual({p["ref"] for p in players}, {"g_aaaaaaaa", "g_bbbbbbbb"})
        nova = next(p for p in players if p["ref"] == "g_aaaaaaaa")
        self.assertEqual(nova["name"], "Nova")
        self.assertEqual(
            (nova["runs"], nova["wins"], nova["unlocks"], nova["endings"]), (5, 2, 3, 1)
        )
        self.assertEqual(nova["active_run"]["archetype"], "ghost")
        self.assertEqual((nova["active_run"]["act"], nova["active_run"]["floors"]), (2, 7))
        self.assertNotIn("email", str(self.data).lower())

    def test_daily_board_today(self) -> None:
        board = self.data["daily_today"]
        self.assertEqual(len(board), 1)
        self.assertEqual(board[0]["archetype"], "ghost")
        self.assertEqual(board[0]["top"][0]["name"], "Nova")

    def test_server_block_counts_gm_calls(self) -> None:
        server = self.data["server"]
        self.assertEqual((server["auth"], server["store"]), ("google", "memory"))
        self.assertEqual(server["gm_stats"]["total"], 0)


class AdminPageTest(unittest.TestCase):
    def test_page_is_served_no_store_and_unindexed(self) -> None:
        client = TestClient(create_app())
        res = client.get("/admin")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/html", res.headers["content-type"])
        self.assertEqual(res.headers["cache-control"], "no-store")
        self.assertIn("noindex", res.headers["x-robots-tag"])
        self.assertIn("운영 대시보드", res.text)


class ParseAdminEmailsTest(unittest.TestCase):
    def test_parse(self) -> None:
        self.assertEqual(
            parse_admin_emails(" A@x.com, b@y.com  c@z.com ,,nope"),
            frozenset({"a@x.com", "b@y.com", "c@z.com"}),
        )
        self.assertEqual(parse_admin_emails(None), frozenset())


if __name__ == "__main__":
    unittest.main()
