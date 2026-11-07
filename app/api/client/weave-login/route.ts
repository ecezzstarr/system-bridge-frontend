import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { usableBcryptPasswordHash } from '@/lib/password-hash'
import { randomBytes } from 'node:crypto'
import { getDivineShieldState } from '@/lib/weave-infrastructure'
import { ensureUserReferralCode } from '@/lib/user-referral'
import { getProActivationState } from '@/lib/pro-file-folder-activation'
import { resolveVerifiedClientFileFolderTier } from '@/lib/client-file-folder-tier'


export async function POST(request: NextRequest) {
  try {
    const shield=await getDivineShieldState()
    if(shield.active) return NextResponse.json({error:'WEAVE is under maintenance. Divine Shield is active.'},{status:423})

    const { fileNumber, password } = await request.json()

    if (!fileNumber || !password) {
      return NextResponse.json(
        { error: 'File number and password are required' },
        { status: 400 }
      )
    }

    const result = await sql`
      SELECT id, email, name, role, password_hash, file_number, business_name, referral_code, referred_by
      FROM users
      WHERE file_number = ${fileNumber}
      AND is_active = true AND role = 'client'
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invalid file number or password' },
        { status: 401 }
      )
    }

    const user = result[0]

    const passwordHash = usableBcryptPasswordHash(user.password_hash)

    if (!passwordHash) {
      return NextResponse.json(
        {
          error: 'This Client account needs a password before it can sign in. Use Forgot Password with the email attached to this File Number.',
          code: 'PASSWORD_SETUP_REQUIRED',
          recovery: '/forgot-password',
        },
        { status: 409 }
      )
    }

    const isValid = await bcrypt.compare(password, passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid file number or password' },
        { status: 401 }
      )
    }

    const referralCode = user.referral_code || await ensureUserReferralCode(user.id)

    const token = `ssb_${randomBytes(32).toString('base64url')}`
    await sql`
      INSERT INTO sessions (id, user_id, token, created_at, expires_at)
      VALUES (gen_random_uuid(), ${user.id}::uuid, ${token}, NOW(), NOW() + INTERVAL '7 days')
    `

    const proActivation=await getProActivationState(String(user.id),String(user.file_number||''))
    let activationRequired=Boolean(proActivation&&proActivation.status!=='active')
    if(activationRequired&&user.file_number){
      const entitledTier=await resolveVerifiedClientFileFolderTier(sql,{
        clientId:String(user.id),fileNumber:String(user.file_number),proActivation,
      })
      // Pending Pro enrollment is NOT permission to redirect a genuine
      // Premium/Plus owner away from their already purchased private world.
      if(entitledTier==='premium'||entitledTier==='plus')activationRequired=false
    }
    return NextResponse.json({
      success: true,
      activationRequired,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.email?.split('@')[0] || 'client',
        role: user.role,
        file_number: user.file_number,
        business_name: user.business_name,
        referral_code: referralCode,
        referred_by: user.referred_by,
      }
    })
  } catch (error) {
    console.error('Weave login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
