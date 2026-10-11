"""Mythos 2.0 store: saves/history/daily-leaderboard semantics, DDL parity with migrations 009 + 010,
store selection/fallback, and (opt-in, MYTHOS_RUN_DB_TESTS=1) the Postgres implementation."""

from __future__ import annotations

import logging
import os
import re
import unittest
import uuid
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from unittest import mock

from psycopg_pool import PoolTimeout

from mythos_v2.daily import DailyResult
from mythos_v2.store import (
    DEFAULT_DATABASE_URL,
    MEMORY_HISTORY_CAP,
    SCHEMA_STATEMENTS,
    MemoryV2Store,
    PostgresV2Store,
    StoreHolder,
    V2Store,
    build_store,
)

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"
V2_MIGRATIONS = (
    "009_v2_saves.sql",
    "010_v2_daily_scores.sql",
    "011_v2_history_per_player.sql",
    "012_v2_saves_created_at.sql",
    "013_v2_gm_usage.sql",
    "014_v2_gm_usage_tokens.sql",
)
DAY = date(2026, 10, 11)


def _result(archetype: str, **overrides: object) -> DailyResult:
    base: dict[str, object] = {
        "archetype": archetype,
        "won": False,
        "act": 2,
        "floors": 10,
        "echoes": 30,
        "kills": 12,
        "secs": 900,
    }
    base.update(overrides)
    return DailyResult(**base)  # type: ignore[arg-type]


def _normalize_sql(sql: str) -> list[str]:
    no_comments = "\n".join(line.split("--", 1)[0] for line in sql.splitlines())
    return [
        re.sub(r"\s+", " ", stmt).strip()
        for stmt in no_comments.split(";")
        if re.sub(r"\s+", " ", stmt).strip()
    ]


