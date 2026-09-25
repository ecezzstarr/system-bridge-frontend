-- Bridger daily free Prospect claim
-- One free Prospect per Bridger per calendar day.
-- prospect_id stores the active market_prospect_contacts id.
-- outreach_id links the claim into the same outreach flow as purchased Prospects.

CREATE TABLE IF NOT EXISTS bridger_daily_prospect_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bridger_id uuid NOT NULL,
  prospect_id uuid NOT NULL,
  outreach_id uuid,
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  claim_type varchar(32) NOT NULL DEFAULT 'daily_bonus',
  claimed_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (bridger_id, claim_date),
  UNIQUE (prospect_id)
);

ALTER TABLE bridger_daily_prospect_claims
  ADD COLUMN IF NOT EXISTS outreach_id uuid;

CREATE INDEX IF NOT EXISTS idx_daily_prospect_claims_bridger_date
  ON bridger_daily_prospect_claims(bridger_id, claim_date);
