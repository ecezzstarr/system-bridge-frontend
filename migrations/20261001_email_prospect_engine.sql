-- WEAVE unified email Prospect movement.
-- Email is a channel inside the existing Prospect Engine, not a second marketplace.

ALTER TABLE market_prospect_contacts ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE market_prospect_contacts ADD COLUMN IF NOT EXISTS email varchar(255);
ALTER TABLE market_prospect_contacts ADD COLUMN IF NOT EXISTS channel varchar(20) NOT NULL DEFAULT 'whatsapp';
ALTER TABLE market_prospect_contacts ADD COLUMN IF NOT EXISTS contact_fingerprint varchar(64);

ALTER TABLE market_prospect_packages ADD COLUMN IF NOT EXISTS channel varchar(20) NOT NULL DEFAULT 'whatsapp';

ALTER TABLE market_prospect_outreach ADD COLUMN IF NOT EXISTS channel varchar(20) NOT NULL DEFAULT 'whatsapp';
ALTER TABLE market_prospect_outreach ADD COLUMN IF NOT EXISTS sender_mailbox_id uuid;
ALTER TABLE market_prospect_outreach ADD COLUMN IF NOT EXISTS provider_message_id varchar(255);
ALTER TABLE market_prospect_outreach ADD COLUMN IF NOT EXISTS delivery_error text;
ALTER TABLE market_prospect_outreach ADD COLUMN IF NOT EXISTS reply_detected_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_prospect_contact_fingerprint
ON market_prospect_contacts(contact_fingerprint)
WHERE contact_fingerprint IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_prospect_email_unique
ON market_prospect_contacts(LOWER(email))
WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS weave_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_role varchar(32) NOT NULL,
  email varchar(255) NOT NULL,
  provider varchar(32) NOT NULL DEFAULT 'google',
  credential_ciphertext text NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'connected',
  verified_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(owner_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weave_mailboxes_email ON weave_mailboxes(LOWER(email));
