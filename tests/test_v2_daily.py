"""Daily-seed leaderboard: the ordering (mirror of engine/daily.ts isBetterDaily), name cleaning, KST
date windows, and PUT/GET /api/v2/daily/{date} — validation, keep-best, rank/total/me, rate limit and
the sign-in rules. Memory store + fake verifier + fixed clock; no network."""

from __future__ import annotations

import random
import unittest
from datetime import UTC, date, datetime
from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient

from mythos_v2 import daily
from mythos_v2.api import V2Settings, create_v2_router
from mythos_v2.auth import AuthConfig, AuthMode, TokenError
from mythos_v2.daily import (
    DailyResult,
    clean_name,
    in_window,
    is_better_daily,
    parse_day,
    today_kst,
)
from mythos_v2.store import MemoryV2Store

# 2026-10-11 09:30 KST
NOW = datetime(2026, 10, 11, 0, 30, tzinfo=UTC)
TODAY = "2026-10-11"


def res(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "archetype": "ghost",
        "won": False,
        "act": 2,
        "floors": 10,
        "echoes": 30,
        "kills": 12,
        "secs": 900,
    }
    base.update(overrides)
    return {k: v for k, v in base.items() if v is not None}


def dr(**overrides: Any) -> DailyResult:
    return DailyResult(**res(**overrides))


class FakeVerifier:
    def verify(self, token: str) -> str:
        if token.startswith("good:"):
            return token[5:]
        raise TokenError("bad signature")


def pid(n: int) -> dict[str, str]:
    return {"X-Player-Id": f"player_{n:012d}"}


def client(*, mode: AuthMode = "open", now: datetime = NOW, **settings: Any) -> TestClient:
    app = FastAPI()
    app.include_router(
        create_v2_router(
            store_factory=MemoryV2Store,
            llm_factory=lambda: None,
            settings=V2Settings(**settings),
            auth=AuthConfig(mode=mode, project_id="demo-mythos"),
            verifier=FakeVerifier(),
            now=lambda: now,
        )
    )
    return TestClient(app)


# --- pure ---------------------------------------------------------------------------------------------------


class OrderingTest(unittest.TestCase):
    def test_score_agrees_with_is_better_daily(self) -> None:
        rng = random.Random(7)
        pool = [
            DailyResult(
                archetype="ghost",
                won=rng.random() < 0.3,
                act=rng.randint(1, 3),
                floors=rng.choice([0, 1, 40, 79, 80]),
                echoes=rng.choice([0, 5, 998, 999]),
                kills=rng.choice([0, 1, 999]),
                secs=rng.choice([None, 1, 2, 600, 86_399, 86_400]),
            )
            for _ in range(300)
        ]
        for a in pool:
            for b in pool[:60]:
                self.assertEqual(is_better_daily(a, b), a.score > b.score, (a, b))
        self.assertTrue(is_better_daily(pool[0], None))

    def test_key_precedence(self) -> None:
        # each key dominates everything after it
        self.assertGreater(
            dr(won=True, act=1, floors=0).score, dr(won=False, act=3, floors=80).score
        )
        self.assertGreater(dr(act=3, floors=0).score, dr(act=2, floors=80).score)
        self.assertGreater(dr(floors=11, echoes=0).score, dr(floors=10, echoes=999).score)
        self.assertGreater(dr(echoes=31, kills=0).score, dr(echoes=30, kills=999).score)
        self.assertGreater(dr(kills=13, secs=86_400).score, dr(kills=12, secs=1).score)
        # faster is better; missing secs is the worst
        self.assertGreater(dr(secs=899).score, dr(secs=900).score)
        self.assertGreater(dr(secs=86_400).score, dr(secs=None).score)
        self.assertEqual(dr(secs=None).score, dr(secs=None).score)
        self.assertFalse(is_better_daily(dr(), dr()))

    def test_to_dict_omits_missing_secs(self) -> None:
        self.assertNotIn("secs", dr(secs=None).to_dict())
        self.assertEqual(dr().to_dict(), res())


