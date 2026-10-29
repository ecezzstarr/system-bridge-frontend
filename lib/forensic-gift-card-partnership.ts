import { sql } from '@/lib/db'

export async function ensureForensicGiftCardSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS weave_forensic_gift_card_partnerships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      participant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seller_name VARCHAR(180) NOT NULL,
      seller_business_name VARCHAR(180),
      carding_profile_reference VARCHAR(180) NOT NULL,
      authorization_note TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','active','paused','closed')),
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      reviewed_by UUID REFERENCES users(id),
      UNIQUE(participant_user_id, carding_profile_reference)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS weave_forensic_gift_card_partnerships_status_idx ON weave_forensic_gift_card_partnerships(status, submitted_at DESC)`
  await sql`
    CREATE TABLE IF NOT EXISTS weave_forensic_gift_card_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      partnership_id UUID NOT NULL REFERENCES weave_forensic_gift_card_partnerships(id) ON DELETE RESTRICT,
      transaction_reference VARCHAR(180) NOT NULL UNIQUE,
      gift_card_description VARCHAR(240) NOT NULL,
      gross_amount_ngn INTEGER NOT NULL CHECK (gross_amount_ngn > 0),
      carding_amount_ngn INTEGER NOT NULL DEFAULT 3000 CHECK (carding_amount_ngn = 3000),
      participant_share_ngn INTEGER NOT NULL DEFAULT 1500 CHECK (participant_share_ngn = 1500),
      weave_share_ngn INTEGER NOT NULL DEFAULT 1500 CHECK (weave_share_ngn = 1500),
      status VARCHAR(20) NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','verified','settled','reversed')),
      evidence_note TEXT NOT NULL,
      recorded_by UUID NOT NULL REFERENCES users(id),
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      verified_by UUID REFERENCES users(id),
      verified_at TIMESTAMPTZ
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS weave_forensic_gift_card_transactions_partnership_idx ON weave_forensic_gift_card_transactions(partnership_id, recorded_at DESC)`
}
