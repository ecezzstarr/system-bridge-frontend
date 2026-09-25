-- Every Client carries three separate money layers:
-- 1. Client Vault: Administration-controlled Flame Coin value.
-- 2. Siblings Funds Wallet: funds belonging to sibling/participation movement.
-- 3. Main Client Wallet: the existing primary WEAVE wallet.

CREATE TABLE IF NOT EXISTS client_sibling_funds_wallets (
  client_id uuid PRIMARY KEY,
  balance_flame_coin numeric(30, 8) NOT NULL DEFAULT 0,
  balance_trx numeric(30, 8) NOT NULL DEFAULT 0,
  balance_usdt numeric(30, 8) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_sibling_funds_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entry_type varchar(48) NOT NULL,
  amount numeric(30, 8) NOT NULL,
  currency varchar(16) NOT NULL,
  balance_after numeric(30, 8) NOT NULL,
  source varchar(120) NOT NULL,
  reference varchar(255),
  reason text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_sibling_funds_ledger_client_time
ON client_sibling_funds_ledger(client_id, created_at DESC);

INSERT INTO client_vaults (client_id, balance, currency)
SELECT id, 0, 'Flame Coin'
FROM users
WHERE role = 'client'
ON CONFLICT (client_id) DO NOTHING;

INSERT INTO client_sibling_funds_wallets (
  client_id,
  balance_flame_coin,
  balance_trx,
  balance_usdt
)
SELECT id, 0, 0, 0
FROM users
WHERE role = 'client'
ON CONFLICT (client_id) DO NOTHING;

INSERT INTO wallets (
  id,
  user_id,
  balance_trx,
  balance_usdt,
  is_primary,
  is_eight_engine_controlled,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  c.id,
  0,
  0,
  true,
  true,
  NOW(),
  NOW()
FROM users c
WHERE c.role = 'client'
  AND NOT EXISTS (
    SELECT 1
    FROM wallets w
    WHERE w.user_id = c.id
      AND w.is_primary = true
  );
