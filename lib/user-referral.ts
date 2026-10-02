import { sql } from '@/lib/db'

export type ReferralRole = 'agent' | 'bridger' | 'client'

function rolePrefix(role: string) {
  if (role === 'agent') return 'A'
  if (role === 'bridger') return 'B'
  return 'C'
}

export function buildUserReferralCode(userId: string, role: string) {
  const compact = userId.replace(/-/g, '').slice(0, 14).toUpperCase()
  return `W-${rolePrefix(role)}-${compact}`
}

export async function ensureUserReferralCode(userId: string) {
  const rows = await sql`
    SELECT id, role, referral_code
    FROM users
    WHERE id = ${userId}::uuid
      AND role IN ('agent','bridger','client')
      AND is_active = true
    LIMIT 1
  `

  if (!rows[0]) return null
  if (rows[0].referral_code) return String(rows[0].referral_code)

  const code = buildUserReferralCode(String(rows[0].id), String(rows[0].role))
  const updated = await sql`
    UPDATE users
    SET referral_code = COALESCE(referral_code, ${code}), updated_at = NOW()
    WHERE id = ${userId}::uuid
    RETURNING referral_code
  `
  return updated[0]?.referral_code ? String(updated[0].referral_code) : code
}

export async function resolveReferralOwnerByCode(code: string) {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null

  const rows = await sql`
    SELECT id, role, referral_code
    FROM users
    WHERE UPPER(referral_code) = ${normalized}
      AND role IN ('agent','bridger','client')
      AND is_active = true
    LIMIT 1
  `
  return rows[0] || null
}
