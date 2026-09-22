import crypto from 'crypto'
import { sql } from '@/lib/db'

export type Mystic5GrantSurface = 'web' | 'extension' | 'ios' | 'android' | 'whatsapp' | 'sms' | 'other'

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function newToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function ensureMystic5GrantTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS mystic5_external_grants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      surface VARCHAR(32) NOT NULL,
      purpose TEXT NOT NULL,
      approved BOOLEAN NOT NULL DEFAULT false,
      status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'revoked', 'expired')),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_mystic5_external_grants_user
    ON mystic5_external_grants(user_id, status, expires_at)
  `
}

export async function createMystic5Grant(input: {
  userId: string
  surface: Mystic5GrantSurface
  purpose: string
  approved: boolean
  expiresInHours?: number
}) {
  await ensureMystic5GrantTable()

  if (input.approved !== true) {
    throw new Error('User approval is required before Mystic 5 can extend outside Weave.')
  }

  const purpose = input.purpose.trim().slice(0, 1000)
  if (!purpose) throw new Error('A purpose is required for an external Mystic 5 grant.')

  const allowed: Mystic5GrantSurface[] = [
    'web', 'extension', 'ios', 'android', 'whatsapp', 'sms', 'other',
  ]
  if (!allowed.includes(input.surface)) throw new Error('Unsupported Mystic 5 surface.')

  const hours = Math.min(Math.max(Number(input.expiresInHours) || 72, 1), 24 * 30)
  const token = newToken()

  const rows = await sql`
    INSERT INTO mystic5_external_grants
      (user_id, token_hash, surface, purpose, approved, expires_at)
    VALUES
      (${input.userId}::uuid, ${hashToken(token)}, ${input.surface}, ${purpose}, true,
       NOW() + (${hours} || ' hours')::interval)
    RETURNING id, user_id, surface, purpose, approved, status, expires_at, created_at
  `

  return { grant: rows[0], token }
}

export async function resolveMystic5Grant(token: string) {
  await ensureMystic5GrantTable()
  if (!/^[a-f0-9]{64}$/i.test(token)) return null

  const rows = await sql`
    UPDATE mystic5_external_grants
    SET last_used_at = NOW(),
        status = CASE WHEN expires_at <= NOW() THEN 'expired' ELSE status END
    WHERE token_hash = ${hashToken(token)}
      AND approved = true
      AND status = 'active'
      AND expires_at > NOW()
    RETURNING id, user_id, surface, purpose, expires_at
  `

  return rows[0] || null
}

export async function listMystic5Grants(userId: string) {
  await ensureMystic5GrantTable()
  await sql`
    UPDATE mystic5_external_grants
    SET status = 'expired'
    WHERE user_id = ${userId}::uuid
      AND status = 'active'
      AND expires_at <= NOW()
  `

  return sql`
    SELECT id, surface, purpose, approved, status, expires_at, created_at, last_used_at
    FROM mystic5_external_grants
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
    LIMIT 100
  `
}

export async function revokeMystic5Grant(userId: string, grantId: string) {
  await ensureMystic5GrantTable()
  const rows = await sql`
    UPDATE mystic5_external_grants
    SET status = 'revoked'
    WHERE id = ${grantId}::uuid
      AND user_id = ${userId}::uuid
    RETURNING id, surface, purpose, status, expires_at
  `
  return rows[0] || null
}
