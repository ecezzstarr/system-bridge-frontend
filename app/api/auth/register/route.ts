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
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const role = body.role
    const department = typeof body.department === 'string' ? body.department.trim() : ''

    if (!email || !username || !name || !password || !department) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    if (name.length > 120 || department.length > 64 || password.length < 10 || password.length > 200) return NextResponse.json({ error: 'Invalid registration data' }, { status: 400 })
    if (!['agent', 'bridger'].includes(role)) return NextResponse.json({ error: 'Invalid role. Must be agent or bridger.' }, { status: 400 })

    const sql = getDb()
    const existing = await sql`SELECT id FROM users WHERE LOWER(email) = ${email} OR LOWER(username) = ${username.toLowerCase()} LIMIT 1`
    if (existing.length) return NextResponse.json({ error: 'Email or username already registered' }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 12)
    const userResult = await sql`
      INSERT INTO users (id, email, username, name, password_hash, role, departmental_code, created_at, updated_at)
      VALUES (gen_random_uuid(), ${email}, ${username}, ${name}, ${passwordHash}, ${role}, ${department}, NOW(), NOW())
      RETURNING id, email, username, name, role, departmental_code
    `
    if (!userResult.length) return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })

    const user = userResult[0]
    await sql`
      INSERT INTO wallets (id, user_id, balance_trx, balance_usdt, is_primary, is_eight_engine_controlled, created_at, updated_at)
      VALUES (gen_random_uuid(), ${user.id}::uuid, 0, 0, true, true, NOW(), NOW())
    `

    if (role === 'agent') {
      await sql`INSERT INTO agent_profiles (id, user_id, agent_type, status, rating, total_earnings, matches_completed, commission_rate, created_at, updated_at) VALUES (gen_random_uuid(), ${user.id}::uuid, 'standard', 'active', 5.0, 0, 0, 0.10, NOW(), NOW())`
    } else {
      await sql`INSERT INTO bridger_profiles (id, user_id, status, referrals, total_earnings, commission_rate, created_at, updated_at) VALUES (gen_random_uuid(), ${user.id}::uuid, 'active', 0, 0, 0.50, NOW(), NOW())`
    }

    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
    await sql`INSERT INTO sessions (id, user_id, token, created_at, expires_at) VALUES (gen_random_uuid(), ${user.id}::uuid, ${token}, NOW(), NOW() + INTERVAL '7 days')`

    return NextResponse.json({ token, user: { ...user, platform_wallet_balance: 0, escrow_balance: 0 } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Register error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
