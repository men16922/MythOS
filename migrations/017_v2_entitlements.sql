-- Mythos 2.0: Signal+ subscription per player, as last verified with Google Play (mythos_v2.billing). The purchase
-- token is kept to re-check renewals and refunds. Holds a player id, so account deletion erases it. Idempotent;
-- mythos_v2.store.SCHEMA_STATEMENTS runs the same statements on first use.

CREATE TABLE IF NOT EXISTS v2_entitlements (
  player_id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  state TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  purchase_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
