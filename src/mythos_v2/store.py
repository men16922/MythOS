"""Persistence for Mythos 2.0: JSON save blobs per (player, slot), run history, and the daily-seed
leaderboard (each player's best per date + archetype).

The v2 game runs entirely in the browser; the server is a dumb, size-bounded
mirror so a profile/run survives a cleared browser or follows a Google sign-in to
another device. Two implementations behind one small interface:

* ``PostgresV2Store`` — psycopg pool on ``DATABASE_URL``. On open it runs the idempotent DDL in
  ``SCHEMA_STATEMENTS`` (identical to ``migrations/009``–``011``)
  because the Cloud Run image ships no ``migrations/`` and prod migrations are owner-run.
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
from dataclasses import replace as dc_replace
from datetime import UTC, date, datetime, timedelta
from typing import Any, Literal

from mythos_v2.admin import (
    MAX_PLAYERS,
    MAX_RUN_ROWS,
    AdminPlayer,
    AdminRun,
    profile_summary,
    run_from_fields,
    run_summary,
)
from mythos_v2.daily import DailyBoard, DailyEntry, DailyResult, DailySubmission
from mythos_v2.log import get_logger

Slot = Literal["profile", "run"]
SLOTS: tuple[Slot, ...] = ("profile", "run")

DEFAULT_DATABASE_URL = "postgresql://mythos:mythos@localhost:5432/mythos"

#: Same statements as migrations/009_v2_saves.sql + 010_v2_daily_scores.sql + 011_v2_history_per_player.sql (those files are
#: canonical; a test asserts they match). Every statement is idempotent.
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
    """CREATE TABLE IF NOT EXISTS v2_daily_scores (
  day DATE NOT NULL,
  archetype TEXT NOT NULL,
  player_id TEXT NOT NULL,
  name TEXT NOT NULL,
  won BOOLEAN NOT NULL,
  act SMALLINT NOT NULL,
  floors SMALLINT NOT NULL,
  echoes SMALLINT NOT NULL,
  kills SMALLINT NOT NULL,
  secs INTEGER,
  score BIGINT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (day, archetype, player_id)
)""",
    """CREATE INDEX IF NOT EXISTS idx_v2_daily_scores_board
  ON v2_daily_scores(day, archetype, score DESC, achieved_at, player_id)""",
    # Run history is keyed per player (client run ids are not globally unique); see migration 011.
    """DO $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mythos.v2_run_history.rekey'));
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'v2_run_history'::regclass AND contype = 'p' AND cardinality(conkey) = 2
  ) THEN
    ALTER TABLE v2_run_history DROP CONSTRAINT IF EXISTS v2_run_history_pkey;
    ALTER TABLE v2_run_history ADD CONSTRAINT v2_run_history_pkey PRIMARY KEY (player_id, id);
  END IF;
END $$""",
)

#: Per-player history kept by the in-memory store (Postgres keeps everything).
MEMORY_HISTORY_CAP = 100
#: Days of daily boards kept by the in-memory store (older than the newest submit minus this are dropped).
MEMORY_DAILY_DAYS = 40

_logger = get_logger("mythos.v2.store")


def utc_now() -> datetime:
    return datetime.now(UTC)


class StoreUnavailableError(RuntimeError):
    """The backing database failed mid-request (mapped to HTTP 503)."""


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
        """Insert (or idempotently re-store) a finished-run record. Ids are scoped per player."""
        raise NotImplementedError

    @abstractmethod
    def list_history(self, player_id: str, limit: int) -> list[dict[str, Any]]:
        """Newest first."""
        raise NotImplementedError

    @abstractmethod
    def submit_daily(
        self, day: date, player_id: str, name: str, result: DailyResult
    ) -> DailySubmission:
        """Keep the better of the stored best and ``result`` for (day, archetype, player); the name is
        always updated. Returns the player's rank/total on that board after the write."""
        raise NotImplementedError

    @abstractmethod
    def daily_board(
        self, day: date, archetype: str, limit: int, player_id: str | None
    ) -> DailyBoard:
        """Top ``limit`` entries (best first), the board size, and ``player_id``'s own entry."""
        raise NotImplementedError

    # --- operator dashboard (read-only; see ``admin.build_overview``) -------------------------------------

    @abstractmethod
    def admin_players(self, limit: int = MAX_PLAYERS) -> list[AdminPlayer]:
        """Every player with a saved profile or run, most recently active first."""
        raise NotImplementedError

    @abstractmethod
    def admin_runs(self, since: datetime, limit: int = MAX_RUN_ROWS) -> list[AdminRun]:
        """Finished-run records that arrived at or after ``since``."""
        raise NotImplementedError

    @abstractmethod
    def admin_daily(self, since: date) -> list[tuple[date, DailyEntry]]:
        """Daily-board rows (every archetype) for days ``>= since``."""
        raise NotImplementedError

    def close(self) -> None:  # noqa: B027 - optional hook, default no-op
        """Release resources (pool); no-op for the memory store."""


