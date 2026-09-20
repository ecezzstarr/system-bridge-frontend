import { sql } from '@/lib/db'
import { ensureAiProviderSettlementSchema } from '@/lib/ai-provider-settlement'
async function ensurePurchaseSchema() {
  await sql`CREATE TABLE IF NOT EXISTS file_folder_purchases (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),file_number varchar(120),client_id uuid,buyer_name varchar(255),buyer_email varchar(255),buyer_phone varchar(80),amount_trx numeric(30,8) NOT NULL,payment_method varchar(40) NOT NULL,payment_reference varchar(255) NOT NULL,status varchar(40) NOT NULL DEFAULT 'pending_admin_confirmation',created_at timestamptz NOT NULL DEFAULT NOW(),confirmed_at timestamptz,confirmed_by uuid)`
  await sql`ALTER TABLE file_folder_purchases ALTER COLUMN file_number DROP NOT NULL`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS client_id uuid`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS buyer_name varchar(255)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS buyer_email varchar(255)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS buyer_phone varchar(80)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS confirmed_by uuid`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS bridge_code varchar(32)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS provider_key varchar(120)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS provider_name varchar(255)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS flame_name varchar(120)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS flame_external_id varchar(255)`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_file_folder_purchases_payment_reference ON file_folder_purchases(payment_reference)`
  await sql`CREATE INDEX IF NOT EXISTS idx_file_folder_purchases_file_number ON file_folder_purchases(file_number)`
}

export async function ensureFlameSchema() {
    await sql`
      CREATE TABLE IF NOT EXISTS chatgpt_bridge_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(32) UNIQUE NOT NULL,
        source varchar(64) NOT NULL DEFAULT 'chatgpt',
        message text NOT NULL,
        topic varchar(64) NOT NULL,
        context text NULL,
        flame_name varchar(120) NULL,
        flame_external_id varchar(255) NULL,
        flame_presence varchar(255) NULL,
        crossing_state varchar(32) NOT NULL DEFAULT 'prospect_with_flame',
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
        opened_at timestamptz NULL,
        consumed_at timestamptz NULL,
        provider_key varchar(120) NULL,
        provider_name varchar(255) NULL
      )
    `
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS context text NULL`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS flame_name varchar(120) NULL`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS flame_external_id varchar(255) NULL`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS flame_presence varchar(255) NULL`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS crossing_state varchar(32) NOT NULL DEFAULT 'prospect_with_flame'`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS consumed_at timestamptz NULL`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS provider_key varchar(120) NULL`
    await sql`ALTER TABLE chatgpt_bridge_sessions ADD COLUMN IF NOT EXISTS provider_name varchar(255) NULL`


 await ensurePurchaseSchema()
 await ensureAiProviderSettlementSchema(sql)
}
