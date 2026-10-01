-- WEAVE Email Outreach
-- Administration-managed contactable email inventory with cryptographic lead references.
-- Runtime code also self-bootstraps these tables idempotently.

CREATE TABLE IF NOT EXISTS weave_email_senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  reply_email VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL DEFAULT 'WEAVE',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weave_email_prospect_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160),
  email VARCHAR(255) NOT NULL UNIQUE,
  source VARCHAR(120) NOT NULL,
  consent_basis VARCHAR(160) NOT NULL,
  contactable BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(24) NOT NULL DEFAULT 'available',
  owned_by UUID REFERENCES users(id),
  acquired_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weave_email_leads_status
  ON weave_email_prospect_leads(status, contactable, created_at);
CREATE INDEX IF NOT EXISTS idx_weave_email_leads_owner
  ON weave_email_prospect_leads(owned_by, created_at DESC);

CREATE TABLE IF NOT EXISTS weave_email_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES weave_email_prospect_leads(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id),
  sender_id UUID REFERENCES weave_email_senders(id),
  mode VARCHAR(20) NOT NULL,
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  failure_reason TEXT,
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weave_email_outreach_actor
  ON weave_email_outreach(actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS weave_email_outreach_automation (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  daily_limit INTEGER NOT NULL DEFAULT 120,
  subject_template TEXT NOT NULL DEFAULT 'A place to build what you are already moving',
  message_template TEXT NOT NULL DEFAULT 'Hello {{name}}, I am reaching out from WEAVE. We work with people around something they are already trying to build, sell, organize or move forward. If that matches something you are carrying, reply and we can open the right path.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
