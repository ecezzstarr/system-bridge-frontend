import { neon } from '@/lib/pg-neon'

export const getVaultDb = () => {

  return neon(process.env.DATABASE_URL)
}

export async function ensureClientVaultSchema(sql = getVaultDb()) {
  await sql`CREATE TABLE IF NOT EXISTS client_vaults (client_id uuid PRIMARY KEY, balance numeric(30, 8) NOT NULL DEFAULT 0, currency varchar(16) NOT NULL DEFAULT 'Flame Coin', updated_at timestamptz NOT NULL DEFAULT NOW())`

  await sql`CREATE TABLE IF NOT EXISTS client_vault_ledger (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL, entry_type varchar(32) NOT NULL, amount numeric(30, 8) NOT NULL, currency varchar(16) NOT NULL DEFAULT 'Flame Coin', balance_after numeric(30, 8) NOT NULL, source varchar(120) NOT NULL, reference varchar(255), reason text, actor_id uuid, created_at timestamptz NOT NULL DEFAULT NOW())`
  await sql`CREATE INDEX IF NOT EXISTS idx_client_vault_ledger_client_time ON client_vault_ledger(client_id, created_at DESC)`
  await sql`CREATE TABLE IF NOT EXISTS client_vault_withdrawals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL, amount numeric(30, 8) NOT NULL, currency varchar(16) NOT NULL DEFAULT 'Flame Coin', destination text, status varchar(24) NOT NULL DEFAULT 'pending', requested_at timestamptz NOT NULL DEFAULT NOW(), reviewed_at timestamptz, reviewed_by uuid, processed_at timestamptz, note text)`

}

export async function ensureClientSessionSchema(sql = getVaultDb()) {
  await sql`CREATE TABLE IF NOT EXISTS client_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL, token varchar(128) UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW(), expires_at timestamptz NOT NULL, revoked_at timestamptz)`
  await sql`CREATE INDEX IF NOT EXISTS idx_client_sessions_token ON client_sessions(token) WHERE revoked_at IS NULL`
}

export async function resolveClientToken(token: string | null, sql = getVaultDb()) {
  if (!token || token.length < 32 || token.length > 256) return null
  const [user] = await sql`SELECT u.id FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token=${token} AND s.expires_at>NOW() AND u.is_active=true AND u.role='client' LIMIT 1`
  return user?.id ? String(user.id) : null
}
