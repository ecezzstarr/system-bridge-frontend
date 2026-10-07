import { getPool } from '@/lib/db'
import {
  ACE_LIFESTYLE,
  AGENTIC_BRIDGER_LIFESTYLE,
} from '@/lib/weave-lifestyle-catalog'

export { ACE_LIFESTYLE, AGENTIC_BRIDGER_LIFESTYLE } from '@/lib/weave-lifestyle-catalog'

export const ARENA_SETTLEMENT_DELAY_MINUTES = 20
export const AGENTIC_BRIDGER_EARNING_RATE = 0.45
export const ACE_STANDARD_EARNING_RATE = 0.30

export type LifestyleAccessSource = 'role_monthly_subscription' | 'administration' | 'unsupported'

export type LifestyleAccess = {
  active: boolean
  status: string
  expiresAt: string | null
  role: string
  source: LifestyleAccessSource
  positionScoped: true
}

export async function ensureWeaveLifestyleSchema() {
  const pool = getPool()
  const client = await pool.connect()
  try {
    // Lifestyle is not a second subscription. Agent, Bridger and Client access
    // follows the monthly subscription already attached to the user's WEAVE
    // position. Keep the legacy lifestyle table out of authorization decisions.
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status varchar(20) DEFAULT 'active'`)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry timestamptz`)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_subscription_exempt boolean DEFAULT false`)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_last_paid_at timestamptz`)

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

export async function getLifestyleAccess(userId: string): Promise<LifestyleAccess> {
  await ensureWeaveLifestyleSchema()
  const pool = getPool()
  const result = await pool.query(
    `SELECT role,subscription_status,subscription_expiry,is_subscription_exempt,is_active
     FROM users
     WHERE id=$1::uuid
     LIMIT 1`,
    [userId]
  )
  const row = result.rows[0]
  const role = String(row?.role || '').toLowerCase()

  if (role === 'admin') {
    return {
      active: true,
      status: 'active',
      expiresAt: null,
      role,
      source: 'administration',
      positionScoped: true,
    }
  }

  if (!['agent', 'bridger', 'client'].includes(role)) {
    return {
      active: false,
      status: 'unsupported',
      expiresAt: null,
      role,
      source: 'unsupported',
      positionScoped: true,
    }
  }

  const expiry = row?.subscription_expiry ? new Date(row.subscription_expiry) : null
  const current = !expiry || expiry.getTime() > Date.now()
  const enabled = row?.is_active !== false
  const active = enabled && (Boolean(row?.is_subscription_exempt) || (row?.subscription_status === 'active' && current))
  const status = active
    ? 'active'
    : row?.subscription_status === 'active' && !current
      ? 'expired'
      : String(row?.subscription_status || 'inactive')

  return {
    active,
    status,
    expiresAt: expiry?.toISOString() || null,
    role,
    source: 'role_monthly_subscription',
    positionScoped: true,
  }
}

export async function requireLifestyleAccess(userId: string) {
  const access = await getLifestyleAccess(userId)
  if (!access.active) {
    const position = access.role ? `${access.role[0]?.toUpperCase()}${access.role.slice(1)}` : 'WEAVE'
    const error = new Error(`${position} monthly subscription is required to enter Lifestyle`) as Error & { status?: number; lifestyleAccess?: LifestyleAccess }
    error.status = 403
    error.lifestyleAccess = access
    throw error
  }
  return access
}

export async function ensureAceAccount(userId: string, fallbackName: string, role?: string | null) {
  await ensureWeaveLifestyleSchema()
  const pool = getPool()
  const safeName = String(fallbackName || 'Ace').trim().slice(0, 80) || 'Ace'
  // Ace is the parent Lifestyle. Bridgers carry the Agentic-Bridger specialization
  // inside Ace while their Bridger monthly Continuance remains active.
  const lifestyle = String(role || '').toLowerCase() === 'bridger' ? AGENTIC_BRIDGER_LIFESTYLE : ACE_LIFESTYLE
  await pool.query(
    `INSERT INTO arena_ace_accounts (user_id,ace_name,status,lifestyle)
     VALUES ($1::uuid,$2,'active',$3)
     ON CONFLICT (user_id) DO UPDATE SET
       ace_name=EXCLUDED.ace_name,
       status='active',
       lifestyle=EXCLUDED.lifestyle,
       updated_at=NOW()`,
    [userId, safeName, lifestyle]
  )
  const result = await pool.query('SELECT * FROM arena_ace_accounts WHERE user_id=$1::uuid', [userId])
  return result.rows[0]
}

export async function deactivateBridgerAceForExpiredContinuance(userId: string) {
  await ensureWeaveLifestyleSchema()
  const pool = getPool()
  await pool.query(
    `UPDATE arena_ace_accounts
     SET status='inactive',lifestyle='none',updated_at=NOW()
     WHERE user_id=$1::uuid
       AND (status<>'inactive' OR lifestyle<>'none')`,
    [userId]
  )
}

export async function getAgenticBridgerState(userId: string) {
  const subscription = await getLifestyleAccess(userId)
  const pool = getPool()
  const result = await pool.query(
    `SELECT a.status AS ace_status,a.lifestyle
     FROM arena_ace_accounts a
     WHERE a.user_id=$1::uuid
     LIMIT 1`,
    [userId]
  )
  const row = result.rows[0]
  const continuanceActive = subscription.role === 'bridger' && subscription.active

  if (subscription.role === 'bridger' && !continuanceActive) {
    await deactivateBridgerAceForExpiredContinuance(userId)
    return {
      active: false,
      eligible: false,
      lifestyle: null,
      parentLifestyle: ACE_LIFESTYLE,
      earningRate: ACE_STANDARD_EARNING_RATE,
      continuanceActive: false,
    }
  }

  const eligible = subscription.role === 'bridger' && continuanceActive
  const active = eligible
    && row?.ace_status === 'active'
    && row?.lifestyle === AGENTIC_BRIDGER_LIFESTYLE

  return {
    active,
    eligible,
    lifestyle: active ? AGENTIC_BRIDGER_LIFESTYLE : null,
    parentLifestyle: ACE_LIFESTYLE,
    earningRate: active ? AGENTIC_BRIDGER_EARNING_RATE : ACE_STANDARD_EARNING_RATE,
    continuanceActive,
  }
}
