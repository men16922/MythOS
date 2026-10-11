-- Mythos 2.0 operator dashboard: when a player first saved (new players per day). Existing rows get the time
-- this runs, which is the closest honest answer — production had no real players yet. Idempotent;
-- mythos_v2.store.SCHEMA_STATEMENTS runs the same statement on first use (tests/test_v2_store.py keeps the two in sync).

ALTER TABLE v2_saves ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
