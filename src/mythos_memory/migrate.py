"""Apply one SQL migration file to the database named by ``MYTHOS_MIGRATION_URL``
(falling back to ``DATABASE_URL``).

Local development applies every file with psql inside the Postgres container
(``make db-migrate``); this is the psql-free path for the production Neon
database, where the host has no psql. One file, one transaction; the file is
expected to be idempotent (``IF NOT EXISTS``) so a re-run is harmless.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import psycopg


def apply_migration(url: str, file: Path, verify_index: str | None = None) -> bool:
    """Run ``file`` in one transaction; return whether ``verify_index`` exists afterwards
    (``True`` when no index name was given)."""
    with psycopg.connect(url) as conn, conn.cursor() as cur:
        cur.execute(file.read_text(encoding="utf-8"))
        if verify_index is None:
            return True
        cur.execute("SELECT 1 FROM pg_indexes WHERE indexname = %s", (verify_index,))
        return cur.fetchone() is not None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path, help="migration .sql file to apply")
    parser.add_argument(
        "--verify-index", default=None, help="index name that must exist after the file ran"
    )
    args = parser.parse_args(argv)
    url = os.environ.get("MYTHOS_MIGRATION_URL") or os.environ.get("DATABASE_URL")
    if not url:
        print("migrate: set MYTHOS_MIGRATION_URL (or DATABASE_URL)", file=sys.stderr)
        return 2
    if not args.file.is_file():
        print(f"migrate: {args.file} not found", file=sys.stderr)
        return 2
    ok = apply_migration(url, args.file, args.verify_index)
    print(f"applied {args.file}")
    if args.verify_index is not None:
        print(f"index {args.verify_index}: {'present' if ok else 'MISSING'}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
