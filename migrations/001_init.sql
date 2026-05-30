CREATE TABLE IF NOT EXISTS players (
  player_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  traits JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS loops (
  loop_id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(player_id),
  seed TEXT NOT NULL,
  phase TEXT NOT NULL,
  location_id TEXT NOT NULL,
  stability INT NOT NULL CHECK (stability >= 0 AND stability <= 100),
  tension INT NOT NULL CHECK (tension >= 0 AND tension <= 100),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  state JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS scenes (
  scene_id TEXT PRIMARY KEY,
  loop_id TEXT NOT NULL REFERENCES loops(loop_id),
  turn_index INT NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  narration TEXT NOT NULL,
  choices JSONB NOT NULL,
  visual_brief TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (loop_id, turn_index)
);

CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  loop_id TEXT NOT NULL REFERENCES loops(loop_id),
  turn_index INT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  result TEXT,
  state_delta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS player_memories (
  memory_id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(player_id),
  kind TEXT NOT NULL,
  content JSONB NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS world_memories (
  memory_id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  content JSONB NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS narrative_shards (
  shard_id TEXT PRIMARY KEY,
  loop_id TEXT NOT NULL REFERENCES loops(loop_id),
  player_id TEXT NOT NULL REFERENCES players(player_id),
  symbol TEXT NOT NULL,
  emotional_tone TEXT NOT NULL,
  text TEXT NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  asset_id TEXT PRIMARY KEY,
  scene_id TEXT REFERENCES scenes(scene_id),
  loop_id TEXT NOT NULL REFERENCES loops(loop_id),
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  seed INT NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,
  steps INT NOT NULL,
  storage_uri TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loops_player_id ON loops(player_id);
CREATE INDEX IF NOT EXISTS idx_events_loop_turn ON events(loop_id, turn_index);
CREATE INDEX IF NOT EXISTS idx_scenes_loop_turn ON scenes(loop_id, turn_index);
CREATE INDEX IF NOT EXISTS idx_player_memories_player_kind ON player_memories(player_id, kind);
CREATE INDEX IF NOT EXISTS idx_assets_loop_id ON assets(loop_id);
