import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Platform admin credentials (fallback)
const PLATFORM_ADMIN = {
  email: 'ecezzstarr@gmail.com',
  password: process.env.PLATFORM_ADMIN_FALLBACK_PASSWORD,
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
    if (PLATFORM_ADMIN.password && email.toLowerCase() === PLATFORM_ADMIN.email.toLowerCase() && password === PLATFORM_ADMIN.password) {
      const token = `token_${PLATFORM_ADMIN.id}_${Date.now()}`
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      try {
        await sql`
          INSERT INTO sessions (token, user_id, expires_at)
          VALUES (${token}, ${PLATFORM_ADMIN.id}::uuid, ${expiresAt})
        `
      } catch (sessionError) {
        console.error('Failed to create admin session:', sessionError)
      }

      let realBalance = 0
      try {
        const walletRows = await sql`SELECT balance_trx FROM wallets WHERE user_id = ${PLATFORM_ADMIN.id}::uuid`
        realBalance = Number(walletRows[0]?.balance_trx) || 0
      } catch (balanceError) {
        console.error('Failed to fetch platform admin wallet balance:', balanceError)
      }

      return NextResponse.json({
        token,
        user: {
          id: PLATFORM_ADMIN.id,
          email: PLATFORM_ADMIN.email,
          username: PLATFORM_ADMIN.username,
          name: PLATFORM_ADMIN.name,
          role: PLATFORM_ADMIN.role,
          platform_wallet_balance: realBalance,
          escrow_balance: 0,
        },
      })
    }

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
    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}::uuid`

    // Create/update session
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await sql`
      INSERT INTO sessions (id, user_id, token, created_at, expires_at)
      VALUES (${sessionId}::uuid, ${user.id}::uuid, ${token}, NOW(), ${expiresAt.toISOString()})
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
        terms_accepted_at: user.terms_accepted_at,
        terms_accepted_version: user.terms_accepted_version || 0,
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
