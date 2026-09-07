import { neon } from '@/lib/pg-neon'

export const getVaultDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

export async function ensureClientVaultSchema(sql = getVaultDb()) {
  await sql`
    CREATE TABLE IF NOT EXISTS client_vaults (
      client_id uuid PRIMARY KEY,
      balance numeric(30, 8) NOT NULL DEFAULT 0,
      currency varchar(16) NOT NULL DEFAULT 'USDT',
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS client_vault_ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL,
      entry_type varchar(32) NOT NULL,
      amount numeric(30, 8) NOT NULL,
      currency varchar(16) NOT NULL DEFAULT 'USDT',
      balance_after numeric(30, 8) NOT NULL,
      source varchar(120) NOT NULL,
      reference varchar(255),
      reason text,
      actor_id uuid,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_client_vault_ledger_client_time
    ON client_vault_ledger(client_id, created_at DESC)
  `
  await sql`
    CREATE TABLE IF NOT EXISTS client_vault_withdrawals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL,
      amount numeric(30, 8) NOT NULL,
      currency varchar(16) NOT NULL DEFAULT 'USDT',
      destination text,
      status varchar(24) NOT NULL DEFAULT 'pending',
      requested_at timestamptz NOT NULL DEFAULT NOW(),
      reviewed_at timestamptz,
      reviewed_by uuid,
      processed_at timestamptz,
      note text
    )
  `
}

export function decodeClientToken(token: string | null) {
  if (!token) return null
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const id = decoded.split('_')[0]
    return /^[0-9a-f-]{36}$/i.test(id) ? id : null
  } catch {
    return null
  }
}