class NameTest(unittest.TestCase):
    def test_clean_name(self) -> None:
        cases = {
            "  세린  ": "세린",
            "a\nb\r\nc\td": "a b c d",
            "x\u0000y\u0007z": "xyz",
            "rtl‮evil": "rtlevil",
            "zero​width": "zerowidth",
            "many     spaces   here": "many spaces here",
            "line sep": "line sep",
            "": "익명",
            "   \n\t ": "익명",
            "\u0000\u0001": "익명",
            "가나다라마바사아자차카타파하가나다라": "가나다라마바사아자차카타파하가나",
            "abcdefghijklmno pqrs": "abcdefghijklmno",
        }
        for raw, want in cases.items():
            with self.subTest(raw=raw):
                self.assertEqual(clean_name(raw), want)
                self.assertLessEqual(len(clean_name(raw)), 16)
        self.assertEqual(clean_name(None), "익명")


class DateTest(unittest.TestCase):
    def test_today_is_kst(self) -> None:
        self.assertEqual(
            today_kst(datetime(2026, 10, 10, 14, 59, 59, tzinfo=UTC)), date(2026, 10, 10)
        )
        self.assertEqual(
            today_kst(datetime(2026, 10, 10, 15, 0, 0, tzinfo=UTC)), date(2026, 10, 11)
        )

    def test_parse_day(self) -> None:
        self.assertEqual(parse_day("2026-10-11"), date(2026, 10, 11))
        self.assertEqual(parse_day("2028-02-29"), date(2028, 2, 29))
        for bad in (
            "2026-02-30",
            "2027-02-29",
            "20261011",
            "2026-1-01",
            "2026-10-11T00:00",
            "",
            "x",
        ):
            with self.subTest(bad=bad):
                self.assertIsNone(parse_day(bad))

    def test_window(self) -> None:
        today = date(2026, 10, 11)
        self.assertTrue(in_window(date(2026, 10, 11), today, 2))
        self.assertTrue(in_window(date(2026, 10, 10), today, 2))
        self.assertFalse(in_window(date(2026, 10, 9), today, 2))
        self.assertFalse(in_window(date(2026, 10, 12), today, 2))
        self.assertTrue(in_window(date(2026, 9, 12), today, 30))
        self.assertFalse(in_window(date(2026, 9, 11), today, 30))


# --- API ----------------------------------------------------------------------------------------------------


class SubmitValidationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = client()

    def put(self, result: dict[str, Any], *, day: str = TODAY, name: Any = "Ghost") -> Any:
        return self.client.put(
            f"/api/v2/daily/{day}", headers=pid(1), json={"name": name, "result": result}
        )

    def test_valid_submit(self) -> None:
        out = self.put(res())
        self.assertEqual(out.status_code, 200, out.text)
        self.assertEqual(out.json(), {"rank": 1, "total": 1, "best": res(), "improved": True})

    def test_result_ranges_and_types(self) -> None:
        bad: list[dict[str, Any]] = [
            {"archetype": "Ghost"},
            {"archetype": "ghost-1"},
            {"archetype": ""},
            {"archetype": "a" * 33},
            {"archetype": 7},
            {"won": 1},
            {"won": "true"},
            {"act": 0},
            {"act": 4},
            {"act": "2"},
            {"act": True},
            {"act": 2.0},
            {"floors": -1},
            {"floors": 81},
            {"echoes": 1000},
            {"kills": -1},
            {"kills": 1000},
            {"secs": 0},
            {"secs": 86_401},
            {"secs": 12.5},
        ]
        for override in bad:
            with self.subTest(override=override):
                self.assertEqual(self.put({**res(), **override}).status_code, 422)
        for missing in ("archetype", "won", "act", "floors", "echoes", "kills"):
            with self.subTest(missing=missing):
                body = {k: v for k, v in res().items() if k != missing}
                self.assertEqual(self.put(body).status_code, 422)
        self.assertEqual(
            self.client.put(
                f"/api/v2/daily/{TODAY}", headers=pid(1), json={"name": "x"}
            ).status_code,
            422,
        )

    def test_edges_and_extra_keys(self) -> None:
        edge = res(act=3, floors=80, echoes=999, kills=999, secs=86_400, won=True)
        self.assertEqual(self.put(edge).status_code, 200)
        no_secs = self.put({**res(archetype="smuggler", secs=None), "attempts": 3, "seed": 1})
        self.assertEqual(no_secs.status_code, 200)
        self.assertEqual(no_secs.json()["best"], res(archetype="smuggler", secs=None))

    def test_name_is_sanitised(self) -> None:
        board = lambda: self.client.get(f"/api/v2/daily/{TODAY}?archetype=ghost").json()  # noqa: E731
        self.put(res(), name="  세린\n\u0000의   그림자  ")
        self.assertEqual(board()["entries"][0]["name"], "세린 의 그림자")
        self.put(res(), name="")
        self.assertEqual(board()["entries"][0]["name"], "익명")
        self.put(res(), name=None)
        self.assertEqual(board()["entries"][0]["name"], "익명")
        self.put(res(), name="x" * 40)
        self.assertEqual(board()["entries"][0]["name"], "x" * 16)
        self.assertEqual(self.put(res(), name="x" * 201).status_code, 422)

    def test_submit_date_window_is_today_and_yesterday_kst(self) -> None:
        self.assertEqual(self.put(res(), day="2026-10-11").status_code, 200)
        self.assertEqual(self.put(res(), day="2026-10-10").status_code, 200)
        for day in ("2026-10-09", "2026-10-12", "2026-02-30", "20261011", "today"):
            with self.subTest(day=day):
                out = self.put(res(), day=day)
                self.assertEqual(out.status_code, 422)
                self.assertIsInstance(out.json()["detail"], str)

    def test_kst_midnight_boundary(self) -> None:
        before = client(now=datetime(2026, 10, 10, 14, 59, tzinfo=UTC))  # 23:59 KST on the 10th
        after = client(now=datetime(2026, 10, 10, 15, 0, tzinfo=UTC))  # 00:00 KST on the 11th
        body = {"name": "a", "result": res()}
        self.assertEqual(
            before.put("/api/v2/daily/2026-10-11", headers=pid(1), json=body).status_code, 422
        )
        self.assertEqual(
            before.put("/api/v2/daily/2026-10-09", headers=pid(1), json=body).status_code, 200
        )
        self.assertEqual(
            after.put("/api/v2/daily/2026-10-11", headers=pid(1), json=body).status_code, 200
        )
        self.assertEqual(
            after.put("/api/v2/daily/2026-10-09", headers=pid(1), json=body).status_code, 422
        )

    def test_write_rate_limit(self) -> None:
        limited = client(daily_per_minute=2)
        body = {"name": "a", "result": res()}
        for _ in range(2):
            self.assertEqual(
                limited.put(f"/api/v2/daily/{TODAY}", headers=pid(1), json=body).status_code, 200
            )
        self.assertEqual(
            limited.put(f"/api/v2/daily/{TODAY}", headers=pid(1), json=body).status_code, 429
        )
        # per player
        self.assertEqual(
            limited.put(f"/api/v2/daily/{TODAY}", headers=pid(2), json=body).status_code, 200
        )


class BoardTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = client()

    def put(
        self, n: int, result: dict[str, Any], name: str | None = None, day: str = TODAY
    ) -> dict[str, Any]:
        out = self.client.put(
            f"/api/v2/daily/{day}", headers=pid(n), json={"name": name or f"p{n}", "result": result}
        )
        self.assertEqual(out.status_code, 200, out.text)
        data: dict[str, Any] = out.json()
        return data

    def board(
        self, archetype: str = "ghost", *, headers: dict[str, str] | None = None, **params: Any
    ) -> dict[str, Any]:
        out = self.client.get(
            f"/api/v2/daily/{params.pop('day', TODAY)}",
            params={"archetype": archetype, **params},
            headers=headers or {},
        )
        self.assertEqual(out.status_code, 200, out.text)
        data: dict[str, Any] = out.json()
        return data

    def test_ordering_matches_is_better_daily(self) -> None:
        self.put(1, res(won=False, act=3, floors=30))
        self.put(2, res(won=True, act=3, floors=26, secs=None))
        self.put(3, res(won=True, act=3, floors=26, secs=1500))
        self.put(4, res(won=True, act=3, floors=26, secs=1200))
        self.put(5, res(act=2, floors=20, echoes=50))
        self.put(6, res(act=2, floors=20, echoes=50, kills=13))
        self.put(
            7, res(act=2, floors=20, echoes=50, kills=13)
        )  # exact tie with 6: first achieved wins
        names = [e["name"] for e in self.board()["entries"]]
        self.assertEqual(names, ["p4", "p3", "p2", "p1", "p6", "p7", "p5"])
        ranks = [e["rank"] for e in self.board()["entries"]]
        self.assertEqual(ranks, list(range(1, 8)))

    def test_keep_best(self) -> None:
        first = self.put(1, res(floors=20), name="first")
        self.assertTrue(first["improved"])
        worse = self.put(1, res(floors=5), name="renamed")
        self.assertFalse(worse["improved"])
        self.assertEqual(worse["best"], res(floors=20))
        entry = self.board()["entries"][0]
        self.assertEqual((entry["name"], entry["result"]), ("renamed", res(floors=20)))
        better = self.put(1, res(floors=21))
        self.assertTrue(better["improved"])
        self.assertEqual(better["best"], res(floors=21))
        self.assertEqual(self.board()["total"], 1)

    def test_equal_resubmit_keeps_first_achieved_time(self) -> None:
        self.put(1, res())
        self.put(2, res())
        again = self.put(1, res())
        self.assertFalse(again["improved"])
        self.assertEqual(again["rank"], 1)
        # player 2 re-submitting the same result does not jump ahead either
        self.assertEqual(self.put(2, res())["rank"], 2)

    def test_rank_total_and_me(self) -> None:
        for n in range(1, 31):
            out = self.put(n, res(floors=n))
            self.assertEqual(out["total"], n)
            self.assertEqual(out["rank"], 1)  # each newcomer has more floors than everyone before
        top = self.board(limit=5, headers=pid(3))
        self.assertEqual(top["total"], 30)
        self.assertEqual(top["date"], TODAY)
        self.assertEqual(top["archetype"], "ghost")
        self.assertEqual([e["name"] for e in top["entries"]], ["p30", "p29", "p28", "p27", "p26"])
        self.assertFalse(any(e["me"] for e in top["entries"]))
        self.assertEqual(top["me"], {"rank": 28, "name": "p3", "result": res(floors=3)})
        mine = self.board(limit=5, headers=pid(28))
        self.assertEqual([e["me"] for e in mine["entries"]], [False, False, True, False, False])
        self.assertEqual(mine["me"]["rank"], 3)
        self.assertEqual(len(self.board()["entries"]), 20)  # default limit
        self.assertIsNone(self.board()["me"])
        self.assertIsNone(self.board(headers=pid(99))["me"])
        # a malformed or reserved X-Player-Id on the public read is just anonymous
        self.assertIsNone(self.board(headers={"X-Player-Id": "bad id"})["me"])

    def test_boards_are_per_date_and_archetype(self) -> None:
        self.put(1, res())
        self.put(2, res(archetype="smuggler"))
        self.put(3, res(), day="2026-10-10")
        self.assertEqual(self.board()["total"], 1)
        self.assertEqual(self.board("smuggler")["total"], 1)
        self.assertEqual(self.board(day="2026-10-10")["total"], 1)
        self.assertEqual(self.board("echo_collector")["total"], 0)
        self.assertEqual(self.board("echo_collector")["entries"], [])

    def test_read_validation(self) -> None:
        get = self.client.get
        self.assertEqual(get(f"/api/v2/daily/{TODAY}").status_code, 422)  # archetype required
        self.assertEqual(get(f"/api/v2/daily/{TODAY}?archetype=Ghost").status_code, 422)
        self.assertEqual(get(f"/api/v2/daily/{TODAY}?archetype=ghost&limit=0").status_code, 422)
        self.assertEqual(get(f"/api/v2/daily/{TODAY}?archetype=ghost&limit=51").status_code, 422)
        self.assertEqual(get(f"/api/v2/daily/{TODAY}?archetype=ghost&limit=50").status_code, 200)
        # the last 30 days (KST) are readable
        self.assertEqual(get("/api/v2/daily/2026-09-12?archetype=ghost").status_code, 200)
        for day in ("2026-09-11", "2026-10-12", "2026-13-01", "nope"):
            with self.subTest(day=day):
                self.assertEqual(get(f"/api/v2/daily/{day}?archetype=ghost").status_code, 422)


