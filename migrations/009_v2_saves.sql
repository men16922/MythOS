-- Mythos 2.0 ("Signal Run") saves: one JSON blob per (player, slot) and an
-- append-only finished-run history. The v2 game is client-side; the server only
-- stores what the browser sends. Idempotent (safe to re-apply).
-- Canonical DDL: mythos_v2.store.SCHEMA_STATEMENTS runs the same statements on
-- first use because the Cloud Run image does not ship migrations/
-- (tests/test_v2_store.py keeps the two in sync).

CREATE TABLE IF NOT EXISTS v2_saves (
  player_id TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('profile', 'run')),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, slot)
);

CREATE TABLE IF NOT EXISTS v2_run_history (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_run_history_player_created
  ON v2_run_history(player_id, created_at DESC);
