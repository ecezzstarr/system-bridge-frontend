import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { ensureBridgerReferralColumns } from '@/lib/bridger-referral-commission'
import { validateDepartmentalCode, useDepartmentalCode, Department } from '@/lib/departmental-codes'
import { getDivineShieldState } from '@/lib/weave-infrastructure'

export async function POST(request: NextRequest) {
  try {
    const shield=await getDivineShieldState()
    if(shield.active) return NextResponse.json({error:'WEAVE is under maintenance. Divine Shield is active.'},{status:423})

    const body = await request.json()
    const { 
      email, 
      username, 
      name, 
      password, 
      role, 
      department, 
      termsAccepted, 
      fullNameConfirmed, 
      referredByBridgerId,
      departmentalCode 
    } = body

    if (!termsAccepted || !fullNameConfirmed) {
      return NextResponse.json(
        { error: 'You must review and accept the WEAVE Terms of Service to continue.' },
        { status: 400 }
      )
    }

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

    // Departmental Code Validation (Mandatory for Agent/Bridger)
    if (!departmentalCode) {
      return NextResponse.json(
        { error: 'A departmental registration code is required for this role.' },
        { status: 400 }
      )
    }

    const dept = role.toUpperCase() as Department
    const validation = await validateDepartmentalCode(departmentalCode, dept)
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid departmental code.' },
        { status: 400 }
      )
    }

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

    // Bridger-referral link: ?ref=<bridgerUserId> resolves to this. Only
    // honored when the role being registered is itself 'bridger' and the
    // referrer is a real, existing bridger — silently ignored otherwise
    // rather than failing the whole registration.
    let validReferrerId: string | null = null
    if (role === 'bridger' && referredByBridgerId) {
      await ensureBridgerReferralColumns()
      const referrerRows = await sql`
        SELECT id FROM users WHERE id = ${referredByBridgerId}::uuid AND role = 'bridger'
      `
      if (referrerRows.length > 0) validReferrerId = referrerRows[0].id
    }

    // Claim the code BEFORE creating anything. This atomic UPDATE is the
    // real concurrency gate -- two simultaneous registrations against the
    // same code will only have one succeed here, so the account below is
    // only ever created for the request that actually won the claim.
    const userId = crypto.randomUUID()
    const claimed = await useDepartmentalCode(departmentalCode, userId)
    if (!claimed) {
      return NextResponse.json(
        { error: 'This code was just used or is no longer active.' },
        { status: 409 },
      )
    }

    const userResult = await sql`
      INSERT INTO users (id, email, username, name, password_hash, role, departmental_code, referred_by_bridger_id, created_at, updated_at)
      VALUES (${userId}::uuid, ${email}, ${username}, ${name}, ${passwordHash}, ${role}, ${dept}, ${validReferrerId}::uuid, NOW(), NOW())
      RETURNING id, email, username, name, role, departmental_code
    `

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const user = userResult[0]

    // Let the referring bridger know their link brought someone in.
    if (validReferrerId) {
      try {
        await sql`
          INSERT INTO notifications (user_id, type, title, content, from_user_name)
          VALUES (
            ${validReferrerId}::uuid,
            'referral_signup',
            'Your referral joined WEAVE',
            ${name + ' just registered as a bridger using your referral link.'},
            'WEAVE'
          )
        `
      } catch (notifyError) {
        console.error('Failed to notify referring bridger:', notifyError)
      }
    }

    // Log terms acceptance (WEAVE Terms of Service v1)
    try {
      await sql`
        INSERT INTO terms_acceptance_log (user_id, role, terms_version, full_name_confirmed)
        VALUES (${userId}::uuid, ${role}, 1, ${fullNameConfirmed})
      `
      await sql`UPDATE users SET terms_accepted_at = NOW() WHERE id = ${userId}::uuid`
    } catch (termsError) {
      console.error('Failed to log terms acceptance:', termsError)
    }

    // Create wallet for user (using actual column names from schema)
    await sql`
      INSERT INTO wallets (id, user_id, balance_trx, balance_usdt, is_primary, is_eight_engine_controlled, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, 0, 0, true, true, NOW(), NOW())
    `

    // Create role-specific profile
    if (role === 'agent') {
      await sql`
        INSERT INTO agent_profiles (id, user_id, agent_type, status, rating, total_earnings, matches_completed, commission_rate, created_at, updated_at)
        VALUES (gen_random_uuid(), ${userId}::uuid, 'standard', 'active', 5.0, 0, 0, 0.20, NOW(), NOW())
      `
    } else if (role === 'bridger') {
      await sql`
        INSERT INTO bridger_profiles (id, user_id, status, referrals, total_earnings, commission_rate, created_at, updated_at)
        VALUES (gen_random_uuid(), ${userId}::uuid, 'active', 0, 0, 0.50, NOW(), NOW())
      `
      if (validReferrerId) {
        await sql`
          UPDATE bridger_profiles SET bridger_referral_count = bridger_referral_count + 1, updated_at = NOW()
          WHERE user_id = ${validReferrerId}::uuid
        `
      }
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
