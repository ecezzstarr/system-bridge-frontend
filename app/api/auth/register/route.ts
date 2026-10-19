import { NextRequest, NextResponse } from 'next/server'
import { sql, getPool } from '@/lib/db'
import { randomUUID } from 'node:crypto'
import { normalizeRegisteredGender, ensureClientMonthlySchema } from '@/lib/client-monthly-subscription'
import bcrypt from 'bcryptjs'
import { ensureBridgerReferralColumns } from '@/lib/bridger-referral-commission'
import { validateDepartmentalCode, Department } from '@/lib/departmental-codes'
import { getDivineShieldState } from '@/lib/weave-infrastructure'
import { buildUserReferralCode, resolveReferralOwnerByCode } from '@/lib/user-referral'
import { queueReferralSignupBonus } from '@/lib/referral-bonus'
import { publicFlameMovementCodeFromRequest, recordPublicFlameMovementEvent } from '@/lib/public-flame-movement'

// A client may lose the HTTP response after a successful DB commit on mobile.
// Reusing the paid ticket is safe only when the original owner's password and
// identity match; this is never a way to transfer or reuse a one-time ticket.
async function recoverCompletedRegistration(input:{
  code:string;department:string;role:string;email:string;username:string;password:string
}){
  if(!input.code||!input.email||!input.username||!input.password)return null
  const [owner]=await sql`
    SELECT u.id,u.email,u.username,u.name,u.role,u.departmental_code,
      u.referral_code,u.assigned_agent_id,u.password_hash
    FROM departmental_codes dc
    JOIN users u ON u.id=dc.used_by
    WHERE dc.code=${input.code} AND dc.department=${input.department}
      AND dc.status='USED' AND u.role=${input.role}
      AND u.email=${input.email} AND u.username=${input.username}
      AND COALESCE(u.is_active,true)=true
    LIMIT 1
  `
  if(!owner||!await bcrypt.compare(input.password,owner.password_hash))return null
  const token=`ssb_${owner.id}_${Date.now()}`
  await sql`
    INSERT INTO sessions (id,user_id,token,created_at,expires_at)
    VALUES (gen_random_uuid(),${owner.id}::uuid,${token},NOW(),NOW()+INTERVAL '7 days')
  `
  return NextResponse.json({
    recovered:true,token,
    user:{
      id:owner.id,email:owner.email,username:owner.username,name:owner.name,
      role:owner.role,departmental_code:owner.departmental_code,
      referral_code:owner.referral_code,assigned_agent_id:owner.assigned_agent_id||null,
      platform_wallet_balance:0,escrow_balance:0,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const shield=await getDivineShieldState()
    if(shield.active) return NextResponse.json({error:'WEAVE is under maintenance. Divine Shield is active.'},{status:423})

    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const username = String(body.username || '').trim()
    const name = String(body.name || '').trim()
    const gender=normalizeRegisteredGender(body.gender)
    if(!gender)return NextResponse.json({error:'Choose Male or Female at registration.'},{status:400})
    await ensureClientMonthlySchema()
    const {
      password,
      role,
      department,
      termsAccepted,
      fullNameConfirmed,
      referredByBridgerId,
      departmentalCode
    } = body

    if (!termsAccepted || !fullNameConfirmed || String(fullNameConfirmed).trim().toLowerCase() !== String(name||'').trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'You must review and accept the WEAVE Terms of Service to continue.' },
        { status: 400 }
      )
    }

    if (!email || !username || !name || !password || !role || !department) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || username.length < 3 || username.length > 100 || name.length < 2 || name.length > 255 || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({
        error: 'Enter a valid email, a username of 3–100 characters, a full name, and a password of at least 8 characters.',
        code: 'INVALID_REGISTRATION_DETAILS',
      }, { status: 400 })
    }

    if (!['agent', 'bridger'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be agent or bridger.' }, { status: 400 })
    }

    if (!departmentalCode) {
      return NextResponse.json(
        { error: 'A departmental registration code is required for this role.' },
        { status: 400 }
      )
    }

    const dept = role.toUpperCase() as Department
    const validation = await validateDepartmentalCode(departmentalCode, dept)
    if (!validation.valid) {
      if (validation.error === 'Code has already been used.') {
        const recovered = await recoverCompletedRegistration({
          code:departmentalCode,department:dept,role,email,username,password,
        })
        if (recovered) return recovered
      }
      return NextResponse.json(
        { error: validation.error || 'Invalid departmental code.', code: 'ENTRY_CODE_UNAVAILABLE' },
        { status: 409 }
      )
    }

    const existingEmail = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existingEmail.length > 0) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

    const existingUsername = await sql`SELECT id FROM users WHERE username = ${username}`
    if (existingUsername.length > 0) return NextResponse.json({ error: 'Username already taken' }, { status: 400 })

    const passwordHash = await bcrypt.hash(password, 10)

    let referralOwner: any = null
    if (referredByBridgerId) {
      referralOwner = await resolveReferralOwnerByCode(String(referredByBridgerId))
      if (!referralOwner && /^[0-9a-f-]{36}$/i.test(String(referredByBridgerId))) {
        const legacyOwner = await sql`
          SELECT id, role, referral_code
          FROM users
          WHERE id = ${String(referredByBridgerId)}::uuid
            AND role IN ('agent','bridger','client')
            AND is_active = true
          LIMIT 1
        `
        referralOwner = legacyOwner[0] || null
      }
    }

    if (referredByBridgerId && !referralOwner) {
      return NextResponse.json({ error: 'Referral code was not found or is inactive. Check the code before registering.' }, { status: 400 })
    }

    const genericReferrerId: string | null = referralOwner?.id || null
    const bridgerReferrerId: string | null =
      role === 'bridger' && referralOwner?.role === 'bridger' ? referralOwner.id : null
    const assignedAgentId: string | null =
      role === 'bridger' && referralOwner?.role === 'agent' ? referralOwner.id : null

    if (bridgerReferrerId) await ensureBridgerReferralColumns()

    // Form a whole account or none. A paid one-use code cannot be spent on an
    // account that fails to create its wallet, profile or login session.
    const userId = randomUUID()
    const referralCode = buildUserReferralCode(userId, role)
    const token = `ssb_${userId}_${Date.now()}`
    const connection = await getPool().connect()
    let user: any = null
    try {
      await connection.query('BEGIN')
      const tx = async (parts: TemplateStringsArray, ...values: unknown[]) => {
        let text = parts[0]
        for (let i = 0; i < values.length; i++) text += '$' + (i + 1) + parts[i + 1]
        return (await connection.query(text, values)).rows
      }
      const created = await tx`
        INSERT INTO users (
          id, email, username, name, gender, password_hash, role, departmental_code,
          referral_code, referred_by, referred_by_bridger_id, assigned_agent_id, created_at, updated_at
        )
        VALUES (
          ${userId}::uuid, ${email}, ${username}, ${name}, ${gender}, ${passwordHash}, ${role}, ${dept},
          ${referralCode}, ${genericReferrerId}::uuid, ${bridgerReferrerId}::uuid, ${assignedAgentId}::uuid, NOW(), NOW()
        )
        RETURNING id, email, username, name, gender, role, departmental_code, referral_code, assigned_agent_id
      `
      if (!created.length) throw new Error('Unable to create user profile')
      user = created[0]

      // Claim after user creation, under the same transaction. Prevents FK
      // failures if departmental_codes.used_by references users.id.
      const used = await tx`
        UPDATE departmental_codes SET status='USED', used_by=${userId}::uuid,
          used_at=NOW(), updated_at=NOW()
        WHERE code=${departmentalCode} AND department=${dept}
          AND status='ACTIVE' AND (expires_at IS NULL OR expires_at>NOW())
        RETURNING id
      `
      if (!used.length) {
        await connection.query('ROLLBACK')
        return NextResponse.json({
          error: 'This Entry Ticket code has already been used or expired. Your account was not charged or created. Contact Administration if you paid for this ticket.',
          code: 'ENTRY_CODE_UNAVAILABLE',
        }, { status: 409 })
      }
      await tx`
        INSERT INTO departmental_audit_log (event, department, target_user, code_id, result)
        VALUES ('USE_CODE', ${dept}, ${userId}::uuid, ${used[0].id}::uuid, 'SUCCESS')
      `
      await tx`
        INSERT INTO wallets (id, user_id, balance_trx, balance_usdt, is_primary, is_eight_engine_controlled, created_at, updated_at)
        VALUES (gen_random_uuid(), ${userId}::uuid, 0, 0, true, true, NOW(), NOW())
      `
      if (role === 'agent') {
        await tx`
          INSERT INTO agent_profiles (id, user_id, agent_type, status, rating, total_earnings, matches_completed, commission_rate, created_at, updated_at)
          VALUES (gen_random_uuid(), ${userId}::uuid, 'standard', 'active', 5.0, 0, 0, 0.20, NOW(), NOW())
        `
      } else {
        await tx`
          INSERT INTO bridger_profiles (id, user_id, status, referrals, total_earnings, commission_rate, created_at, updated_at)
          VALUES (gen_random_uuid(), ${userId}::uuid, 'active', 0, 0, 0.50, NOW(), NOW())
        `
        if (bridgerReferrerId) {
          await tx`
            UPDATE bridger_profiles
            SET bridger_referral_count = bridger_referral_count + 1, updated_at = NOW()
            WHERE user_id = ${bridgerReferrerId}::uuid
          `
        }
      }
      await tx`
        INSERT INTO sessions (id, user_id, token, created_at, expires_at)
        VALUES (gen_random_uuid(), ${userId}::uuid, ${token}, NOW(), NOW() + INTERVAL '7 days')
      `
      await connection.query('COMMIT')
    } catch (registrationError: any) {
      await connection.query('ROLLBACK').catch(() => {})
      if (registrationError?.code === '23505') {
        return NextResponse.json({
          error: 'This email or username is already registered. Please change that field or sign in instead.',
          code: 'ACCOUNT_ALREADY_EXISTS',
        }, { status: 409 })
      }
      throw registrationError
    } finally {
      connection.release()
    }

    // Secondary side effects must not make a successfully registered Bridger
    // appear to fail after their paid ticket has already been consumed.
    if (genericReferrerId) {
      try {
        const referralContent = assignedAgentId
          ? `${name} joined WEAVE as a Bridger through your Agent Carrier Door and is now attached to your Agent position.`
          : `${name} joined WEAVE using your referral code.`
        await sql`
          INSERT INTO notifications (user_id, type, title, content, from_user_name)
          VALUES (${genericReferrerId}::uuid, 'referral_signup',
          ${assignedAgentId ? 'Your Carrier Bridger joined WEAVE' : 'Your referral joined WEAVE'}, ${referralContent}, 'WEAVE')
        `
      } catch (notifyError) {
        console.error('[registration] Referral notification deferred', notifyError)
      }
    }
    try {
      await sql`
        INSERT INTO terms_acceptance_log (user_id, role, terms_version, full_name_confirmed)
        VALUES (${userId}::uuid, ${role}, 1, ${fullNameConfirmed})
      `
    } catch (termsError) {
      console.error('[registration] Terms log deferred', termsError)
    }
    try {
      await sql`UPDATE users SET terms_accepted_at = NOW() WHERE id = ${userId}::uuid`
    } catch (termsError) {
      console.error('[registration] Terms acceptance timestamp deferred', termsError)
    }
    if (genericReferrerId && ['agent','bridger'].includes(String(referralOwner?.role || ''))) {
      try {
        await queueReferralSignupBonus({
          referrerId: genericReferrerId,
          referredUserId: userId,
          referralCode: referralOwner?.referral_code || String(referredByBridgerId || ''),
        })
      } catch (bonusError) {
        console.error('[registration] Referral bonus deferred', bonusError)
      }
    }

    try {
      await recordPublicFlameMovementEvent({
        movementCode: publicFlameMovementCodeFromRequest(request),
        eventType: 'registration',
        userId,
        subjectId: role,
        metadata: { role, assignedAgentId },
      })
    } catch (movementError) {
      console.error('[Public Flame Movement] Staff registration attribution failed:', movementError)
    }

    return NextResponse.json({
      token,
      user: {
        id: userId,
        email: user.email,
        username: user.username,
        name: user.name,
        gender: user.gender,
        role: user.role,
        departmental_code: user.departmental_code,
        referral_code: user.referral_code,
        assigned_agent_id: user.assigned_agent_id || null,
        platform_wallet_balance: 0,
        escrow_balance: 0,
      },
    })
  } catch (error) {
    console.error('[WEAVE] Register error:', error)
    return NextResponse.json(
      { error: 'Registration could not be completed. Your Entry Ticket remains valid if no account was created. Please retry or contact Administration.', code: 'REGISTRATION_UNAVAILABLE' },
      { status: 500 }
    )
  }
}
