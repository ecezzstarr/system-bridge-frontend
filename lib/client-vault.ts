import { neon } from '@/lib/pg-neon'

export const getVaultDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

export async function ensureClientVaultSchema(sql = getVaultDb()) {
  await sql`CREATE TABLE IF NOT EXISTS client_vaults (client_id uuid PRIMARY KEY, balance numeric(30, 8) NOT NULL DEFAULT 0, currency varchar(16) NOT NULL DEFAULT 'TRX', updated_at timestamptz NOT NULL DEFAULT NOW())`
  await sql`UPDATE client_vaults SET currency = 'TRX' WHERE currency IS NULL OR currency <> 'TRX'`
  await sql`CREATE TABLE IF NOT EXISTS client_vault_ledger (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL, entry_type varchar(32) NOT NULL, amount numeric(30, 8) NOT NULL, currency varchar(16) NOT NULL DEFAULT 'TRX', balance_after numeric(30, 8) NOT NULL, source varchar(120) NOT NULL, reference varchar(255), reason text, actor_id uuid, created_at timestamptz NOT NULL DEFAULT NOW())`
  await sql`CREATE INDEX IF NOT EXISTS idx_client_vault_ledger_client_time ON client_vault_ledger(client_id, created_at DESC)`
  await sql`CREATE TABLE IF NOT EXISTS client_vault_withdrawals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL, amount numeric(30, 8) NOT NULL, currency varchar(16) NOT NULL DEFAULT 'TRX', destination text, status varchar(24) NOT NULL DEFAULT 'pending', requested_at timestamptz NOT NULL DEFAULT NOW(), reviewed_at timestamptz, reviewed_by uuid, processed_at timestamptz, note text)`
  await sql`UPDATE client_vault_withdrawals SET currency = 'TRX' WHERE currency IS NULL OR currency <> 'TRX'`
}

export async function ensureClientSessionSchema(sql = getVaultDb()) {
  await sql`CREATE TABLE IF NOT EXISTS client_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL, token varchar(128) UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW(), expires_at timestamptz NOT NULL, revoked_at timestamptz)`
  await sql`CREATE INDEX IF NOT EXISTS idx_client_sessions_token ON client_sessions(token) WHERE revoked_at IS NULL`
}

export async function resolveClientToken(token: string | null, sql = getVaultDb()) {
  if (!token || token.length < 32 || token.length > 128) return null
  await ensureClientSessionSchema(sql)
  const rows = await sql`
    SELECT c.id
    FROM client_sessions s
    JOIN clients c ON c.id = s.client_id
    WHERE s.token = ${token} AND s.expires_at > NOW() AND s.revoked_at IS NULL
    LIMIT 1
  `
  return rows[0]?.id ? String(rows[0].id) : null
}