class SignInTest(unittest.TestCase):
    def test_google_mode(self) -> None:
        c = client(mode="google")
        body = {"name": "g", "result": res()}
        no_token = c.put(f"/api/v2/daily/{TODAY}", headers=pid(1), json=body)
        self.assertEqual(no_token.status_code, 401)
        self.assertEqual(no_token.json(), {"detail": "sign-in required"})
        # the identity check comes before body validation
        bad_body = c.put(f"/api/v2/daily/{TODAY}", json={"result": {}})
        self.assertEqual(bad_body.status_code, 401)
        bad_token = {"Authorization": "Bearer forged"}
        self.assertEqual(
            c.put(f"/api/v2/daily/{TODAY}", headers=bad_token, json=body).status_code, 401
        )
        ok = c.put(f"/api/v2/daily/{TODAY}", headers={"Authorization": "Bearer good:u1"}, json=body)
        self.assertEqual(ok.status_code, 200)
        # reads are public; `me` only for a verified token (X-Player-Id is ignored in google mode)
        anon = c.get(f"/api/v2/daily/{TODAY}?archetype=ghost")
        self.assertEqual(anon.status_code, 200)
        self.assertIsNone(anon.json()["me"])
        self.assertIsNone(
            c.get(f"/api/v2/daily/{TODAY}?archetype=ghost", headers=pid(1)).json()["me"]
        )
        me = c.get(
            f"/api/v2/daily/{TODAY}?archetype=ghost", headers={"Authorization": "Bearer good:u1"}
        )
        self.assertEqual(me.json()["me"]["rank"], 1)
        self.assertTrue(me.json()["entries"][0]["me"])
        # a presented token that fails is a 401 even on the public read
        self.assertEqual(
            c.get(f"/api/v2/daily/{TODAY}?archetype=ghost", headers=bad_token).status_code, 401
        )

    def test_open_mode_needs_an_identity_to_write(self) -> None:
        c = client()
        body = {"name": "o", "result": res()}
        self.assertEqual(c.put(f"/api/v2/daily/{TODAY}", json=body).status_code, 400)
        self.assertEqual(
            c.put(f"/api/v2/daily/{TODAY}", headers=pid(1), json=body).status_code, 200
        )
        signed = c.put(
            f"/api/v2/daily/{TODAY}", headers={"Authorization": "Bearer good:u2"}, json=body
        )
        self.assertEqual(signed.json()["total"], 2)


class ModuleSurfaceTest(unittest.TestCase):
    def test_windows(self) -> None:
        self.assertEqual(daily.SUBMIT_WINDOW_DAYS, 2)
        self.assertEqual(daily.READ_WINDOW_DAYS, 30)


if __name__ == "__main__":
    unittest.main()
