-- WEAVE Email Lead Generator
-- Stages real contactable source records, then generates cryptographic outreach
-- inventory for Administration and Bridger pools without fabricating addresses.

CREATE TABLE IF NOT EXISTS weave_email_lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160),
  email VARCHAR(255) NOT NULL UNIQUE,
  source VARCHAR(120) NOT NULL,
  consent_basis VARCHAR(160) NOT NULL,
  contactable BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(24) NOT NULL DEFAULT 'ready',
  created_by UUID NOT NULL REFERENCES users(id),
  generated_at TIMESTAMPTZ,
  generated_lead_id UUID REFERENCES weave_email_prospect_leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE weave_email_prospect_leads
  ADD COLUMN IF NOT EXISTS pool VARCHAR(20) NOT NULL DEFAULT 'bridger';

ALTER TABLE weave_email_prospect_leads
  ADD COLUMN IF NOT EXISTS source_id UUID;

CREATE INDEX IF NOT EXISTS idx_weave_email_lead_sources_ready
  ON weave_email_lead_sources(status,contactable,created_at);

CREATE INDEX IF NOT EXISTS idx_weave_email_leads_pool
  ON weave_email_prospect_leads(pool,status,contactable,created_at);
