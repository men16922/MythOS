"""Postgres stale-connection retry (live 500, 2026-07-05 `/auth/connect`).

Neon이 유휴 연결을 AdminShutdown으로 끊은 뒤 앱이 죽은 연결을 재사용하던 문제:
연결-종료 계열 오류(Operational/Interface/57류)는 트랜잭션 밖에서 1회 재연결-재시도.
Postgres 불필요 — 스텁 연결로 검증.
"""

from __future__ import annotations

import unittest
from typing import Any
from unittest.mock import patch

import psycopg

from mythos_memory.postgres_store import PostgresMythOSStore
from mythos_memory.store import StoreError


class _Cursor:
    def __init__(self, row: dict[str, Any] | None = None):
        self._row = row

    def __enter__(self):
        return self

    def __exit__(self, *args: Any) -> None:
        pass

    def fetchone(self):
        return self._row

    def fetchall(self):
        return [self._row] if self._row else []


class _Conn:
    def __init__(self, fail_with: Exception | None = None, row: dict[str, Any] | None = None):
        self.fail_with = fail_with
        self.row = row
        self.closed = False
        self.executed: list[str] = []
        self.rolled_back = False

    def execute(self, sql: str, params: Any = None):
        if self.fail_with is not None:
            # 서버가 소켓을 끊었다 — 이후 이 연결은 닫힌 것으로 취급된다.
            self.closed = True
            raise self.fail_with
        self.executed.append(sql)
        return _Cursor(self.row)

    def commit(self) -> None:
        pass

    def rollback(self) -> None:
        self.rolled_back = True

    def close(self) -> None:
        self.closed = True


def _store_with(conn: _Conn) -> PostgresMythOSStore:
    store = PostgresMythOSStore.__new__(PostgresMythOSStore)
    store._connection = conn  # type: ignore[assignment]
    store._transaction_depth = 0
    store.database_url = "postgresql://stub"
    return store


class StaleConnectionRetryTest(unittest.TestCase):
    def _admin_shutdown(self) -> psycopg.OperationalError:
        return psycopg.OperationalError("terminating connection due to administrator command")

    def test_dropped_connection_reconnects_and_retries_once(self) -> None:
        dead = _Conn(fail_with=self._admin_shutdown())
        fresh = _Conn(row={"ok": 1})
        store = _store_with(dead)
        with patch("mythos_memory.postgres_store.psycopg.connect", return_value=fresh) as connect:
            row = store._fetchone("SELECT 1", ())
        self.assertEqual(row, {"ok": 1})
        connect.assert_called_once()
        self.assertTrue(dead.closed)
        self.assertIs(store._connection, fresh)

    def test_execute_path_also_retries(self) -> None:
        dead = _Conn(fail_with=self._admin_shutdown())
        fresh = _Conn()
        store = _store_with(dead)
        with patch("mythos_memory.postgres_store.psycopg.connect", return_value=fresh):
            store._execute("UPDATE x SET y = 1", ())
        self.assertEqual(fresh.executed, ["UPDATE x SET y = 1"])

    def test_no_retry_inside_open_transaction(self) -> None:
        dead = _Conn(fail_with=self._admin_shutdown())
        store = _store_with(dead)
        store._transaction_depth = 1
        with patch("mythos_memory.postgres_store.psycopg.connect") as connect:
            with self.assertRaises(StoreError):
                store._fetchone("SELECT 1", ())
        connect.assert_not_called()

    def test_non_connection_errors_do_not_retry(self) -> None:
        class _SyntaxError(psycopg.ProgrammingError):
            sqlstate = "42601"

        dead = _Conn(fail_with=_SyntaxError("syntax error"))
        store = _store_with(dead)
        with patch("mythos_memory.postgres_store.psycopg.connect") as connect:
            with self.assertRaises(StoreError):
                store._fetchone("SELECT broken", ())
        connect.assert_not_called()

    def test_second_failure_surfaces_store_error(self) -> None:
        dead = _Conn(fail_with=self._admin_shutdown())
        also_dead = _Conn(fail_with=self._admin_shutdown())
        store = _store_with(dead)
        with patch("mythos_memory.postgres_store.psycopg.connect", return_value=also_dead):
            with self.assertRaises(StoreError):
                store._fetchone("SELECT 1", ())


if __name__ == "__main__":
    unittest.main()
