import crypto from 'node:crypto'
import type { PoolClient } from 'pg'

import { getPool } from '@/lib/db'
import { recoveryCodeHash } from '@/lib/password-recovery'

export const ADMIN_RECOVERY_TTL_MINUTES=15
export const ADMIN_RECOVERY_MAX_ATTEMPTS=5
export const ADMIN_RECOVERY_TARGET_COOLDOWN_SECONDS=60
export const ADMIN_RECOVERY_MAX_ISSUES_PER_HOUR=20

let schemaPromise:Promise<void>|null=null

export async function ensureAdminAccessRecoverySchema(){
  if(schemaPromise)return schemaPromise
  schemaPromise=(async()=>{
    const client=await getPool().connect()
    let locked=false
    try{
      await client.query('SELECT pg_advisory_lock(hashtext($1))',['weave_admin_access_recovery_v1'])
      locked=true
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin_access_recovery_grants (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          issued_by UUID NOT NULL REFERENCES users(id),
          email VARCHAR(255) NOT NULL,
          code_hash VARCHAR(64) NOT NULL,
          reason VARCHAR(500) NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          expires_at TIMESTAMPTZ NOT NULL,
          consumed_at TIMESTAMPTZ,
          revoked_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_admin_access_recovery_user
        ON admin_access_recovery_grants(user_id,created_at DESC)
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_admin_access_recovery_admin
        ON admin_access_recovery_grants(issued_by,created_at DESC)
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_admin_access_recovery_email
        ON admin_access_recovery_grants(LOWER(email),created_at DESC)
      `)
    }finally{
      if(locked){
        try{await client.query('SELECT pg_advisory_unlock(hashtext($1))',['weave_admin_access_recovery_v1'])}catch{}
      }
      client.release()
    }
  })().catch(error=>{
    schemaPromise=null
    throw error
  })
  return schemaPromise
}

export function generateAdminRecoveryCode(){
  return String(crypto.randomInt(100000,1000000))
}

export async function issueAdminRecoveryGrant(input:{
  adminId:string
  targetUserId:string
  reason:string
  client?:PoolClient
}){
  await ensureAdminAccessRecoverySchema()
  const pool=getPool()
  const client=input.client||await pool.connect()
  const ownsTransaction=!input.client
  try{
    if(ownsTransaction)await client.query('BEGIN')

    const adminResult=await client.query(
      `SELECT id,role FROM users WHERE id=$1::uuid AND role='admin' AND is_active=true LIMIT 1 FOR UPDATE`,
      [input.adminId],
    )
    if(!adminResult.rows[0])throw new Error('Administration authority is not active')

    const targetResult=await client.query(
      `SELECT id,name,email,username,role,file_number
       FROM users
       WHERE id=$1::uuid
         AND is_active=true
         AND role IN ('agent','bridger','client','admin')
       LIMIT 1
       FOR UPDATE`,
      [input.targetUserId],
    )
    const target=targetResult.rows[0]
    if(!target)throw new Error('Active WEAVE user not found')
    if(target.role==='admin'&&String(target.id)!==String(input.adminId)){
      throw new Error('Administration may not issue recovery access for another Administration account')
    }

    const reason=String(input.reason||'').trim()
    if(reason.length<6)throw new Error('Record a brief identity-verification reason before issuing recovery access')

    const hourly=await client.query(
      `SELECT COUNT(*)::int AS count
       FROM admin_access_recovery_grants
       WHERE issued_by=$1::uuid
         AND created_at>NOW()-INTERVAL '1 hour'`,
      [input.adminId],
    )
    if(Number(hourly.rows[0]?.count||0)>=ADMIN_RECOVERY_MAX_ISSUES_PER_HOUR){
      throw new Error('Administration recovery issue limit reached for this hour')
    }

    const recent=await client.query(
      `SELECT created_at
       FROM admin_access_recovery_grants
       WHERE user_id=$1::uuid
       ORDER BY created_at DESC
       LIMIT 1`,
      [target.id],
    )
    if(recent.rows[0]){
      const age=(Date.now()-new Date(recent.rows[0].created_at).getTime())/1000
      if(age<ADMIN_RECOVERY_TARGET_COOLDOWN_SECONDS){
        throw new Error('A recovery grant was just issued for this user. Wait before issuing another.')
      }
    }

    await client.query(
      `UPDATE admin_access_recovery_grants
       SET revoked_at=COALESCE(revoked_at,NOW())
       WHERE user_id=$1::uuid
         AND consumed_at IS NULL
         AND revoked_at IS NULL
         AND expires_at>NOW()`,
      [target.id],
    )

    const id=crypto.randomUUID()
    const code=generateAdminRecoveryCode()
    const codeHash=recoveryCodeHash(id,code)
    const expiresAt=new Date(Date.now()+ADMIN_RECOVERY_TTL_MINUTES*60_000)

    await client.query(
      `INSERT INTO admin_access_recovery_grants
        (id,user_id,issued_by,email,code_hash,reason,expires_at)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7)`,
      [id,target.id,input.adminId,target.email,codeHash,reason,expiresAt],
    )

    if(ownsTransaction)await client.query('COMMIT')
    return {
      id,
      code,
      expiresAt:expiresAt.toISOString(),
      target:{
        id:target.id,
        name:target.name,
        email:target.email,
        username:target.username,
        role:target.role,
        fileNumber:target.file_number,
      },
    }
  }catch(error){
    if(ownsTransaction)try{await client.query('ROLLBACK')}catch{}
    throw error
  }finally{
    if(ownsTransaction)client.release()
  }
}
