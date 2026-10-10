"""Mythos 2.0 save store: memory semantics, DDL parity with migration 009,
store selection/fallback, and (opt-in) the Postgres implementation."""

from __future__ import annotations

import logging
import os
import re
import unittest
import uuid
from pathlib import Path
from unittest import mock

from psycopg_pool import PoolTimeout

from mythos_v2.store import (
    DEFAULT_DATABASE_URL,
    MEMORY_HISTORY_CAP,
    SCHEMA_STATEMENTS,
    HistoryConflictError,
    MemoryV2Store,
    PostgresV2Store,
    StoreHolder,
    V2Store,
    build_store,
)

MIGRATION = Path(__file__).resolve().parents[1] / "migrations" / "009_v2_saves.sql"


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
        self.store = self.make_store()
        self.player = f"tp_{uuid.uuid4().hex[:12]}"

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
        with case.assertRaises(HistoryConflictError):
            self.store.append_history(f"{self.player}_x", rid1, {"id": rid1})

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
            for table in ("v2_saves", "v2_run_history"):
                conn.execute(f"DELETE FROM {table} WHERE player_id LIKE %s", (f"{self.player}%",))

    def test_open_creates_schema_when_migration_009_is_missing(self) -> None:
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
            finally:
                store.close()
            with psycopg.connect(base) as conn:
                row = conn.execute(
                    "SELECT count(*) FROM information_schema.tables "
                    "WHERE table_schema = %s AND table_name IN ('v2_saves', 'v2_run_history')",
                    (schema,),
                ).fetchone()
            self.assertEqual(row[0] if row else 0, 2)
        finally:
            with psycopg.connect(base, autocommit=True) as admin:
                admin.execute(f"DROP SCHEMA {schema} CASCADE")


class SchemaParityTest(unittest.TestCase):
    def test_embedded_ddl_matches_migration_009(self) -> None:
        self.assertEqual(
            _normalize_sql(MIGRATION.read_text(encoding="utf-8")),
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
