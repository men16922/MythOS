"""Independent PostgreSQL report expiry job: ``python -m mythos_v2.report_retention [--apply]``.

Dry-run is the default. Requires an explicit DATABASE_URL; never falls back to a memory store,
creates schema, reads report text, or prints a DSN. Scheduling/deployment is an operator action.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import psycopg

from mythos_v2.store import GM_REPORT_KEEP_DAYS

_EXPIRED = "created_at < now() - make_interval(days => %s)"


def run(database_url: str, *, apply: bool = False) -> dict[str, int | str]:
    """Count or delete expired reports in one transaction, using the database's clock.

    Only v2_gm_reports is touched; an absent schema or unavailable DB is a hard failure.
    Repeated applies are safe. Timeouts bound a blocked job instead of silently skipping it.
    """
    with psycopg.connect(database_url, connect_timeout=10) as conn:
        if not apply:
            conn.execute("SET TRANSACTION READ ONLY")
        conn.execute("SET LOCAL TIME ZONE 'UTC'")
        conn.execute("SET LOCAL statement_timeout = '60s'")
        conn.execute("SET LOCAL lock_timeout = '5s'")
        if apply:
            cursor = conn.execute(
                f"DELETE FROM v2_gm_reports WHERE {_EXPIRED}", (GM_REPORT_KEEP_DAYS,)
            )
            count = cursor.rowcount
        else:
            row = conn.execute(
                f"SELECT count(*) FROM v2_gm_reports WHERE {_EXPIRED}", (GM_REPORT_KEEP_DAYS,)
            ).fetchone()
            assert row is not None
            count = int(row[0])
    return {
        "action": "apply" if apply else "dry-run",
        "retention_days": GM_REPORT_KEEP_DAYS,
        "expired_reports": count,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply", action="store_true", help="Delete expired reports (default: count only)"
    )
    args = parser.parse_args(argv)
    url = (os.getenv("DATABASE_URL") or "").strip()
    if not url:
        print("report retention: DATABASE_URL must be explicitly configured", file=sys.stderr)
        return 2
    try:
        result = run(url, apply=args.apply)
    except psycopg.Error:
        # Driver exceptions can contain credentials, hosts or SQL. Log no exception text.
        print(
            "report retention: database operation failed; no successful purge recorded",
            file=sys.stderr,
        )
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
