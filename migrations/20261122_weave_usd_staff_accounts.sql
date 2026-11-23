-- WEAVE USD accounting: additive migration only.
-- Original System Switch / TRX accounts and historical deposits are preserved.
-- Apply before activating WEAVE_USD_DEPOSIT_ENABLED. No balance rewrites.
BEGIN;
CREATE TABLE IF NOT EXISTS weave_user_currency_preferences(
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_currency varchar(3) NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS weave_usd_deposit_quotes(
  deposit_id uuid PRIMARY KEY REFERENCES deposits(id),
  user_id uuid NOT NULL REFERENCES users(id),
  amount_ngn numeric(30,2) NOT NULL CHECK(amount_ngn>0),
  amount_usd numeric(30,2) NOT NULL CHECK(amount_usd>0),
  ngn_per_usd numeric(30,8) NOT NULL CHECK(ngn_per_usd>0),
  rate_source varchar(80) NOT NULL,
  rate_updated_at timestamptz NOT NULL,
  quoted_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS weave_usd_wallets(
  user_id uuid PRIMARY KEY REFERENCES users(id),
  balance_usd numeric(30,2) NOT NULL DEFAULT 0 CHECK(balance_usd>=0),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS weave_usd_ledger(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  deposit_id uuid NOT NULL UNIQUE REFERENCES deposits(id),
  entry_type varchar(32) NOT NULL CHECK(entry_type='deposit'),
  amount_usd numeric(30,2) NOT NULL CHECK(amount_usd>0),
  balance_after_usd numeric(30,2) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_weave_usd_ledger_account
 ON weave_usd_ledger(user_id,created_at DESC);
COMMIT;
