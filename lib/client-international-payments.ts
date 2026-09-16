import { getBusinessDb } from '@/lib/client-business-store'

export async function ensureClientInternationalPaymentsSchema(sql = getBusinessDb()) {
  await sql`
    CREATE TABLE IF NOT EXISTS client_international_payment_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid UNIQUE NOT NULL,
      provider varchar(40) NOT NULL DEFAULT 'wise',
      enabled boolean NOT NULL DEFAULT false,
      account_name varchar(255),
      receiving_identifier varchar(255),
      payment_link text,
      supported_currencies varchar(255) NOT NULL DEFAULT 'USD,EUR,GBP',
      service_fee_percent numeric(5,2) NOT NULL DEFAULT 15,
      instructions text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE client_international_payment_profiles ADD COLUMN IF NOT EXISTS payment_link text`
  await sql`ALTER TABLE client_international_payment_profiles ADD COLUMN IF NOT EXISTS service_fee_percent numeric(5,2) NOT NULL DEFAULT 15`
}

export async function ensureClientInternationalPaymentProfile(sql: any, clientId: string) {
  await ensureClientInternationalPaymentsSchema(sql)
  const [profile] = await sql`
    INSERT INTO client_international_payment_profiles (client_id)
    VALUES (${clientId}::uuid)
    ON CONFLICT (client_id) DO UPDATE SET updated_at=NOW()
    RETURNING *
  `
  return profile
}