class _StoreContract:
    """Behaviour every V2Store must satisfy (mixed into concrete test cases)."""

    def make_store(self) -> V2Store:
        raise NotImplementedError

    def setUp(self) -> None:
        self.player = f"tp_{uuid.uuid4().hex[:12]}"
        # a board of our own (shared Postgres boards may hold other rows): letters only, like ids
        self.archetype = "t_" + "".join(chr(ord("a") + int(c, 16)) for c in uuid.uuid4().hex[:12])
        self.store = self.make_store()

    def test_save_round_trip_and_upsert(self) -> None:
        case = self._case()
        case.assertIsNone(self.store.get_save(self.player, "profile"))
        first = self.store.put_save(self.player, "profile", {"version": 2, "echoes": 1})
        blob = self.store.get_save(self.player, "profile")
        case.assertIsNotNone(blob)
        assert blob is not None
        case.assertEqual(blob.data, {"version": 2, "echoes": 1})
        second = self.store.put_save(self.player, "profile", {"version": 2, "echoes": 5})
        case.assertGreaterEqual(second, first)
        blob = self.store.get_save(self.player, "profile")
        assert blob is not None
        case.assertEqual(blob.data["echoes"], 5)
        # slots are independent
        case.assertIsNone(self.store.get_save(self.player, "run"))

    def test_delete(self) -> None:
        case = self._case()
        self.store.put_save(self.player, "run", {"id": "r1", "nested": {"a": [1, 2]}})
        case.assertTrue(self.store.delete_save(self.player, "run"))
        case.assertFalse(self.store.delete_save(self.player, "run"))
        case.assertIsNone(self.store.get_save(self.player, "run"))

    def test_history_append_list_and_conflict(self) -> None:
        case = self._case()
        rid1 = f"{self.player}_a"
        rid2 = f"{self.player}_b"
        self.store.append_history(self.player, rid1, {"id": rid1, "n": 1})
        self.store.append_history(self.player, rid2, {"id": rid2, "n": 2})
        # idempotent re-post by the owner updates in place
        self.store.append_history(self.player, rid1, {"id": rid1, "n": 10})
        records = self.store.list_history(self.player, 10)
        case.assertEqual({r["id"] for r in records}, {rid1, rid2})
        case.assertEqual(next(r for r in records if r["id"] == rid1)["n"], 10)
        case.assertEqual(len(self.store.list_history(self.player, 1)), 1)
        # the same record id under another player is that player's own record (daily runs share ids)
        other = f"{self.player}_x"
        self.store.append_history(other, rid1, {"id": rid1, "n": 99})
        case.assertEqual(
            next(r for r in self.store.list_history(self.player, 10) if r["id"] == rid1)["n"], 10
        )
        case.assertEqual([r["n"] for r in self.store.list_history(other, 10)], [99])

    def test_daily_keep_best_and_rename(self) -> None:
        case = self._case()
        p = self.player
        first = self.store.submit_daily(DAY, p, "first", _result(self.archetype, floors=20))
        case.assertEqual((first.rank, first.total, first.improved), (1, 1, True))
        worse = self.store.submit_daily(DAY, p, "renamed", _result(self.archetype, floors=5))
        case.assertFalse(worse.improved)
        case.assertEqual(worse.best, _result(self.archetype, floors=20))
        equal = self.store.submit_daily(DAY, p, "renamed", _result(self.archetype, floors=20))
        case.assertFalse(equal.improved)
        better = self.store.submit_daily(
            DAY, p, "renamed", _result(self.archetype, floors=20, secs=None, won=True)
        )
        case.assertTrue(better.improved)
        case.assertEqual(better.best, _result(self.archetype, floors=20, secs=None, won=True))
        board = self.store.daily_board(DAY, self.archetype, 10, p)
        case.assertEqual(board.total, 1)
        case.assertEqual(board.entries[0][1].name, "renamed")
        case.assertIsNone(board.entries[0][1].result.secs)
        case.assertEqual(board.me, board.entries[0])

    def test_daily_ranks_ties_and_me(self) -> None:
        case = self._case()
        a, b, c, d = (f"{self.player}_{s}" for s in "abcd")
        self.store.submit_daily(DAY, a, "A", _result(self.archetype, floors=10))
        self.store.submit_daily(DAY, b, "B", _result(self.archetype, floors=12))
        self.store.submit_daily(DAY, c, "C", _result(self.archetype, floors=10))  # ties A, later
        sub = self.store.submit_daily(DAY, d, "D", _result(self.archetype, floors=11, secs=None))
        case.assertEqual((sub.rank, sub.total), (2, 4))
        # A re-submitting the same result keeps its earlier achievement (still ahead of C)
        case.assertEqual(
            self.store.submit_daily(DAY, a, "A", _result(self.archetype, floors=10)).rank, 3
        )
        board = self.store.daily_board(DAY, self.archetype, 2, c)
        case.assertEqual(board.total, 4)
        case.assertEqual([(r, e.name) for r, e in board.entries], [(1, "B"), (2, "D")])
        assert board.me is not None
        case.assertEqual((board.me[0], board.me[1].name), (4, "C"))
        case.assertIsNone(self.store.daily_board(DAY, self.archetype, 2, None).me)
        case.assertIsNone(self.store.daily_board(DAY, self.archetype, 2, f"{self.player}_z").me)
        # other dates/archetypes are separate boards
        case.assertEqual(self.store.daily_board(date(2026, 10, 10), self.archetype, 5, a).total, 0)
        case.assertEqual(self.store.daily_board(DAY, self.archetype + "x", 5, a).total, 0)

    def _case(self) -> unittest.TestCase:
        assert isinstance(self, unittest.TestCase)
        return self


