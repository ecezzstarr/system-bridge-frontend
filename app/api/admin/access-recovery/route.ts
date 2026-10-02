import { NextRequest, NextResponse } from 'next/server'

import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { handleRecoveryRequest, listRecoveryRequests } from '@/lib/access-recovery-requests'
import {
  ensureAdminAccessRecoverySchema,
  issueAdminRecoveryGrant,
} from '@/lib/admin-access-recovery'

export const runtime='nodejs'

export async function GET(request:NextRequest){
  const admin=await getAuthUser(request)
  if(!admin||admin.role!=='admin'){
    return NextResponse.json({error:'Administration authentication required'},{status:401})
  }

  try{
    await ensureAdminAccessRecoverySchema()
    const pool=getPool()
    const q=String(request.nextUrl.searchParams.get('q')||'').trim()
    const search=`%${q.toLowerCase()}%`

    const users=q
      ? await pool.query(
          `SELECT id,name,email,username,role,file_number,is_active
           FROM users
           WHERE is_active=true
             AND role IN ('agent','bridger','client','admin')
             AND (
               LOWER(COALESCE(name,'')) LIKE $1
               OR LOWER(COALESCE(email,'')) LIKE $1
               OR LOWER(COALESCE(username,'')) LIKE $1
               OR LOWER(COALESCE(file_number,'')) LIKE $1
             )
           ORDER BY role,name
           LIMIT 50`,
          [search],
        )
      : {rows:[]}

    const recent=await pool.query(
      `SELECT g.id,g.user_id,g.email,g.reason,g.expires_at,g.consumed_at,g.revoked_at,g.created_at,
              u.name,u.role,u.file_number,
              a.name AS issued_by_name
       FROM admin_access_recovery_grants g
       JOIN users u ON u.id=g.user_id
       JOIN users a ON a.id=g.issued_by
       ORDER BY g.created_at DESC
       LIMIT 40`,
    )

    return NextResponse.json({
      success:true,
      users:users.rows.map((user:any)=>({
        ...user,
        canIssue:user.role!=='admin'||String(user.id)===String(admin.id),
      })),
      recent:recent.rows,
      requests:await listRecoveryRequests(),
      adminId:admin.id,
    }, {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[admin-access-recovery] GET failed',error)
    return NextResponse.json({error:'Access Recovery Desk is unavailable'},{status:500})
  }
}

export async function POST(request:NextRequest){
  const admin=await getAuthUser(request)
  if(!admin||admin.role!=='admin'){
    return NextResponse.json({error:'Administration authentication required'},{status:401})
  }

  try{
    const body=await request.json()
    const action=String(body.action||'issue')
    if(action==='approve-request'||action==='deny-request'){
      const requestId=String(body.requestId||'')
      if(!/^[0-9a-f-]{36}$/i.test(requestId))return NextResponse.json({error:'Select a recovery request'},{status:400})
      const result=await handleRecoveryRequest({adminId:admin.id,requestId,reason:String(body.reason||'').trim(),approve:action==='approve-request'})
      return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}})
    }

    if(action==='issue'){
      const targetUserId=String(body.targetUserId||'').trim()
      const reason=String(body.reason||'').trim()
      if(!targetUserId){
        return NextResponse.json({error:'Select a WEAVE user'},{status:400})
      }

      const grant=await issueAdminRecoveryGrant({
        adminId:admin.id,
        targetUserId,
        reason,
      })

      return NextResponse.json({
        success:true,
        grant,
        message:'One-time recovery access issued. The code is visible only in this response.',
      }, {headers:{'Cache-Control':'private, no-store'}})
    }

    if(action==='revoke'){
      await ensureAdminAccessRecoverySchema()
      const grantId=String(body.grantId||'').trim()
      if(!grantId)return NextResponse.json({error:'Grant ID is required'},{status:400})

      const result=await getPool().query(
        `UPDATE admin_access_recovery_grants
         SET revoked_at=COALESCE(revoked_at,NOW())
         WHERE id=$1::uuid
           AND consumed_at IS NULL
           AND revoked_at IS NULL
         RETURNING id,user_id,email,revoked_at`,
        [grantId],
      )
      if(!result.rows[0])return NextResponse.json({error:'Active recovery grant not found'},{status:404})

      return NextResponse.json({success:true,grant:result.rows[0]})
    }

    return NextResponse.json({error:'Unsupported recovery action'},{status:400})
  }catch(error:any){
    console.error('[admin-access-recovery] POST failed',error)
    return NextResponse.json({error:String(error?.message||'Unable to issue recovery access')},{status:400})
  }
}
