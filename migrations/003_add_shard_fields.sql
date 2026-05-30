ALTER TABLE narrative_shards ADD COLUMN kind TEXT NOT NULL DEFAULT 'general';
ALTER TABLE narrative_shards ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
