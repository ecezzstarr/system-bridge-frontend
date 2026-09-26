import { getSql } from '@/lib/db'

export async function ensureBridgerNumberEngineSchema(sql = getSql()) {
  await sql`
    CREATE TABLE IF NOT EXISTS bridger_whatsapp_numbers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_e164 varchar(32) NOT NULL UNIQUE,
      country varchar(100) NOT NULL,
      provider varchar(160) NOT NULL DEFAULT 'Aphone',
      provider_reference varchar(220),
      acquisition_cost numeric(30,8) CHECK (acquisition_cost >= 0),
      price_flame_coin numeric(30,8) NOT NULL CHECK (price_flame_coin >= 0),
      status varchar(32) NOT NULL DEFAULT 'available',
      assigned_to uuid REFERENCES users(id),
      assigned_at timestamptz,
      notes text,
      created_by uuid REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_bridger_whatsapp_numbers_status ON bridger_whatsapp_numbers(status,created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_bridger_whatsapp_numbers_owner ON bridger_whatsapp_numbers(assigned_to,assigned_at DESC)`
  await sql`\n    CREATE TABLE IF NOT EXISTS bridger_number_inbox (\n      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n      number_id uuid NOT NULL REFERENCES bridger_whatsapp_numbers(id) ON DELETE CASCADE,\n      provider_message_id varchar(220),\n      channel varchar(20) NOT NULL CHECK (channel IN ('sms','call')),\n      sender varchar(120),\n      message text NOT NULL,\n      received_at timestamptz NOT NULL DEFAULT NOW(),\n      expires_at timestamptz NOT NULL DEFAULT (NOW() + interval '30 minutes'),\n      viewed_at timestamptz\n    )\n  `
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bridger_number_inbox_provider_message ON bridger_number_inbox(provider_message_id) WHERE provider_message_id IS NOT NULL`
  await sql`CREATE INDEX IF NOT EXISTS idx_bridger_number_inbox_number_received ON bridger_number_inbox(number_id,received_at DESC)`
  await sql`
    CREATE TABLE IF NOT EXISTS bridger_number_verification_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      number_id uuid NOT NULL REFERENCES bridger_whatsapp_numbers(id) ON DELETE CASCADE,
      bridger_id uuid NOT NULL REFERENCES users(id),
      method varchar(10) NOT NULL CHECK (method IN ('sms','call')),
      status varchar(24) NOT NULL DEFAULT 'requested',
      admin_message text,
      verification_code varchar(120),
      requested_at timestamptz NOT NULL DEFAULT NOW(),
      deadline_at timestamptz NOT NULL DEFAULT (NOW() + interval '10 minutes'),
      responded_at timestamptz,
      verified_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_bridger_number_verification_owner ON bridger_number_verification_requests(bridger_id,requested_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_bridger_number_verification_admin ON bridger_number_verification_requests(status,deadline_at ASC)`
}

export function normalizeE164(value: unknown) {
  const raw=String(value || '').trim().replace(/[\s()-]/g,'')
  return /^\+[1-9]\d{7,14}$/.test(raw) ? raw : null
}
