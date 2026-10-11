-- Mythos 2.0 operator dashboard: AI GM calls per KST day / route / outcome (outcome 'llm' = a model answered,
-- anything else = the authored fallback was served). One upserted counter row each; no player ids, no text.
-- Idempotent; mythos_v2.store.SCHEMA_STATEMENTS runs the same statements on first use
-- (tests/test_v2_store.py keeps the two in sync).

CREATE TABLE IF NOT EXISTS v2_gm_usage (
  day DATE NOT NULL,
  route TEXT NOT NULL,
  outcome TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, route, outcome)
);
