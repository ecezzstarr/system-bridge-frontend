import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { saveClientGender } from '@/lib/client-gender'
import { normalizeClientGender } from '@/lib/client-title'
import { randomBytes, randomUUID } from 'node:crypto'
import { validateFileNumber } from '@/lib/fne'
import { ensureClientMoneyEnvironment } from '@/lib/client-money-environment'
import { getDivineShieldState } from '@/lib/weave-infrastructure'
import { buildUserReferralCode } from '@/lib/user-referral'
import { publicFlameMovementCodeFromRequest, recordPublicFlameMovementEvent } from '@/lib/public-flame-movement'
import { activatePurchasedFileFolderForClient } from '@/lib/file-folder-purchase-activation'

export async function POST(request: NextRequest) {
  try {
    const shield=await getDivineShieldState()
    if(shield.active) return NextResponse.json({error:'WEAVE is under maintenance. Divine Shield is active.'},{status:423})

    const { fileNumber, email, password, businessName, gender } = await request.json()

    if (!fileNumber || !email || !password) {
      return NextResponse.json(
        { error: 'File number, email, and password are required' },
        { status: 400 }
      )
    }

    const recordedGender = normalizeClientGender(gender)
    if (gender != null && gender !== '' && !recordedGender) return NextResponse.json({ error: 'Choose female, male, or leave gender unset.' }, { status: 400 })

    const folder = await validateFileNumber(fileNumber)
    if (!folder) {
      return NextResponse.json(
        { error: 'Invalid or already registered file number' },
        { status: 400 }
      )
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const identityData = folder.identity_data as any
    const name = identityData?.name || 'Client'
    const phone = identityData?.phone || ''
    const bridgerId = folder.bridger_id || null
    const userId = randomUUID()
    const referralCode = buildUserReferralCode(userId, 'client')

    const newUser = await sql`
      INSERT INTO users (
        id,
        name,
        email,
        password_hash,
        role,
        file_number,
        whatsapp_number,
        business_name,
        referral_code,
        referred_by
      )
      VALUES (
        ${userId}::uuid,
        ${name},
        ${email},
        ${hashedPassword},
        'client',
        ${fileNumber},
        ${phone},
        ${businessName || null},
        ${referralCode},
        ${bridgerId}
      )
      RETURNING id, name, email, role, file_number, business_name, referral_code, referred_by
    `

    const user = newUser[0]
    await saveClientGender(sql, String(user.id), recordedGender)

    await sql`
      UPDATE file_folders
      SET status = 'registered', client_id = ${user.id}, registered_at = NOW()
      WHERE id = ${folder.id}
    `

    // Every Client account always carries its three money layers, even if the
    // account entered outside the normal Bridge path.
    await ensureClientMoneyEnvironment(sql, user.id)

    // The File Number was issued by Administration before registration. Claim
    // that exact persistent folder, attach the purchase to the new Client, and
    // start the included Customer Door formation in one idempotent movement.
    const activation = await activatePurchasedFileFolderForClient({
      sql,
      clientId: String(user.id),
      fileNumber: String(fileNumber),
      clientName: name,
    })

    const token = `ssb_${randomBytes(32).toString('base64url')}`
    await sql`
      INSERT INTO sessions (id, user_id, token, created_at, expires_at)
      VALUES (gen_random_uuid(), ${user.id}::uuid, ${token}, NOW(), NOW() + INTERVAL '7 days')
    `

    try {
      await recordPublicFlameMovementEvent({
        movementCode: publicFlameMovementCodeFromRequest(request),
        eventType: 'registration',
        userId: user.id,
        subjectId: String(fileNumber),
        metadata: { role: 'client' },
      })
    } catch (movementError) {
      console.error('[Public Flame Movement] Client registration attribution failed:', movementError)
    }

    return NextResponse.json({
      success: true,
      token,
      customerDoor: activation.customerDoor,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.email?.split('@')[0] || 'client',
        role: user.role,
        gender: recordedGender,
        file_number: user.file_number,
        business_name: user.business_name,
        referral_code: user.referral_code,
        referred_by: user.referred_by,
      },
    })
  } catch (error) {
    console.error('Weave register error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
