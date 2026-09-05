-- narrative_shards is read by (player_id, created_at) two to three times per turn
-- (session snapshot facts, rollup, archive) with limit=1000; the FK alone does
-- not index it, so each call was a sequential scan + sort.
CREATE INDEX IF NOT EXISTS idx_narrative_shards_player_created
  ON narrative_shards(player_id, created_at DESC);
