-- Cost and lifecycle accounting for the Weave Number Engine.
-- This separates prospect-funded infrastructure from provider-specific number leases.
CREATE TABLE IF NOT EXISTS weave_number_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number_id UUID REFERENCES weave_numbers(id) ON DELETE SET NULL,
  bridger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prospect_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('acquisition','renewal','message','refund','release','adjustment')),
  provider TEXT NOT NULL,
  provider_reference TEXT,
  units INTEGER NOT NULL DEFAULT 1,
  cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  funding_units NUMERIC(18,6) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weave_number_ledger_bridger_idx
  ON weave_number_ledger(bridger_id, created_at DESC);
CREATE INDEX IF NOT EXISTS weave_number_ledger_number_idx
  ON weave_number_ledger(number_id, created_at DESC);

ALTER TABLE weave_numbers
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acquisition_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'unverified';

CREATE INDEX IF NOT EXISTS weave_numbers_lease_idx
  ON weave_numbers(lease_expires_at)
  WHERE status <> 'released';