class MemoryV2Store(V2Store):
    kind = "memory"

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._saves: dict[tuple[str, str], SaveBlob] = {}
        # record id -> (player_id, created_at, data)
        self._history: dict[tuple[str, str], tuple[datetime, dict[str, Any]]] = {}
        # (day, archetype) -> player_id -> best entry
        self._daily: dict[tuple[date, str], dict[str, DailyEntry]] = {}
        self._last_tick = datetime.min.replace(tzinfo=UTC)

    def _tick(self) -> datetime:
        """utc_now(), strictly increasing (so "first achieved" never ties within this process)."""
        now = max(utc_now(), self._last_tick + timedelta(microseconds=1))
        self._last_tick = now
        return now

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
            existing = self._history.get((player_id, record_id))
            created = existing[0] if existing is not None else utc_now()
            self._history[(player_id, record_id)] = (created, copy.deepcopy(data))
            mine = sorted(
                (key for key in self._history if key[0] == player_id),
                key=lambda key: self._history[key][0],
            )
            for key in mine[:-MEMORY_HISTORY_CAP]:
                del self._history[key]

    def list_history(self, player_id: str, limit: int) -> list[dict[str, Any]]:
        with self._lock:
            rows = [row for key, row in self._history.items() if key[0] == player_id]
        rows.sort(key=lambda row: row[0], reverse=True)
        return [copy.deepcopy(row[1]) for row in rows[: max(0, limit)]]

    def submit_daily(
        self, day: date, player_id: str, name: str, result: DailyResult
    ) -> DailySubmission:
        with self._lock:
            board = self._daily.setdefault((day, result.archetype), {})
            prev = board.get(player_id)
            now = self._tick()
            improved = prev is None or result.score > prev.result.score
            if prev is None or improved:
                entry = DailyEntry(player_id, name, result, now)
            else:
                entry = dc_replace(prev, name=name)
            board[player_id] = entry
            ordered = sorted(board.values(), key=DailyEntry.board_key)
            rank = ordered.index(entry) + 1
            cutoff = day - timedelta(days=MEMORY_DAILY_DAYS)
            for key in [k for k in self._daily if k[0] < cutoff]:
                del self._daily[key]
            return DailySubmission(rank, len(ordered), entry.result, improved)

    def daily_board(
        self, day: date, archetype: str, limit: int, player_id: str | None
    ) -> DailyBoard:
        with self._lock:
            ordered = sorted(
                self._daily.get((day, archetype), {}).values(), key=DailyEntry.board_key
            )
        ranked = list(enumerate(ordered, start=1))
        me = next((pair for pair in ranked if pair[1].player_id == player_id), None)
        return DailyBoard(len(ordered), ranked[: max(0, limit)], me)

    def admin_players(self, limit: int = MAX_PLAYERS) -> list[AdminPlayer]:
        with self._lock:
            saves = {
                key: (copy.deepcopy(blob.data), blob.updated_at)
                for key, blob in self._saves.items()
            }
        ids = {player for player, _ in saves}
        rows = []
        for player in ids:
            profile = saves.get((player, "profile"))
            run = saves.get((player, "run"))
            rows.append(
                AdminPlayer(
                    player_id=player,
                    profile=profile_summary(profile[0]) if profile else {},
                    profile_updated_at=profile[1] if profile else None,
                    run=run_summary(run[0]) if run else None,
                    run_updated_at=run[1] if run else None,
                )
            )
        epoch = datetime.min.replace(tzinfo=UTC)
        rows.sort(key=lambda row: row.last_active or epoch, reverse=True)
        return rows[: max(0, limit)]

    def admin_runs(self, since: datetime, limit: int = MAX_RUN_ROWS) -> list[AdminRun]:
        with self._lock:
            items = [
                (key[0], created, copy.deepcopy(data))
                for key, (created, data) in self._history.items()
                if created >= since
            ]
        items.sort(key=lambda item: item[1], reverse=True)
        return [
            run_from_fields(
                player,
                created,
                result=data.get("result"),
                archetype=data.get("archetype"),
                act=data.get("act"),
                floors=data.get("floors"),
                echoes=data.get("echoes"),
                ending=data.get("endingId"),
                killed_by=data.get("killedBy"),
                daily=data.get("daily"),
            )
            for player, created, data in items[: max(0, limit)]
        ]

    def admin_daily(self, since: date) -> list[tuple[date, DailyEntry]]:
        with self._lock:
            return [
                (day, entry)
                for (day, _archetype), board in self._daily.items()
                if day >= since
                for entry in board.values()
            ]


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
            # Re-posting the same record (client retry) updates it in place.
            conn.execute(
                """
                INSERT INTO v2_run_history (id, player_id, data, created_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (player_id, id) DO UPDATE SET data = EXCLUDED.data
                """,
                (record_id, player_id, Jsonb(data)),
            )

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

    # --- daily leaderboard ---------------------------------------------------------------------------------
    # Every board query is a range on idx_v2_daily_scores_board (day, archetype, score DESC, achieved_at,
    # player_id); a rank is 1 + the rows strictly ahead in that order.

    _DAILY_COLUMNS = "player_id, name, won, act, floors, echoes, kills, secs, achieved_at"
    _AHEAD = (
        "(score > %(score)s OR (score = %(score)s AND "
        "(achieved_at, player_id) < (%(achieved_at)s, %(player_id)s)))"
    )

    @staticmethod
    def _daily_entry(archetype: str, row: dict[str, Any]) -> DailyEntry:
        result = DailyResult(
            archetype=archetype,
            won=bool(row["won"]),
            act=int(row["act"]),
            floors=int(row["floors"]),
            echoes=int(row["echoes"]),
            kills=int(row["kills"]),
            secs=None if row["secs"] is None else int(row["secs"]),
        )
        return DailyEntry(str(row["player_id"]), str(row["name"]), result, row["achieved_at"])

    def _daily_rank(self, conn: Any, day: date, entry: DailyEntry) -> tuple[int, int]:
        row = conn.execute(
            f"""
            SELECT count(*) AS total, count(*) FILTER (WHERE {self._AHEAD}) AS ahead
            FROM v2_daily_scores WHERE day = %(day)s AND archetype = %(archetype)s
            """,
            {
                "day": day,
                "archetype": entry.result.archetype,
                "score": entry.result.score,
                "achieved_at": entry.achieved_at,
                "player_id": entry.player_id,
            },
        ).fetchone()
        assert row is not None
        return int(row["ahead"]) + 1, int(row["total"])

    def submit_daily(
        self, day: date, player_id: str, name: str, result: DailyResult
    ) -> DailySubmission:
        key = {"day": day, "archetype": result.archetype, "player_id": player_id}
        with self._conn() as conn, conn.transaction():
            # Insert, or replace the stored best only when strictly better (the row lock taken by
            # ON CONFLICT makes concurrent submits from one player safe). No row back = not improved.
            improved = (
                conn.execute(
                    """
                    INSERT INTO v2_daily_scores (day, archetype, player_id, name, won, act, floors,
                      echoes, kills, secs, score, achieved_at, updated_at)
                    VALUES (%(day)s, %(archetype)s, %(player_id)s, %(name)s, %(won)s, %(act)s,
                      %(floors)s, %(echoes)s, %(kills)s, %(secs)s, %(score)s, now(), now())
                    ON CONFLICT (day, archetype, player_id) DO UPDATE SET
                      name = EXCLUDED.name, won = EXCLUDED.won, act = EXCLUDED.act,
                      floors = EXCLUDED.floors, echoes = EXCLUDED.echoes, kills = EXCLUDED.kills,
                      secs = EXCLUDED.secs, score = EXCLUDED.score,
                      achieved_at = EXCLUDED.achieved_at, updated_at = EXCLUDED.updated_at
                    WHERE EXCLUDED.score > v2_daily_scores.score
                    RETURNING score
                    """,
                    {
                        **key,
                        "name": name,
                        "won": result.won,
                        "act": result.act,
                        "floors": result.floors,
                        "echoes": result.echoes,
                        "kills": result.kills,
                        "secs": result.secs,
                        "score": result.score,
                    },
                ).fetchone()
                is not None
            )
            if not improved:
                conn.execute(
                    """
                    UPDATE v2_daily_scores SET name = %(name)s, updated_at = now()
                    WHERE day = %(day)s AND archetype = %(archetype)s AND player_id = %(player_id)s
                    """,
                    {**key, "name": name},
                )
            row = conn.execute(
                f"""
                SELECT {self._DAILY_COLUMNS} FROM v2_daily_scores
                WHERE day = %(day)s AND archetype = %(archetype)s AND player_id = %(player_id)s
                """,
                key,
            ).fetchone()
            assert row is not None
            entry = self._daily_entry(result.archetype, row)
            rank, total = self._daily_rank(conn, day, entry)
        return DailySubmission(rank, total, entry.result, improved)

    def daily_board(
        self, day: date, archetype: str, limit: int, player_id: str | None
    ) -> DailyBoard:
        with self._conn() as conn:
            rows = conn.execute(
                f"""
                SELECT {self._DAILY_COLUMNS} FROM v2_daily_scores
                WHERE day = %s AND archetype = %s
                ORDER BY score DESC, achieved_at, player_id
                LIMIT %s
                """,
                (day, archetype, max(0, limit)),
            ).fetchall()
            ranked = [
                (rank, self._daily_entry(archetype, row)) for rank, row in enumerate(rows, start=1)
            ]
            me = next((pair for pair in ranked if pair[1].player_id == player_id), None)
            if me is None and player_id is not None:
                mine = conn.execute(
                    f"""
                    SELECT {self._DAILY_COLUMNS} FROM v2_daily_scores
                    WHERE day = %s AND archetype = %s AND player_id = %s
                    """,
                    (day, archetype, player_id),
                ).fetchone()
                if mine is not None:
                    entry = self._daily_entry(archetype, mine)
                    me = (self._daily_rank(conn, day, entry)[0], entry)
            total_row = conn.execute(
                "SELECT count(*) AS total FROM v2_daily_scores WHERE day = %s AND archetype = %s",
                (day, archetype),
            ).fetchone()
        total = int(total_row["total"]) if total_row is not None else 0
        return DailyBoard(total, ranked, me)

    # --- operator dashboard ----------------------------------------------------------------------------

    def admin_players(self, limit: int = MAX_PLAYERS) -> list[AdminPlayer]:
        # Pull only the handful of fields the dashboard shows (full blobs are up to 512 KB each).
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT player_id,
                  max(updated_at) FILTER (WHERE slot = 'profile') AS profile_at,
                  max(updated_at) FILTER (WHERE slot = 'run') AS run_at,
                  (array_agg(jsonb_build_object(
                    'playerName', data->'playerName', 'loops', data->'loops', 'wins', data->'wins',
                    'bestAct', data->'bestAct', 'totalEchoes', data->'totalEchoes',
                    'paradoxUnlocked', data->'paradoxUnlocked',
                    'unlocks_n', CASE WHEN jsonb_typeof(data->'unlocks') = 'array'
                                 THEN jsonb_array_length(data->'unlocks') END,
                    'endings_n', CASE WHEN jsonb_typeof(data->'endingsSeen') = 'array'
                                 THEN jsonb_array_length(data->'endingsSeen') END
                  )) FILTER (WHERE slot = 'profile'))[1] AS profile,
                  (array_agg(jsonb_build_object(
                    'archetype', data->'archetype', 'act', data->'act', 'paradox', data->'paradox',
                    'hp', data->'hp', 'maxHp', data->'maxHp', 'daily', data->'daily',
                    'floors', data->'tally'->'floors'
                  )) FILTER (WHERE slot = 'run'))[1] AS run
                FROM v2_saves GROUP BY player_id
                ORDER BY greatest(max(updated_at) FILTER (WHERE slot = 'profile'),
                                  max(updated_at) FILTER (WHERE slot = 'run')) DESC
                LIMIT %s
                """,
                (max(0, limit),),
            ).fetchall()
        return [
            AdminPlayer(
                player_id=str(row["player_id"]),
                profile=profile_summary(dict(row["profile"])) if row["profile"] else {},
                profile_updated_at=row["profile_at"],
                run=run_summary(dict(row["run"])) if row["run"] else None,
                run_updated_at=row["run_at"],
            )
            for row in rows
        ]

    def admin_runs(self, since: datetime, limit: int = MAX_RUN_ROWS) -> list[AdminRun]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT player_id, created_at, data->>'result' AS result, data->>'archetype' AS archetype,
                  data->>'act' AS act, data->>'floors' AS floors, data->>'echoes' AS echoes,
                  data->>'endingId' AS ending, data->>'killedBy' AS killed_by, data->>'daily' AS daily
                FROM v2_run_history WHERE created_at >= %s
                ORDER BY created_at DESC LIMIT %s
                """,
                (since, max(0, limit)),
            ).fetchall()
        return [
            run_from_fields(
                str(row["player_id"]),
                row["created_at"],
                result=row["result"],
                archetype=row["archetype"],
                act=row["act"],
                floors=row["floors"],
                echoes=row["echoes"],
                ending=row["ending"],
                killed_by=row["killed_by"],
                daily=row["daily"],
            )
            for row in rows
        ]

    def admin_daily(self, since: date) -> list[tuple[date, DailyEntry]]:
        with self._conn() as conn:
            rows = conn.execute(
                f"""
                SELECT day, archetype, {self._DAILY_COLUMNS} FROM v2_daily_scores
                WHERE day >= %s
                """,
                (since,),
            ).fetchall()
        return [(row["day"], self._daily_entry(str(row["archetype"]), row)) for row in rows]


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
    "MemoryV2Store",
    "PostgresV2Store",
    "SaveBlob",
    "Slot",
    "StoreHolder",
    "StoreUnavailableError",
    "V2Store",
    "build_store",
]
