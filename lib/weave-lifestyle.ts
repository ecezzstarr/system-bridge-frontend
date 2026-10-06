import { getPool } from '@/lib/db'

export const ARENA_SETTLEMENT_DELAY_MINUTES = 20
export const AGENTIC_BRIDGER_EARNING_RATE = 0.50
export const ACE_STANDARD_EARNING_RATE = 0.30
export const AGENTIC_BRIDGER_LIFESTYLE = 'agentic_bridger'

export function getWeaveLifestyleMonthlyPrice() {
  const configured = Number(process.env.WEAVE_LIFESTYLE_MONTHLY_FLAME_COIN || 0)
  return Number.isFinite(configured) && configured > 0 ? configured : 0
}

export async function ensureWeaveLifestyleSchema() {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS weave_lifestyle_subscriptions (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        status varchar(20) NOT NULL DEFAULT 'inactive',
        expires_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS arena_ace_accounts (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        ace_name varchar(80) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'active',
        lifestyle varchar(40) NOT NULL DEFAULT 'ace',
        games_played integer NOT NULL DEFAULT 0,
        wins integer NOT NULL DEFAULT 0,
        losses integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`ALTER TABLE arena_ace_accounts ADD COLUMN IF NOT EXISTS lifestyle varchar(40) NOT NULL DEFAULT 'ace'`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS arena_live_predictions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id text NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prediction varchar(20) NOT NULL CHECK (prediction IN ('ACE_WIN','ACE_LOSE')),
        result varchar(20) NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        resolved_at timestamptz
      )
    `)
    await client.query('CREATE INDEX IF NOT EXISTS arena_live_predictions_match_idx ON arena_live_predictions(match_id)')
    await client.query('CREATE INDEX IF NOT EXISTS arena_live_predictions_user_idx ON arena_live_predictions(user_id)')

    await client.query(`ALTER TABLE arena_matches ADD COLUMN IF NOT EXISTS game_key varchar(80)`)
    await client.query(`ALTER TABLE arena_matches ADD COLUMN IF NOT EXISTS stream_url text`)
    await client.query(`ALTER TABLE arena_matches ADD COLUMN IF NOT EXISTS ace_result varchar(20)`)
    await client.query(`ALTER TABLE arena_matches ADD COLUMN IF NOT EXISTS settlement_status varchar(20) NOT NULL DEFAULT 'open'`)
    await client.query(`ALTER TABLE arena_matches ADD COLUMN IF NOT EXISTS settlement_available_at timestamptz`)
    await client.query(`ALTER TABLE arena_matches ADD COLUMN IF NOT EXISTS settlement_reason text`)
    await client.query(`ALTER TABLE arena_matches ADD COLUMN IF NOT EXISTS ace_lifestyle varchar(40) NOT NULL DEFAULT 'ace'`)
    await client.query(`ALTER TABLE arena_matches ADD COLUMN IF NOT EXISTS ace_earning_rate numeric(6,5) NOT NULL DEFAULT 0.30`)
  } finally {
    client.release()
  }
}

export async function getLifestyleAccess(userId: string) {
  await ensureWeaveLifestyleSchema()
  const pool = getPool()
  const result = await pool.query(
    `SELECT status,expires_at FROM weave_lifestyle_subscriptions WHERE user_id=$1::uuid`,
    [userId]
  )
  const row = result.rows[0]
  const active = row?.status === 'active' && (!row.expires_at || new Date(row.expires_at).getTime() > Date.now())
  return { active, status: row?.status || 'inactive', expiresAt: row?.expires_at || null }
}

export async function requireLifestyleAccess(userId: string) {
  const access = await getLifestyleAccess(userId)
  if (!access.active) {
    const error = new Error('Monthly Weave subscription is required to enter this lifestyle') as Error & { status?: number }
    error.status = 403
    throw error
  }
  return access
}

export async function ensureAceAccount(userId: string, fallbackName: string, role?: string | null) {
  await ensureWeaveLifestyleSchema()
  const pool = getPool()
  const safeName = String(fallbackName || 'Ace').trim().slice(0, 80) || 'Ace'
  const lifestyle = String(role || '').toLowerCase() === 'bridger' ? AGENTIC_BRIDGER_LIFESTYLE : 'ace'
  await pool.query(
    `INSERT INTO arena_ace_accounts (user_id,ace_name,lifestyle)
     VALUES ($1::uuid,$2,$3)
     ON CONFLICT (user_id) DO UPDATE SET lifestyle=EXCLUDED.lifestyle,updated_at=NOW()`,
    [userId, safeName, lifestyle]
  )
  const result = await pool.query('SELECT * FROM arena_ace_accounts WHERE user_id=$1::uuid', [userId])
  return result.rows[0]
}

export async function getAgenticBridgerState(userId: string) {
  await ensureWeaveLifestyleSchema()
  const pool = getPool()
  const result = await pool.query(
    `SELECT
       u.role,
       u.subscription_status,
       u.subscription_expiry,
       u.is_subscription_exempt,
       a.status AS ace_status,
       a.lifestyle
     FROM users u
     LEFT JOIN arena_ace_accounts a ON a.user_id=u.id
     WHERE u.id=$1::uuid
     LIMIT 1`,
    [userId]
  )
  const row = result.rows[0]
  const expiry = row?.subscription_expiry ? new Date(row.subscription_expiry).getTime() : null
  const continuanceActive = Boolean(row?.is_subscription_exempt) || (row?.subscription_status === 'active' && (!expiry || expiry > Date.now()))
  const active = row?.role === 'bridger'
    && row?.ace_status === 'active'
    && row?.lifestyle === AGENTIC_BRIDGER_LIFESTYLE
    && continuanceActive

  return {
    active,
    lifestyle: active ? AGENTIC_BRIDGER_LIFESTYLE : null,
    earningRate: active ? AGENTIC_BRIDGER_EARNING_RATE : ACE_STANDARD_EARNING_RATE,
    continuanceActive,
  }
}
