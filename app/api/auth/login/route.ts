import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import bcrypt from 'bcryptjs'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// Platform admin credentials (fallback)
const PLATFORM_ADMIN = {
  email: 'ecezzstarr@gmail.com',
  password: 'admin123',
  id: 'be4f0618-d666-4e13-ae8f-13c986784ff7',
  username: 'ecezzstarr',
  name: 'Ecezz Starr',
  role: 'admin',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    // Check platform admin first (hardcoded fallback) - case insensitive
    if (email.toLowerCase() === PLATFORM_ADMIN.email.toLowerCase() && password === PLATFORM_ADMIN.password) {
      const token = `token_${PLATFORM_ADMIN.id}_${Date.now()}`
      return NextResponse.json({
        token,
        user: {
          id: PLATFORM_ADMIN.id,
          email: PLATFORM_ADMIN.email,
          username: PLATFORM_ADMIN.username,
          name: PLATFORM_ADMIN.name,
          role: PLATFORM_ADMIN.role,
          platform_wallet_balance: 1000,
          escrow_balance: 0,
        },
      })
    }

    const sql = getDb()

    // Find user in database
    const users = await sql`
      SELECT u.*, w.balance_trx as platform_wallet_balance, w.tron_address as wallet_address
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id AND w.is_primary = true
      WHERE u.email = ${email} AND u.is_active = true
    `

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const user = users[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate token
    const token = `token_${user.id}_${Date.now()}`

    // Update last login
    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`

    // Create/update session
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await sql`
      INSERT INTO sessions (id, user_id, token, created_at, expires_at)
      VALUES (${sessionId}, ${user.id}, ${token}, NOW(), ${expiresAt.toISOString()})
    `

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
    })
  } catch (error) {
    console.error('[v0] Login error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 500 }
    )
  }
}
