CREATE TABLE IF NOT EXISTS weave_forensic_gift_card_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_name VARCHAR(180) NOT NULL,
  seller_business_name VARCHAR(180),
  carding_profile_reference VARCHAR(180) NOT NULL,
  authorization_note TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','paused','closed')),
  carding_amount_ngn INTEGER NOT NULL DEFAULT 3000 CHECK (carding_amount_ngn = 3000),
  participant_carding_share_ngn INTEGER NOT NULL DEFAULT 1500 CHECK (participant_carding_share_ngn = 1500),
  weave_carding_share_ngn INTEGER NOT NULL DEFAULT 1500 CHECK (weave_carding_share_ngn = 1500),
  carding_settlement_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (carding_settlement_status IN ('pending','recorded','verified','settled')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  UNIQUE(participant_user_id, carding_profile_reference)
);
CREATE INDEX IF NOT EXISTS weave_forensic_gift_card_partnerships_status_idx
  ON weave_forensic_gift_card_partnerships(status, submitted_at DESC);
CREATE TABLE IF NOT EXISTS weave_forensic_gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES weave_forensic_gift_card_partnerships(id) ON DELETE RESTRICT,
  transaction_reference VARCHAR(180) NOT NULL UNIQUE,
  gift_card_description VARCHAR(240) NOT NULL,
  gross_amount_ngn INTEGER NOT NULL CHECK (gross_amount_ngn > 0),
  carding_amount_ngn INTEGER NOT NULL DEFAULT 0 CHECK (carding_amount_ngn >= 0),
  participant_share_ngn INTEGER NOT NULL DEFAULT 0 CHECK (participant_share_ngn >= 0),
  weave_share_ngn INTEGER NOT NULL DEFAULT 0 CHECK (weave_share_ngn >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'recorded'
    CHECK (status IN ('recorded','verified','settled','reversed')),
  evidence_note TEXT NOT NULL,
  recorded_by UUID NOT NULL REFERENCES users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS weave_forensic_gift_card_transactions_partnership_idx
  ON weave_forensic_gift_card_transactions(partnership_id, recorded_at DESC);

ALTER TABLE weave_forensic_gift_card_partnerships ADD COLUMN IF NOT EXISTS carding_amount_ngn INTEGER NOT NULL DEFAULT 3000 CHECK (carding_amount_ngn = 3000);
ALTER TABLE weave_forensic_gift_card_partnerships ADD COLUMN IF NOT EXISTS participant_carding_share_ngn INTEGER NOT NULL DEFAULT 1500 CHECK (participant_carding_share_ngn = 1500);
ALTER TABLE weave_forensic_gift_card_partnerships ADD COLUMN IF NOT EXISTS weave_carding_share_ngn INTEGER NOT NULL DEFAULT 1500 CHECK (weave_carding_share_ngn = 1500);
ALTER TABLE weave_forensic_gift_card_partnerships ADD COLUMN IF NOT EXISTS carding_settlement_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (carding_settlement_status IN ('pending','recorded','verified','settled'));
ALTER TABLE weave_forensic_gift_card_transactions ALTER COLUMN carding_amount_ngn SET DEFAULT 0;
ALTER TABLE weave_forensic_gift_card_transactions ALTER COLUMN participant_share_ngn SET DEFAULT 0;
ALTER TABLE weave_forensic_gift_card_transactions ALTER COLUMN weave_share_ngn SET DEFAULT 0;

-- Company Escrow / Regional Manager Trust gate for each carding profile.
CREATE TABLE IF NOT EXISTS weave_forensic_gift_card_trust (
  partnership_id UUID PRIMARY KEY REFERENCES weave_forensic_gift_card_partnerships(id) ON DELETE CASCADE,
  participant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  regional_manager_user_id UUID NOT NULL REFERENCES weave_regional_manager_appointments(user_id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS weave_forensic_gift_card_trust_manager_idx ON weave_forensic_gift_card_trust(regional_manager_user_id,status);
ALTER TABLE weave_forensic_gift_card_transactions ADD COLUMN IF NOT EXISTS participant_agreed_share_ngn INTEGER NOT NULL DEFAULT 1500 CHECK (participant_agreed_share_ngn >= 0);
ALTER TABLE weave_forensic_gift_card_transactions ADD COLUMN IF NOT EXISTS company_settlement_amount_ngn INTEGER NOT NULL DEFAULT 0 CHECK (company_settlement_amount_ngn >= 0);
ALTER TABLE weave_forensic_gift_card_transactions ADD COLUMN IF NOT EXISTS company_settlement_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (company_settlement_status IN ('pending','sent','verified','held','investigation'));
ALTER TABLE weave_forensic_gift_card_transactions ADD COLUMN IF NOT EXISTS company_settlement_evidence TEXT;
ALTER TABLE weave_forensic_gift_card_transactions ADD COLUMN IF NOT EXISTS settlement_verified_by UUID REFERENCES users(id);
ALTER TABLE weave_forensic_gift_card_transactions ADD COLUMN IF NOT EXISTS settlement_verified_at TIMESTAMPTZ;
ALTER TABLE weave_forensic_gift_card_transactions ADD COLUMN IF NOT EXISTS responsible_regional_manager_user_id UUID REFERENCES users(id);
ALTER TABLE weave_forensic_gift_card_transactions ADD COLUMN IF NOT EXISTS accountability_review_status VARCHAR(20) NOT NULL DEFAULT 'not_required' CHECK (accountability_review_status IN ('not_required','pending_review','approved_deduction','rejected'));
ALTER TABLE weave_forensic_gift_card_transactions ADD COLUMN IF NOT EXISTS accountability_review_note TEXT;
