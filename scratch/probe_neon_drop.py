"""Reproduce the Neon idle-reap turn swallow at the store seam.

Simulates Neon's AdminShutdown ("terminating connection due to administrator
command") with pg_terminate_backend against local docker postgres, then
contrasts the two access paths:

  A) single statement (depth 0)      -> _run_query retry SHOULD recover
  B) store.transaction() unit (BEGIN) -> expected to FAIL (the live incident)

Run:  .venv/bin/python scratch/probe_neon_drop.py
"""

from __future__ import annotations

import os

os.environ.setdefault("MYTHOS_LOG_LEVEL", "ERROR")
os.environ["DATABASE_URL"] = "postgresql://mythos:mythos@localhost:5432/mythos"

import psycopg

from mythos_memory.postgres_store import PostgresMythOSStore
from mythos_memory.store import StoreError

ADMIN_URL = "postgresql://mythos:mythos@localhost:5432/mythos"


def kill_app_backends() -> int:
    """Terminate every backend of the app user except our admin session."""
    with psycopg.connect(ADMIN_URL, autocommit=True) as admin:
        rows = admin.execute(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = 'mythos' AND pid <> pg_backend_pid()"
        ).fetchall()
    return len(rows)


def scenario(label: str, use_transaction: bool) -> str:
    store = PostgresMythOSStore()
    # 1) healthy use: checkout + query so the store holds a live connection
    store._fetchone("SELECT 1 AS ok", ())
    # 2) Neon reaps it while idle (kills the server side of the held socket)
    killed = kill_app_backends()
    # 3) next player action
    try:
        if use_transaction:
            with store.transaction():
                store._fetchone("SELECT 1 AS ok", ())
        else:
            store._fetchone("SELECT 1 AS ok", ())
        result = "RECOVERED"
    except StoreError as exc:
        result = f"FAILED: {str(exc).strip()[:80]}"
    finally:
        store.close()
    return f"{label:<28} killed={killed}  -> {result}"


def pooled_dead_conn_scenario() -> str:
    """The 06:16:17 shape: conn dies while sitting IN the pool, next checkout gets it."""
    s1 = PostgresMythOSStore()
    s1._fetchone("SELECT 1 AS ok", ())
    s1.close()  # returns the (alive) conn to the pool
    killed = kill_app_backends()  # dies while idle in pool
    s2 = PostgresMythOSStore()
    try:
        with s2.transaction():
            s2._fetchone("SELECT 1 AS ok", ())
        result = "RECOVERED"
    except StoreError as exc:
        result = f"FAILED: {str(exc).strip()[:80]}"
    finally:
        s2.close()
    return f"{'pool-dead -> transaction()':<28} killed={killed}  -> {result}"


if __name__ == "__main__":
    print(scenario("held-dead -> single stmt", use_transaction=False))
    print(scenario("held-dead -> transaction()", use_transaction=True))
    print(pooled_dead_conn_scenario())
    PostgresMythOSStore.close_pool()
