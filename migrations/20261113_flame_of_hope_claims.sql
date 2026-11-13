-- Flame of Hope promotional rewards are paid only from a funded Administrations wallet.
-- Unique claim-day per Bridger prevents double reward credits, including mobile retries.
CREATE TABLE IF NOT EXISTS weave_flame_of_hope_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bridger_id uuid NOT NULL REFERENCES users(id),
  event_key varchar(48) NOT NULL,
  claim_day date NOT NULL,
  source_kind varchar(32) NOT NULL,
  source_id text NOT NULL,
  reward_system_switch integer NOT NULL CHECK (reward_system_switch BETWEEN 1 AND 8),
  treasury_user_id uuid NOT NULL REFERENCES users(id),
  claimed_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (bridger_id, event_key, claim_day)
);
CREATE INDEX IF NOT EXISTS weave_flame_of_hope_event_claimed_idx ON weave_flame_of_hope_claims(event_key,claimed_at DESC);