class MemoryStoreTest(_StoreContract, unittest.TestCase):
    def make_store(self) -> V2Store:
        return MemoryV2Store()

    def test_returned_data_is_a_copy(self) -> None:
        data = {"deck": [1, 2]}
        self.store.put_save(self.player, "run", data)
        data["deck"].append(3)
        blob = self.store.get_save(self.player, "run")
        assert blob is not None
        blob.data["deck"].append(4)
        again = self.store.get_save(self.player, "run")
        assert again is not None
        self.assertEqual(again.data, {"deck": [1, 2]})

    def test_admin_reads(self) -> None:
        self.store.put_save(
            self.player,
            "profile",
            {
                "playerName": "Nova",
                "loops": 3,
                "wins": 1,
                "unlocks": ["a", "b"],
                "endingsSeen": ["e"],
            },
        )
        self.store.put_save(
            self.player,
            "run",
            {"archetype": "ghost", "act": 2, "hp": 20, "maxHp": 50, "tally": {"floors": 6}},
        )
        self.store.append_history(
            self.player,
            "r1",
            {"result": "defeat", "archetype": "ghost", "act": 2, "floors": 6, "killedBy": "drone"},
        )
        self.store.submit_daily(DAY, self.player, "Nova", _result(self.archetype))
        mine = [p for p in self.store.admin_players() if p.player_id == self.player]
        self.assertEqual(len(mine), 1)
        self.assertEqual(
            (mine[0].profile["name"], mine[0].profile["runs"], mine[0].profile["unlocks"]),
            ("Nova", 3, 2),
        )
        self.assertEqual(mine[0].profile["endings"], 1)
        assert mine[0].run is not None
        self.assertEqual((mine[0].run["archetype"], mine[0].run["floors"]), ("ghost", 6))
        self.assertIsNotNone(mine[0].last_active)
        first_seen, last_active = mine[0].first_seen, mine[0].last_active
        assert first_seen is not None and last_active is not None
        self.assertLessEqual(first_seen, last_active)
        past = datetime.now(UTC) - timedelta(days=1)
        runs = [r for r in self.store.admin_runs(past) if r.player_id == self.player]
        self.assertEqual([(r.result, r.killed_by, r.act) for r in runs], [("defeat", "drone", 2)])
        self.assertEqual(self.store.admin_runs(datetime.now(UTC) + timedelta(days=1)), [])
        rows = [row for row in self.store.admin_daily(DAY) if row[1].player_id == self.player]
        self.assertEqual([(day, e.name) for day, e in rows], [(DAY, "Nova")])
        self.assertEqual(
            [
                r
                for r in self.store.admin_daily(date(2026, 10, 12))
                if r[1].player_id == self.player
            ],
            [],
        )

    def test_gm_usage_counters(self) -> None:
        day = date(2099, 1, 2)
        self.addCleanup(self._drop_usage, day)
        self.store.record_gm_usage(day, "narrate", "llm", 100, 20)
        self.store.record_gm_usage(day, "narrate", "llm", 50, 10)
        self.store.record_gm_usage(day, "narrate", "timeout")
        self.store.record_gm_usage(day, "talk", "llm", 7, 3)
        rows = sorted(self.store.admin_gm_usage(day))
        self.assertEqual(
            rows,
            [
                (day, "narrate", "llm", 2, 150, 30),
                (day, "narrate", "timeout", 1, 0, 0),
                (day, "talk", "llm", 1, 7, 3),
            ],
        )
        self.assertEqual(self.store.admin_gm_usage(date(2099, 1, 3)), [])

    def _drop_usage(self, day: date) -> None:
        drop = getattr(self.store, "_pool", None)
        if drop is not None:
            with drop.connection() as conn:
                conn.execute("DELETE FROM v2_gm_usage WHERE day = %s", (day,))

    def test_history_cap(self) -> None:
        for i in range(MEMORY_HISTORY_CAP + 5):
            self.store.append_history(self.player, f"r{i}", {"id": f"r{i}"})
        records = self.store.list_history(self.player, 1000)
        self.assertEqual(len(records), MEMORY_HISTORY_CAP)
        self.assertEqual(records[0]["id"], f"r{MEMORY_HISTORY_CAP + 4}")


