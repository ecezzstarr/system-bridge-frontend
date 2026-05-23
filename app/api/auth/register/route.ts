import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, name, password, role, department } = body

    // Validation
    if (!email || !username || !name || !password || !role || !department) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['agent', 'bridger'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be agent or bridger.' },
        { status: 400 }
      )
    }

    const sql = getDb()

    // Check if email already exists
    const existingEmail = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existingEmail.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUsername = await sql`SELECT id FROM users WHERE username = ${username}`
    if (existingUsername.length > 0) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user in Neon database using gen_random_uuid()
    const userResult = await sql`
      INSERT INTO users (id, email, username, name, password_hash, role, departmental_code, created_at, updated_at)
      VALUES (gen_random_uuid(), ${email}, ${username}, ${name}, ${passwordHash}, ${role}, ${department}, NOW(), NOW())
      RETURNING id, email, username, name, role, departmental_code
    `

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const user = userResult[0]
    const userId = user.id

    // Create wallet for user (using actual column names from schema)
    await sql`
      INSERT INTO wallets (id, user_id, balance_trx, balance_usdt, is_primary, is_eight_engine_controlled, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, 0, 0, true, true, NOW(), NOW())
    `

    // Create role-specific profile
    if (role === 'agent') {
      await sql`
        INSERT INTO agent_profiles (id, user_id, agent_type, status, rating, total_earnings, matches_completed, commission_rate, created_at, updated_at)
        VALUES (gen_random_uuid(), ${userId}::uuid, 'standard', 'active', 5.0, 0, 0, 0.10, NOW(), NOW())
      `
    } else if (role === 'bridger') {
      await sql`
        INSERT INTO bridger_profiles (id, user_id, status, referrals, total_earnings, commission_rate, created_at, updated_at)
        VALUES (gen_random_uuid(), ${userId}::uuid, 'active', 0, 0, 0.50, NOW(), NOW())
      `
    }

    // Generate token
    const token = `ssb_${userId}_${Date.now()}`

    // Create session
    await sql`
      INSERT INTO sessions (id, user_id, token, created_at, expires_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, ${token}, NOW(), NOW() + INTERVAL '7 days')
    `

    return NextResponse.json({
      token,
      user: {
        id: userId,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        departmental_code: user.departmental_code,
        platform_wallet_balance: 0,
        escrow_balance: 0,
      },
    })
  } catch (error) {
    console.error('[v0] Register error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 500 }
    )
  }
}
