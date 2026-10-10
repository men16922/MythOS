"""Persistence for Mythos 2.0 saves: JSON blobs per (player, slot) + run history.

The v2 game runs entirely in the browser; the server is a dumb, size-bounded
mirror so a profile/run survives a cleared browser or follows an invite key to
another device. Two implementations behind one small interface:

* ``PostgresV2Store`` — psycopg pool on ``DATABASE_URL`` (same default as
  ``mythos_memory.PostgresMythOSStore``). On open it runs the idempotent DDL in
  ``SCHEMA_STATEMENTS`` (identical to ``migrations/009_v2_saves.sql``) because the
  Cloud Run image ships no ``migrations/`` and prod migrations are owner-run.
* ``MemoryV2Store`` — process-local dicts. Used by tests, by
  ``MYTHOS_V2_STORE=memory``, and as the fallback when Postgres is unreachable or
  the DDL is refused at first use (a warning is logged; saves are then not
  durable across restarts — the client keeps a localStorage mirror and pushes it
  back, see ``src/mythos_ui/src/v2/net/api.ts``).

``StoreHolder`` builds the store lazily on the first request, so importing the
API (or running unrelated tests) never touches a database.
"""

from __future__ import annotations

import copy
import os
import threading
from abc import ABC, abstractmethod
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal

from mythos_core.clock import utc_now
from mythos_runtime.observability import get_logger

Slot = Literal["profile", "run"]
SLOTS: tuple[Slot, ...] = ("profile", "run")

DEFAULT_DATABASE_URL = "postgresql://mythos:mythos@localhost:5432/mythos"

#: Same statements as migrations/009_v2_saves.sql (that file is canonical; a test
#: asserts they match). Every statement is idempotent.
SCHEMA_STATEMENTS: tuple[str, ...] = (
    """CREATE TABLE IF NOT EXISTS v2_saves (
  player_id TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('profile', 'run')),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, slot)
)""",
    """CREATE TABLE IF NOT EXISTS v2_run_history (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)""",
    """CREATE INDEX IF NOT EXISTS idx_v2_run_history_player_created
  ON v2_run_history(player_id, created_at DESC)""",
)

#: Per-player history kept by the in-memory store (Postgres keeps everything).
MEMORY_HISTORY_CAP = 100

_logger = get_logger("mythos.v2.store")


class StoreUnavailableError(RuntimeError):
    """The backing database failed mid-request (mapped to HTTP 503)."""


class HistoryConflictError(RuntimeError):
    """A run-record id already belongs to a different player (mapped to HTTP 409)."""


@dataclass(frozen=True)
class SaveBlob:
    data: dict[str, Any]
    updated_at: datetime


class V2Store(ABC):
    """Blob store for one player's profile/run plus their finished-run records."""

    kind: str = "abstract"

    @abstractmethod
    def get_save(self, player_id: str, slot: Slot) -> SaveBlob | None:
        raise NotImplementedError

    @abstractmethod
    def put_save(self, player_id: str, slot: Slot, data: dict[str, Any]) -> datetime:
        """Upsert and return the stored ``updated_at``."""
        raise NotImplementedError

    @abstractmethod
    def delete_save(self, player_id: str, slot: Slot) -> bool:
        """True when a row existed."""
        raise NotImplementedError

    @abstractmethod
    def append_history(self, player_id: str, record_id: str, data: dict[str, Any]) -> None:
        """Insert (or idempotently re-store) a finished-run record.

        Raises ``HistoryConflictError`` when ``record_id`` belongs to another player.
        """
        raise NotImplementedError

    @abstractmethod
    def list_history(self, player_id: str, limit: int) -> list[dict[str, Any]]:
        """Newest first."""
        raise NotImplementedError

    def close(self) -> None:  # noqa: B027 - optional hook, default no-op
        """Release resources (pool); no-op for the memory store."""