@unittest.skipUnless(os.getenv("MYTHOS_RUN_DB_TESTS") == "1", "set MYTHOS_RUN_DB_TESTS=1")
class PostgresStoreTest(_StoreContract, unittest.TestCase):
    def make_store(self) -> V2Store:
        store = PostgresV2Store()
        store.open()
        self.addCleanup(store.close)
        self.addCleanup(self._purge, store)
        return store

    def _purge(self, store: PostgresV2Store) -> None:
        with store._pool.connection() as conn:
            for table in ("v2_saves", "v2_run_history", "v2_daily_scores"):
                conn.execute(f"DELETE FROM {table} WHERE player_id LIKE %s", (f"{self.player}%",))

    def test_open_creates_schema_when_migrations_are_missing(self) -> None:
        import psycopg

        base = os.getenv("DATABASE_URL") or DEFAULT_DATABASE_URL
        schema = f"v2test_{uuid.uuid4().hex[:8]}"
        with psycopg.connect(base, autocommit=True) as admin:
            admin.execute(f"CREATE SCHEMA {schema}")
        try:
            sep = "&" if "?" in base else "?"
            store = PostgresV2Store(f"{base}{sep}options=-csearch_path%3D{schema}")
            store.open()
            try:
                store.put_save(self.player, "profile", {"version": 2})
                blob = store.get_save(self.player, "profile")
                assert blob is not None
                self.assertEqual(blob.data, {"version": 2})
                sub = store.submit_daily(DAY, self.player, "n", _result(self.archetype))
                self.assertEqual((sub.rank, sub.total), (1, 1))
            finally:
                store.close()
            with psycopg.connect(base) as conn:
                row = conn.execute(
                    "SELECT count(*) FROM information_schema.tables "
                    "WHERE table_schema = %s "
                    "AND table_name IN ('v2_saves', 'v2_run_history', 'v2_daily_scores')",
                    (schema,),
                ).fetchone()
            self.assertEqual(row[0] if row else 0, 3)
        finally:
            with psycopg.connect(base, autocommit=True) as admin:
                admin.execute(f"DROP SCHEMA {schema} CASCADE")

    def test_board_query_uses_the_board_index(self) -> None:
        store = self.store
        assert isinstance(store, PostgresV2Store)
        with store._pool.connection() as conn:
            conn.execute("SET LOCAL enable_seqscan = off")
            plan = conn.execute(
                "EXPLAIN SELECT player_id FROM v2_daily_scores WHERE day = %s AND archetype = %s "
                "ORDER BY score DESC, achieved_at, player_id LIMIT 20",
                (DAY, self.archetype),
            ).fetchall()
        text = "\n".join(str(next(iter(row.values()))) for row in plan)
        self.assertIn("idx_v2_daily_scores_board", text)


class SchemaParityTest(unittest.TestCase):
    def test_embedded_ddl_matches_migrations_009_to_014(self) -> None:
        migrations = ";".join(
            (MIGRATIONS / name).read_text(encoding="utf-8") for name in V2_MIGRATIONS
        )
        self.assertEqual(
            _normalize_sql(migrations),
            _normalize_sql(";".join(SCHEMA_STATEMENTS)),
        )

    def test_ddl_is_idempotent(self) -> None:
        for statement in SCHEMA_STATEMENTS:
            self.assertIn("IF NOT EXISTS", statement)


class BuildStoreTest(unittest.TestCase):
    def setUp(self) -> None:
        # The unreachable-DB cases make psycopg_pool log its (expected) retries.
        pool_logger = logging.getLogger("psycopg.pool")
        self.addCleanup(pool_logger.setLevel, pool_logger.level)
        pool_logger.setLevel(logging.CRITICAL)

    def test_memory_mode(self) -> None:
        with mock.patch.dict(os.environ, {"MYTHOS_V2_STORE": "memory"}):
            self.assertIsInstance(build_store(), MemoryV2Store)

    def test_auto_falls_back_to_memory_when_db_unreachable(self) -> None:
        env = {
            "MYTHOS_V2_STORE": "auto",
            "DATABASE_URL": "postgresql://nobody:nothing@127.0.0.1:1/none",
            "MYTHOS_V2_DB_TIMEOUT": "1",
        }
        with mock.patch.dict(os.environ, env):
            store = build_store()
        self.assertIsInstance(store, MemoryV2Store)

    def test_postgres_mode_raises_when_db_unreachable(self) -> None:
        env = {
            "MYTHOS_V2_STORE": "postgres",
            "DATABASE_URL": "postgresql://nobody:nothing@127.0.0.1:1/none",
            "MYTHOS_V2_DB_TIMEOUT": "1",
        }
        with mock.patch.dict(os.environ, env), self.assertRaises(PoolTimeout):
            build_store()

    def test_holder_builds_lazily_once(self) -> None:
        calls: list[int] = []

        def factory() -> V2Store:
            calls.append(1)
            return MemoryV2Store()

        holder = StoreHolder(factory)
        self.assertIsNone(holder.kind)
        self.assertEqual(calls, [])
        first = holder.get()
        self.assertIs(holder.get(), first)
        self.assertEqual(calls, [1])
        self.assertEqual(holder.kind, "memory")
        holder.close()
        self.assertIsNone(holder.kind)


if __name__ == "__main__":
    unittest.main()
