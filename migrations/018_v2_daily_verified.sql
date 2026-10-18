-- Mythos 2.0: server-side replay verdict of a player's stored daily best (mythos_v2.replay re-runs the recorded
-- actions with the game's own engine). NULL = no replay or no verifier; it is a badge, not a ranking rule.
-- Idempotent; mythos_v2.store.SCHEMA_STATEMENTS runs the same statement on first use.

ALTER TABLE v2_daily_scores ADD COLUMN IF NOT EXISTS verified BOOLEAN;
