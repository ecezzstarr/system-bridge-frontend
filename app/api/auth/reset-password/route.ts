import crypto from 'node:crypto'

import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import type { PoolClient } from 'pg'

import { getPool } from '@/lib/db'
import { ensureRecoveryRequestSchema } from '@/lib/access-recovery-requests'
import {
  PASSWORD_RECOVERY_MAX_ATTEMPTS,
  ensurePasswordRecoverySchema,
  normalizeRecoveryEmail,
  recoveryCodeHash,
} from '@/lib/password-recovery'
import {
  ADMIN_RECOVERY_MAX_ATTEMPTS,
  ensureAdminAccessRecoverySchema,
} from '@/lib/admin-access-recovery'

export const runtime='nodejs'

function codeMatches(id:string,expectedHash:string,code:string){
  const expected=Buffer.from(String(expectedHash),'hex')
  const supplied=Buffer.from(recoveryCodeHash(String(id),code),'hex')
  return expected.length===supplied.length&&crypto.timingSafeEqual(expected,supplied)
}

export async function POST(request:NextRequest){
  const pool=getPool()
  let client:PoolClient|null=null

  try{
    const body=await request.json()
    const email=normalizeRecoveryEmail(body.email)
    const code=String(body.code||'').trim()
    const password=String(body.password||'')

    if(!email||!/^[0-9]{6}$/.test(code)||!password){
      return NextResponse.json(
        {error:'Email, 6-digit recovery code, and new password are required.'},
        {status:400},
      )
    }

    if(password.length<8){
      return NextResponse.json({error:'Password must be at least 8 characters.'},{status:400})
    }

    await Promise.all([
      ensurePasswordRecoverySchema(),
      ensureAdminAccessRecoverySchema(),
      ensureRecoveryRequestSchema(),
    ])

    client=await pool.connect()
    await client.query('BEGIN')

    const challenges=await client.query(
      `SELECT c.id,c.user_id,c.code_hash,c.attempts,c.expires_at,u.role
       FROM password_recovery_challenges c
       INNER JOIN users u ON u.id=c.user_id
       WHERE LOWER(c.email)=LOWER($1)
         AND c.consumed_at IS NULL
         AND c.delivered_at IS NOT NULL
         AND c.expires_at>NOW()
         AND u.is_active=true
       ORDER BY c.created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [email],
    )

    const grants=await client.query(
      `SELECT g.id,g.user_id,g.code_hash,g.attempts,g.expires_at,u.role
       FROM admin_access_recovery_grants g
       INNER JOIN users u ON u.id=g.user_id
       WHERE LOWER(g.email)=LOWER($1)
         AND g.consumed_at IS NULL
         AND g.revoked_at IS NULL
         AND g.expires_at>NOW()
         AND u.is_active=true
       ORDER BY g.created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [email],
    )

    const challenge=challenges.rows[0]
    const grant=grants.rows[0]

    const emailValid=Boolean(
      challenge&&
      Number(challenge.attempts||0)<PASSWORD_RECOVERY_MAX_ATTEMPTS&&
      codeMatches(String(challenge.id),String(challenge.code_hash),code)
    )
    const adminValid=Boolean(
      grant&&
      Number(grant.attempts||0)<ADMIN_RECOVERY_MAX_ATTEMPTS&&
      codeMatches(String(grant.id),String(grant.code_hash),code)
    )

    if(!emailValid&&!adminValid){
      if(challenge&&Number(challenge.attempts||0)<PASSWORD_RECOVERY_MAX_ATTEMPTS){
        await client.query(
          'UPDATE password_recovery_challenges SET attempts=attempts+1 WHERE id=$1::uuid',
          [challenge.id],
        )
      }
      if(grant&&Number(grant.attempts||0)<ADMIN_RECOVERY_MAX_ATTEMPTS){
        await client.query(
          'UPDATE admin_access_recovery_grants SET attempts=attempts+1 WHERE id=$1::uuid',
          [grant.id],
        )
      }
      await client.query('COMMIT')
      return NextResponse.json({error:'Invalid or expired recovery code.'},{status:400})
    }

    const authority=adminValid?'administration':'email'
    const recovery=adminValid?grant:challenge
    const hashedPassword=await bcrypt.hash(password,10)

    await client.query(
      'UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2::uuid',
      [hashedPassword,recovery.user_id],
    )
    await client.query(
      'UPDATE password_recovery_challenges SET consumed_at=COALESCE(consumed_at,NOW()) WHERE user_id=$1::uuid AND consumed_at IS NULL',
      [recovery.user_id],
    )
    await client.query(
      `UPDATE admin_access_recovery_grants
       SET consumed_at=COALESCE(consumed_at,NOW())
       WHERE user_id=$1::uuid
         AND consumed_at IS NULL
         AND revoked_at IS NULL`,
      [recovery.user_id],
    )
    await client.query('DELETE FROM sessions WHERE user_id=$1::uuid',[recovery.user_id])
    await client.query("UPDATE access_recovery_requests SET status='used',code_ciphertext=NULL WHERE user_id=$1::uuid AND status IN ('pending','approved')",[recovery.user_id])

    await client.query('COMMIT')

    return NextResponse.json({
      success:true,
      message:'Password has been reset successfully.',
      role:recovery.role,
      authority,
      login:recovery.role==='client'?'/client/login':'/login',
    })
  }catch(error){
    if(client){
      try{await client.query('ROLLBACK')}catch{}
    }
    console.error('[password-recovery] reset failed',error)
    return NextResponse.json({error:'Unable to reset password.'},{status:500})
  }finally{
    client?.release()
  }
}