class MemoryV2Store(V2Store):
    kind = "memory"

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._saves: dict[tuple[str, str], SaveBlob] = {}
        # record id -> (player_id, created_at, data)
        self._history: dict[str, tuple[str, datetime, dict[str, Any]]] = {}

    def get_save(self, player_id: str, slot: Slot) -> SaveBlob | None:
        with self._lock:
            blob = self._saves.get((player_id, slot))
            if blob is None:
                return None
            return SaveBlob(copy.deepcopy(blob.data), blob.updated_at)

    def put_save(self, player_id: str, slot: Slot, data: dict[str, Any]) -> datetime:
        now = utc_now()
        with self._lock:
            self._saves[(player_id, slot)] = SaveBlob(copy.deepcopy(data), now)
        return now

    def delete_save(self, player_id: str, slot: Slot) -> bool:
        with self._lock:
            return self._saves.pop((player_id, slot), None) is not None

    def append_history(self, player_id: str, record_id: str, data: dict[str, Any]) -> None:
        with self._lock:
            existing = self._history.get(record_id)
            if existing is not None and existing[0] != player_id:
                raise HistoryConflictError(record_id)
            created = existing[1] if existing is not None else utc_now()
            self._history[record_id] = (player_id, created, copy.deepcopy(data))
            mine = sorted(
                (rid for rid, row in self._history.items() if row[0] == player_id),
                key=lambda rid: self._history[rid][1],
            )
            for rid in mine[:-MEMORY_HISTORY_CAP]:
                del self._history[rid]

    def list_history(self, player_id: str, limit: int) -> list[dict[str, Any]]:
        with self._lock:
            rows = [row for row in self._history.values() if row[0] == player_id]
        rows.sort(key=lambda row: row[1], reverse=True)
        return [copy.deepcopy(row[2]) for row in rows[: max(0, limit)]]


