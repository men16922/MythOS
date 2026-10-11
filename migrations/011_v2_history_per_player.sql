-- Mythos 2.0 run history is per player: the key becomes (player_id, id). Run ids come from the client
-- (`run-<loop>-<seed>`) and are not globally unique — every player shares the daily seed, and fresh
-- profiles with the same name/loop/echoes share a seed — so a global key made one player's record
-- block another's. Idempotent: re-keys only while the primary key still has a single column; the
-- advisory lock keeps concurrently starting instances from racing. mythos_v2.store.SCHEMA_STATEMENTS
-- runs the same statement on first use (tests/test_v2_store.py keeps the two in sync).

DO $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mythos.v2_run_history.rekey'));
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'v2_run_history'::regclass AND contype = 'p' AND cardinality(conkey) = 2
  ) THEN
    ALTER TABLE v2_run_history DROP CONSTRAINT IF EXISTS v2_run_history_pkey;
    ALTER TABLE v2_run_history ADD CONSTRAINT v2_run_history_pkey PRIMARY KEY (player_id, id);
  END IF;
END $$;
