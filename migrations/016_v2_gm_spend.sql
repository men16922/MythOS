-- Mythos 2.0: AI GM spend per signed-in player per KST month, in micro-USD (mythos_v2.budget). Holds a player
-- id, so account deletion erases it. Idempotent; mythos_v2.store.SCHEMA_STATEMENTS runs the same statements on
-- first use (tests/test_v2_store.py keeps the two in sync).

CREATE TABLE IF NOT EXISTS v2_gm_spend (
  player_id TEXT NOT NULL,
  month DATE NOT NULL,
  micro_usd BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, month)
);
