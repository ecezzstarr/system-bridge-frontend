import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import bcrypt from 'bcryptjs'

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const sql = getDb()
    const users = await sql`
      SELECT u.*, w.balance_trx AS platform_wallet_balance, w.tron_address AS wallet_address
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id AND w.is_primary = true
      WHERE LOWER(u.email) = ${email} AND u.is_active = true
      LIMIT 1
    `

    if (!users.length) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const user = users[0]
    const isValidPassword = await bcrypt.compare(password, user.password_hash || '')
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // There must never be more than one active platform administrator.
    if (user.role === 'admin') {
      const admins = await sql`
        SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin' AND is_active = true
      `
      if (Number(admins[0]?.count || 0) !== 1) {
        return NextResponse.json({ error: 'Administrator configuration is locked' }, { status: 503 })
      }
    }

    // Opaque, cryptographically random session token. Never encode the user ID in it.
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await sql`
      INSERT INTO sessions (id, user_id, token, created_at, expires_at)
      VALUES (${sessionId}, ${user.id}::uuid, ${token}, NOW(), ${expiresAt.toISOString()})
    `

    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}::uuid`

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        departmental_code: user.departmental_code,
        platform_wallet_balance: Number(user.platform_wallet_balance) || 0,
        escrow_balance: 0,
        wallet_address: user.wallet_address,
      },
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