class PostgresV2Store(V2Store):
    kind = "postgres"

    def __init__(self, database_url: str | None = None, *, connect_timeout: float = 5.0) -> None:
        from psycopg.rows import dict_row
        from psycopg_pool import ConnectionPool

        url = database_url or os.getenv("DATABASE_URL") or DEFAULT_DATABASE_URL
        self._connect_timeout = connect_timeout
        # A small pool of its own: the v2 endpoints are light (one statement per
        # request) and must not starve the classic runtime's pool.
        self._pool: Any = ConnectionPool(
            conninfo=url,
            kwargs={"row_factory": dict_row, "connect_timeout": max(1, int(connect_timeout))},
            min_size=1,
            max_size=4,
            open=False,
            # Neon reaps idle backends; verify liveness on checkout (same reason as
            # PostgresMythOSStore).
            check=ConnectionPool.check_connection,
            name="mythos-v2",
        )

    def open(self) -> None:
        """Connect and ensure the schema; raises if either fails."""
        try:
            self._pool.open(wait=True, timeout=self._connect_timeout)
            self.ensure_schema()
        except Exception:
            self.close()
            raise

    def ensure_schema(self) -> None:
        with self._pool.connection() as conn, conn.transaction():
            for statement in SCHEMA_STATEMENTS:
                conn.execute(statement)

    def close(self) -> None:
        try:
            self._pool.close(timeout=2.0)
        except Exception:  # pragma: no cover - best effort on shutdown
            _logger.debug("v2 store pool close failed", exc_info=True)

    @contextmanager
    def _conn(self) -> Iterator[Any]:
        import psycopg

        try:
            with self._pool.connection(timeout=self._connect_timeout) as conn:
                yield conn
        except (psycopg.Error, OSError, TimeoutError) as exc:
            raise StoreUnavailableError(type(exc).__name__) from exc
        except Exception as exc:
            # psycopg_pool.PoolTimeout is not a psycopg.Error subclass.
            if type(exc).__name__ in {"PoolTimeout", "PoolClosed", "TooManyRequests"}:
                raise StoreUnavailableError(type(exc).__name__) from exc
            raise

    def get_save(self, player_id: str, slot: Slot) -> SaveBlob | None:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT data, updated_at FROM v2_saves WHERE player_id = %s AND slot = %s",
                (player_id, slot),
            ).fetchone()
        if row is None:
            return None
        return SaveBlob(dict(row["data"]), row["updated_at"])

    def put_save(self, player_id: str, slot: Slot, data: dict[str, Any]) -> datetime:
        from psycopg.types.json import Jsonb

        with self._conn() as conn:
            row = conn.execute(
                """
                INSERT INTO v2_saves (player_id, slot, data, updated_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (player_id, slot)
                DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
                RETURNING updated_at
                """,
                (player_id, slot, Jsonb(data)),
            ).fetchone()
        assert row is not None
        updated_at: datetime = row["updated_at"]
        return updated_at

    def delete_save(self, player_id: str, slot: Slot) -> bool:
        with self._conn() as conn:
            cursor = conn.execute(
                "DELETE FROM v2_saves WHERE player_id = %s AND slot = %s",
                (player_id, slot),
            )
            return bool(cursor.rowcount)

    def append_history(self, player_id: str, record_id: str, data: dict[str, Any]) -> None:
        from psycopg.types.json import Jsonb

        with self._conn() as conn:
            # Re-posting the same record (client retry) updates it; a record id
            # owned by someone else is left untouched and reported as a conflict.
            row = conn.execute(
                """
                INSERT INTO v2_run_history (id, player_id, data, created_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
                WHERE v2_run_history.player_id = EXCLUDED.player_id
                RETURNING id
                """,
                (record_id, player_id, Jsonb(data)),
            ).fetchone()
        if row is None:
            raise HistoryConflictError(record_id)

    def list_history(self, player_id: str, limit: int) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT data FROM v2_run_history WHERE player_id = %s
                ORDER BY created_at DESC LIMIT %s
                """,
                (player_id, max(0, limit)),
            ).fetchall()
        return [dict(row["data"]) for row in rows]


def build_store() -> V2Store:
    """Pick the store from ``MYTHOS_V2_STORE`` (auto | postgres | memory).

    ``auto`` (default) tries Postgres (connect + idempotent DDL) and falls back to
    memory with a warning; ``postgres`` raises instead of falling back.
    """
    mode = (os.getenv("MYTHOS_V2_STORE") or "auto").strip().lower()
    if mode == "memory":
        return MemoryV2Store()
    timeout = _env_float("MYTHOS_V2_DB_TIMEOUT", 5.0)
    try:
        store = PostgresV2Store(connect_timeout=timeout)
        store.open()
    except Exception as exc:
        if mode == "postgres":
            raise
        _logger.warning(
            "v2 saves: Postgres unavailable (%s: %s); using the in-memory store "
            "(saves are not durable across restarts)",
            type(exc).__name__,
            str(exc).splitlines()[0][:160] if str(exc) else "",
        )
        return MemoryV2Store()
    _logger.info("v2 saves: Postgres store ready")
    return store


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, "") or default)
    except ValueError:
        return default


class StoreHolder:
    """Thread-safe lazy singleton around a store factory."""

    def __init__(self, factory: Callable[[], V2Store] | None = None) -> None:
        self._factory = factory or build_store
        self._store: V2Store | None = None
        self._lock = threading.Lock()

    def get(self) -> V2Store:
        store = self._store
        if store is not None:
            return store
        with self._lock:
            if self._store is None:
                self._store = self._factory()
            return self._store

    @property
    def kind(self) -> str | None:
        return self._store.kind if self._store is not None else None

    def close(self) -> None:
        with self._lock:
            if self._store is not None:
                self._store.close()
                self._store = None


__all__ = [
    "SCHEMA_STATEMENTS",
    "SLOTS",
    "HistoryConflictError",
    "MemoryV2Store",
    "PostgresV2Store",
    "SaveBlob",
    "Slot",
    "StoreHolder",
    "StoreUnavailableError",
    "V2Store",
    "build_store",
]
