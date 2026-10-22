-- WEAVE Agentic-Bridger: a permanent one-time Flame Coin purchase.
-- Existing monthly Continuance records remain historical and never authorize access.
CREATE TABLE IF NOT EXISTS bridger_agentic_purchases (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  paid_flame_coin numeric(20,6) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT NOW(),
  receipt_reference uuid NOT NULL DEFAULT gen_random_uuid()
);
CREATE INDEX IF NOT EXISTS bridger_agentic_purchases_paid_at_idx ON bridger_agentic_purchases(paid_at DESC);
