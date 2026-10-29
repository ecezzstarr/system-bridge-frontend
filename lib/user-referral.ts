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
    WHERE (
        UPPER(referral_code) = ${normalized}
        OR (
          referral_code IS NULL
          AND UPPER(
            'W-' ||
            CASE role WHEN 'agent' THEN 'A' WHEN 'bridger' THEN 'B' ELSE 'C' END ||
            '-' || SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 14)
          ) = ${normalized}
        )
      )
      AND role IN ('agent','bridger','client')
      AND is_active = true
    LIMIT 1
  `
  const owner = rows[0]
  if (!owner) return null

  // Older active accounts may predate referral-code hydration. Persist the
  // canonical code when it is first resolved so subsequent referrals are stable.
  if (!owner.referral_code) {
    const codeForOwner = buildUserReferralCode(String(owner.id), String(owner.role))
    const updated = await sql`
      UPDATE users
      SET referral_code = COALESCE(referral_code, ${codeForOwner}), updated_at = NOW()
      WHERE id = ${String(owner.id)}::uuid
      RETURNING referral_code
    `
    owner.referral_code = updated[0]?.referral_code || codeForOwner
  }

  return owner
}
