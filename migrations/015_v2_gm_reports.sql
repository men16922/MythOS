-- Mythos 2.0: AI lines players flagged as offensive (Google Play AI-generated content policy: in-app reporting).
-- Only the flagged line and where it came from — no player id, so account deletion has nothing to erase here.
-- Rows older than 90 days are pruned on insert. Idempotent; mythos_v2.store.SCHEMA_STATEMENTS runs the same
-- statements on first use (tests/test_v2_store.py keeps the two in sync).

CREATE TABLE IF NOT EXISTS v2_gm_reports (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  route TEXT NOT NULL,
  kind TEXT NOT NULL,
  lang TEXT NOT NULL,
  text TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_v2_gm_reports_created ON v2_gm_reports(created_at DESC);
