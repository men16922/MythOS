"""Expiry command safety and opt-in, isolated PostgreSQL acceptance (no live reports)."""

from __future__ import annotations

import contextlib
import io
import json
import os
import unittest
import uuid
from unittest import mock

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo

from mythos_v2 import report_retention


class CommandTest(unittest.TestCase):
    def test_missing_database_fails_without_store_fallback(self) -> None:
        with (
            mock.patch.dict(os.environ, {"DATABASE_URL": ""}),
            mock.patch.object(report_retention, "run") as run,
            contextlib.redirect_stderr(io.StringIO()),
        ):
            self.assertEqual(report_retention.main([]), 2)
            run.assert_not_called()

    def test_default_is_dry_run_and_apply_is_explicit(self) -> None:
        for args, apply in (([], False), (["--apply"], True)):
            out = io.StringIO()
            result = {"action": "apply" if apply else "dry-run", "expired_reports": 2}
            with (
                mock.patch.dict(os.environ, {"DATABASE_URL": "test-dsn"}),
                mock.patch.object(report_retention, "run", return_value=result) as run,
                contextlib.redirect_stdout(out),
            ):
                self.assertEqual(report_retention.main(args), 0)
            run.assert_called_once_with("test-dsn", apply=apply)
            self.assertEqual(json.loads(out.getvalue()), result)

    def test_database_failure_is_nonzero_and_does_not_disclose_driver_text(self) -> None:
        err, out = io.StringIO(), io.StringIO()
        with (
            mock.patch.dict(os.environ, {"DATABASE_URL": "test-dsn"}),
            mock.patch.object(
                report_retention,
                "run",
                side_effect=psycopg.OperationalError("private-connection-info"),
            ),
            contextlib.redirect_stderr(err),
            contextlib.redirect_stdout(out),
        ):
            self.assertEqual(report_retention.main(["--apply"]), 1)
        self.assertNotIn("private-connection-info", err.getvalue())
        self.assertEqual(out.getvalue(), "")


@unittest.skipUnless(
    os.getenv("MYTHOS_RETENTION_TEST_DATABASE_URL"), "isolated retention DB not configured"
)
class PostgresRetentionTest(unittest.TestCase):
    def setUp(self) -> None:
        self.url = os.environ["MYTHOS_RETENTION_TEST_DATABASE_URL"]
        self.schema = "retention_qa_" + uuid.uuid4().hex
        with psycopg.connect(self.url) as conn:
            conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(self.schema)))
        self.addCleanup(self.drop_schema)
        self.isolated = make_conninfo(self.url, options=f"-c search_path={self.schema}")
        with psycopg.connect(self.isolated) as conn:
            conn.execute(
                "CREATE TABLE v2_gm_reports (id integer PRIMARY KEY, created_at timestamptz NOT NULL, text text)"
            )
            conn.execute("CREATE TABLE v2_saves (id integer PRIMARY KEY, data text)")
            conn.execute("INSERT INTO v2_saves VALUES (1, 'synthetic save must survive')")
            conn.execute(
                "INSERT INTO v2_gm_reports VALUES (1, now() - interval '91 days', 'old'), (2, now() - interval '89 days', 'recent'), (3, now() + interval '1 day', 'future'), (4, now() - interval '90 days' + interval '5 minutes', 'inside boundary'), (5, now() - interval '90 days' - interval '5 minutes', 'outside boundary')"
            )

    def drop_schema(self) -> None:
        with psycopg.connect(self.url) as conn:
            conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(self.schema)))

    def ids(self) -> list[int]:
        with psycopg.connect(self.isolated) as conn:
            return [r[0] for r in conn.execute("SELECT id FROM v2_gm_reports ORDER BY id")]

    def test_dry_run_preserves_rows_then_apply_purges_without_any_new_report(self) -> None:
        self.assertEqual(report_retention.run(self.isolated)["expired_reports"], 2)
        self.assertEqual(self.ids(), [1, 2, 3, 4, 5])
        self.assertEqual(report_retention.run(self.isolated, apply=True)["expired_reports"], 2)
        self.assertEqual(self.ids(), [2, 3, 4])
        self.assertEqual(report_retention.run(self.isolated, apply=True)["expired_reports"], 0)
        with psycopg.connect(self.isolated) as conn:
            self.assertEqual(conn.execute("SELECT count(*) FROM v2_saves").fetchone(), (1,))

    def test_cli_applies_to_the_configured_database(self) -> None:
        with (
            mock.patch.dict(os.environ, {"DATABASE_URL": self.isolated}),
            contextlib.redirect_stdout(io.StringIO()) as out,
        ):
            self.assertEqual(report_retention.main(["--apply"]), 0)
        self.assertEqual(json.loads(out.getvalue())["expired_reports"], 2)
        self.assertEqual(self.ids(), [2, 3, 4])

    def test_missing_schema_is_not_created(self) -> None:
        missing = make_conninfo(self.url, options="-c search_path=missing_retention_qa_schema")
        with self.assertRaises(psycopg.errors.UndefinedTable):
            report_retention.run(missing, apply=True)
