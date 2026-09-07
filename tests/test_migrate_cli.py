"""Docker-free checks for the psql-free migration entry point (mythos_memory.migrate)."""

from __future__ import annotations

import io
import os
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest import mock

from mythos_memory import migrate

ROOT = Path(__file__).resolve().parents[1]
MIGRATION_008 = ROOT / "migrations" / "008_narrative_shards_player_index.sql"


class MigrateCliTest(unittest.TestCase):
    def test_refuses_to_run_without_a_database_url(self) -> None:
        env = {
            k: v for k, v in os.environ.items() if k not in ("MYTHOS_MIGRATION_URL", "DATABASE_URL")
        }
        with mock.patch.dict(os.environ, env, clear=True), redirect_stderr(io.StringIO()) as err:
            rc = migrate.main([str(MIGRATION_008)])
        self.assertEqual(rc, 2)
        self.assertIn("MYTHOS_MIGRATION_URL", err.getvalue())

    def test_missing_file_is_an_error_before_any_connection(self) -> None:
        with (
            mock.patch.dict(os.environ, {"MYTHOS_MIGRATION_URL": "postgresql://x"}),
            mock.patch.object(migrate, "apply_migration") as apply,
            redirect_stderr(io.StringIO()),
        ):
            rc = migrate.main([str(ROOT / "migrations" / "999_nope.sql")])
        self.assertEqual(rc, 2)
        apply.assert_not_called()

    def test_verify_index_result_drives_the_exit_code(self) -> None:
        with mock.patch.dict(os.environ, {"MYTHOS_MIGRATION_URL": "postgresql://x"}):
            with mock.patch.object(migrate, "apply_migration", return_value=True) as apply:
                self.assertEqual(migrate.main([str(MIGRATION_008), "--verify-index", "idx_x"]), 0)
            apply.assert_called_once_with("postgresql://x", MIGRATION_008, "idx_x")
            with mock.patch.object(migrate, "apply_migration", return_value=False):
                self.assertEqual(migrate.main([str(MIGRATION_008), "--verify-index", "idx_x"]), 1)

    def test_migration_008_is_idempotent_sql(self) -> None:
        self.assertIn("CREATE INDEX IF NOT EXISTS", MIGRATION_008.read_text())


if __name__ == "__main__":
    unittest.main()
