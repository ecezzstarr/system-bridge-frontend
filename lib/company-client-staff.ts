import { createHash } from 'node:crypto'
import { sql } from '@/lib/db'

export type CompanyStaffTier = 'standard' | 'pro' | 'premium'

/** Employee invitation tickets are USDT company-entry records, never retail File Folder purchases. */
export function tierFromStaffTicketUSDT(value: unknown): CompanyStaffTier | null {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) return null
  if (amount > 5000) return 'premium'
  if (amount >= 150) return 'pro'
  return 'standard'
}

export function staffOfferTokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function ensureCompanyClientStaffSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS company_client_staff_offers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      token_hash varchar(64) NOT NULL UNIQUE,
      candidate_name varchar(255) NOT NULL,
      candidate_email varchar(255) NOT NULL,
      candidate_phone varchar(80),
      position_title varchar(160) NOT NULL,
      monthly_salary_usdt numeric(16,2) NOT NULL DEFAULT 0,
      ticket_amount_usdt numeric(16,2) NOT NULL,
      folder_tier varchar(12) NOT NULL CHECK (folder_tier IN ('standard','pro','premium')),
      status varchar(32) NOT NULL DEFAULT 'offered'
        CHECK (status IN ('offered','accepted','pending_verification','approved','rejected','withdrawn')),
      payment_reference varchar(255),
      payment_network varchar(80),
      file_number varchar(120) UNIQUE,
      client_id uuid UNIQUE,
      receipt_number varchar(80) UNIQUE,
      created_by uuid NOT NULL,
      verified_by uuid,
      rejection_reason varchar(500),
      created_at timestamptz NOT NULL DEFAULT now(),
      accepted_at timestamptz,
      submitted_at timestamptz,
      verified_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS company_staff_offers_email_idx ON company_client_staff_offers(lower(candidate_email))`
  await sql`CREATE INDEX IF NOT EXISTS company_staff_offers_status_idx ON company_client_staff_offers(status,created_at DESC)`
  await sql`
    CREATE TABLE IF NOT EXISTS company_client_staff_work (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id uuid NOT NULL REFERENCES company_client_staff_offers(id),
      client_id uuid NOT NULL REFERENCES users(id),
      prospect_name varchar(160) NOT NULL,
      organization varchar(200),
      stage varchar(32) NOT NULL DEFAULT 'introduced'
        CHECK(stage IN ('introduced','conversation','follow_up','proposal','completed')),
      next_action varchar(1200),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS company_client_staff_work_owner_idx ON company_client_staff_work(client_id,created_at DESC)`
}

export async function getCompanyStaffOfferByToken(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null
  await ensureCompanyClientStaffSchema()
  const rows = await sql`
    SELECT id,candidate_name,candidate_email,position_title,monthly_salary_usdt,
      ticket_amount_usdt,folder_tier,status,file_number,receipt_number,rejection_reason,created_at
    FROM company_client_staff_offers
    WHERE token_hash=${staffOfferTokenHash(token)}
    LIMIT 1
  `
  return rows[0] || null
}
