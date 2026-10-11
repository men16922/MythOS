-- Mythos 2.0 daily-seed leaderboard: each player's best result per (KST date, archetype).
-- Results are client-reported (plausibility-checked by /api/v2, not replayed). The ranking keys of
-- engine/daily.ts isBetterDaily are packed into `score` (higher = better, see mythos_v2.daily) so a
-- board is one index range: score DESC, then first achieved (`achieved_at`), then player_id.
-- `achieved_at` moves only when the best improves; `updated_at` on every submit (name changes too).
-- Idempotent (safe to re-apply). mythos_v2.store.SCHEMA_STATEMENTS runs the same statements on first
-- use (tests/test_v2_store.py keeps the two in sync).

CREATE TABLE IF NOT EXISTS v2_daily_scores (
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
);

CREATE INDEX IF NOT EXISTS idx_v2_daily_scores_board
  ON v2_daily_scores(day, archetype, score DESC, achieved_at, player_id);
