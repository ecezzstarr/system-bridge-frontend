import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomBytes, randomUUID } from 'node:crypto'
import { validateFileNumber } from '@/lib/fne'
import { ensureClientMoneyEnvironment } from '@/lib/client-money-environment'
import { getDivineShieldState } from '@/lib/weave-infrastructure'
import { buildUserReferralCode } from '@/lib/user-referral'
import { publicFlameMovementCodeFromRequest, recordPublicFlameMovementEvent } from '@/lib/public-flame-movement'
import { activatePurchasedFileFolderForClient } from '@/lib/file-folder-purchase-activation'
import { ensureClientMonthlySchema, normalizeRegisteredGender } from '@/lib/client-monthly-subscription'
import { ensureCompanyClientStaffSchema, staffOfferTokenHash } from '@/lib/company-client-staff'
import { issueWeaveReceipt } from '@/lib/weave-receipts'

export async function POST(request: NextRequest) {
  try {
    const shield=await getDivineShieldState()
    if(shield.active) return NextResponse.json({error:'WEAVE is under maintenance. Divine Shield is active.'},{status:423})

    const { fileNumber, staffOffer, email, password, businessName, gender: rawGender } = await request.json()
    const gender=normalizeRegisteredGender(rawGender)
    if(!gender)return NextResponse.json({error:'Choose Male or Female at registration.'},{status:400})
    await ensureClientMonthlySchema()

    if (!fileNumber || !email || !password) {
      return NextResponse.json(
        { error: 'File number, email, and password are required' },
        { status: 400 }
      )
    }

    const folder = await validateFileNumber(fileNumber)
    if (!folder) {
      return NextResponse.json(
        { error: 'Invalid or already registered file number' },
        { status: 400 }
      )
    }

    // A company-granted File Number requires the private offer link and
    // exact intended recipient email; retail registration is unaffected.
    await ensureCompanyClientStaffSchema()
    const [staffGrant] = await sql`
      SELECT id,token_hash,candidate_email,status,client_id,ticket_amount_usdt,applicant_contribution_usdt,proposed_personal_loan_usdt,folder_tier,receipt_number
      FROM company_client_staff_offers
      WHERE file_number=${fileNumber}
      LIMIT 1
    `
    if (staffGrant && (
      staffGrant.status !== 'approved' || staffGrant.client_id ||
      String(staffGrant.candidate_email).toLowerCase() !== String(email).trim().toLowerCase() ||
      !/^[a-f0-9]{64}$/i.test(String(staffOffer||'')) ||
      staffGrant.token_hash !== staffOfferTokenHash(String(staffOffer))
    )) {
      return NextResponse.json({error:'This staff File Folder requires its private company invitation and named email'},{status:403})
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
        gender,
        subscription_status,
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
        ${gender},
        'due',
        ${referralCode},
        ${bridgerId}
      )
      RETURNING id, name, email, role, file_number, business_name, gender, referral_code, referred_by
    `

    const user = newUser[0]

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

    if (staffGrant) {
      const [claimed] = await sql`
        UPDATE company_client_staff_offers
        SET client_id=${user.id}::uuid,updated_at=now()
        WHERE file_number=${fileNumber} AND token_hash=${staffOfferTokenHash(String(staffOffer))}
          AND status='approved' AND client_id IS NULL
        RETURNING id
      `
      if (!claimed) throw new Error('Staff File Folder has already been claimed')
      // The company ticket is already verified by Administration. Record its
      // receipt against the new Client identity without adding a retail sale.
      try {
        await issueWeaveReceipt({
          userId:String(user.id),kind:'payment',source:'company_staff_entry_ticket',
          sourceId:String(staffGrant.id),amount:Number(staffGrant.applicant_contribution_usdt || staffGrant.ticket_amount_usdt),
          currency:'USDT',status:'verified',
          description:'Verified applicant contribution to company entry ticket · company-granted '+String(staffGrant.folder_tier).toUpperCase()+' File Folder',
          metadata:{receiptReference:staffGrant.receipt_number,proposedPersonalLoanUSDT:Number(staffGrant.proposed_personal_loan_usdt||0)},
        })
      } catch (receiptError) {
        console.error('[company client staff] ticket receipt publication failed', receiptError)
      }
      try {
        await sql`
          INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
          VALUES (${user.id}::uuid,'company_staff_position',
            'Your company position workspace is ready',
            ${'Your approved company position and granted File Folder are ready. Open your workspace for business conversations and company correspondence.'},
            'WEAVE Employment','/client/staff-workspace')
        `
      } catch (notificationError) {
        console.error('[company client staff] position notification failed',notificationError)
      }
    }
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
        file_number: user.file_number,
        business_name: user.business_name,
        gender: user.gender,
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
