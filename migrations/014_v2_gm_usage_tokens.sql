-- Mythos 2.0 operator dashboard: billed tokens per GM usage row (prompt / output, thinking counted as output),
-- so the dashboard can show tokens and an estimated cost per day. Idempotent; mythos_v2.store.SCHEMA_STATEMENTS runs the
-- same statements on first use (tests/test_v2_store.py keeps the two in sync).

ALTER TABLE v2_gm_usage ADD COLUMN IF NOT EXISTS prompt_tokens BIGINT NOT NULL DEFAULT 0;
ALTER TABLE v2_gm_usage ADD COLUMN IF NOT EXISTS output_tokens BIGINT NOT NULL DEFAULT 0;
