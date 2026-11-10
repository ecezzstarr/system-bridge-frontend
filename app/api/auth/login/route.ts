import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { usableBcryptPasswordHash } from '@/lib/password-hash'
import { randomBytes, randomUUID } from 'node:crypto'
import { getDivineShieldState } from '@/lib/weave-infrastructure'
import { ensureUserReferralCode } from '@/lib/user-referral'

const PLATFORM_ADMIN_EMAIL = 'ecezzstarr@gmail.com'


async function createSession(user: { id: string; role: string; password_hash?: string|null; admin_recovery_rotated_at?: Date|string|null }) {
  const token = `token_${randomBytes(32).toString('hex')}`
  const sessionId = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const inserted=await sql`
    WITH verified_identity AS (
      SELECT id FROM users WHERE id=${user.id}::uuid AND is_active=true AND role=${user.role}
        AND password_hash IS NOT DISTINCT FROM ${user.password_hash??null}
        AND (to_jsonb(users)->>'admin_recovery_rotated_at')::timestamptz
          IS NOT DISTINCT FROM ${user.admin_recovery_rotated_at??null}::timestamptz
      FOR UPDATE
    )
    INSERT INTO sessions (id,user_id,token,created_at,expires_at)
      SELECT ${sessionId}::uuid,id,${token},NOW(),${expiresAt.toISOString()}::timestamptz FROM verified_identity
    RETURNING id
  `
  if(!inserted.length)throw new Error('Credentials changed during sign-in')
  await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}::uuid`
  return token
}

function publicUser(user: any, referralCode: string | null) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    departmental_code: user.departmental_code,
    referral_code: referralCode,
    platform_wallet_balance: Number(user.platform_wallet_balance) || 0,
    escrow_balance: 0,
    wallet_address: user.wallet_address,
    terms_accepted_at: user.terms_accepted_at,
    terms_accepted_version: user.terms_accepted_version || 0,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body.email || '').trim()
    const password = String(body.password || '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Break-glass compatibility: accept the pre-existing server-side fallback
    // secret only for the original Administration identity, and only when that
    // identity still exists as an active admin in the database. Never create
    // a privileged identity or session without a real database account.
    const fallbackPassword = process.env.PLATFORM_ADMIN_FALLBACK_PASSWORD
    if (
      fallbackPassword &&
      email.toLowerCase() === PLATFORM_ADMIN_EMAIL &&
      password === fallbackPassword
    ) {
      const admins = await sql`
        SELECT u.*, w.balance_trx as platform_wallet_balance, w.tron_address as wallet_address
        FROM users u
        LEFT JOIN wallets w ON w.user_id = u.id AND w.is_primary = true
        WHERE LOWER(u.email) = LOWER(${PLATFORM_ADMIN_EMAIL})
          AND u.is_active = true
          AND u.role = 'admin'
          AND (to_jsonb(u)->>'admin_recovery_rotated_at') IS NULL
        LIMIT 1
      `
      const admin = admins[0]
      if (admin) {
        const token = await createSession(admin)
        return NextResponse.json({
          token,
          user: publicUser(admin, null),
        })
      }
    }

    const users = await sql`
      SELECT u.*, w.balance_trx as platform_wallet_balance, w.tron_address as wallet_address
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id AND w.is_primary = true
      WHERE LOWER(u.email) = LOWER(${email}) AND u.is_active = true
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const user = users[0]

    const passwordHash = usableBcryptPasswordHash(user.password_hash)

    if (!passwordHash) {
      return NextResponse.json({
        error: 'This WEAVE account needs a password before it can sign in. Use Forgot Password to set one.',
        code: 'PASSWORD_SETUP_REQUIRED',
        recovery: '/forgot-password',
      }, { status: 409 })
    }

    const isValidPassword = await bcrypt.compare(password, passwordHash)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const shield = await getDivineShieldState()
    if (shield.active && user.role !== 'admin') {
      return NextResponse.json({ error: 'WEAVE is under maintenance. Divine Shield is active.' }, { status: 423 })
    }

    const referralCode = ['agent', 'bridger', 'client'].includes(user.role)
      ? (user.referral_code || await ensureUserReferralCode(user.id))
      : null

    const token = await createSession(user)
    return NextResponse.json({ token, user: publicUser(user, referralCode) })
  } catch (error) {
    console.error('[WEAVE] Login error:', error)
    return NextResponse.json({ error: 'Login temporarily unavailable' }, { status: 500 })
  }
}
