-- WEAVE Email Prospect Candidate Engine
-- Mirrors the Prospect number engine model: Administration supplies a seed,
-- the engine creates unverified candidate addresses, and live outreach/response
-- is what establishes reachability.

ALTER TABLE weave_email_prospect_leads
  ADD COLUMN IF NOT EXISTS pool VARCHAR(20) NOT NULL DEFAULT 'bridger';

ALTER TABLE weave_email_prospect_leads
  ADD COLUMN IF NOT EXISTS series_id UUID;

CREATE INDEX IF NOT EXISTS idx_weave_email_leads_pool
  ON weave_email_prospect_leads(pool,status,contactable,created_at);

CREATE TABLE IF NOT EXISTS weave_email_candidate_series (
  id UUID PRIMARY KEY,
  seed_email VARCHAR(255) NOT NULL,
  domain VARCHAR(190) NOT NULL,
  local_prefix VARCHAR(120) NOT NULL,
  generator VARCHAR(40) NOT NULL DEFAULT 'crypto_series_v1',
  destination VARCHAR(20) NOT NULL,
  requested_count INTEGER NOT NULL,
  generated_count INTEGER NOT NULL DEFAULT 0,
  nonce VARCHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'completed',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weave_email_candidate_series_created
  ON weave_email_candidate_series(created_at DESC);
