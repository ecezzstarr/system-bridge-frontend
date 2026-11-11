import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { getAdminUserDirectory } from '@/lib/admin-user-directory'

async function requireAdmin(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (authUser.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { userId: authUser.id }
}

export const dynamic = 'force-dynamic'
const privateHeaders={'Cache-Control':'private, no-store, max-age=0',Vary:'Authorization'}

export async function GET(request: NextRequest) {
  const auth=await requireAdmin(request)
  if (auth.error) return auth.error

  const params=request.nextUrl.searchParams
  const filter=params.get('filter')||'all'
  const search=(params.get('q')||'').trim()
  const offset=Number(params.get('offset')||'0')
  if (!['all','unassigned'].includes(filter) ||
      search.length>120 ||
      !Number.isSafeInteger(offset) || offset<0 || offset>1000000) {
    return NextResponse.json({success:false,error:'Invalid directory filter, search or offset.'},
      {status:400,headers:privateHeaders})
  }
  try {
    const directory=await getAdminUserDirectory({
      filter:filter as 'all'|'unassigned',search,offset,limit:100,
    })
    return NextResponse.json({
      success:true,...directory,offset,limit:100,
    },{headers:privateHeaders})
  } catch(error) {
    console.error('[Admin users] Main directory query failed:',error)
    return NextResponse.json({
      success:false,
      error:'Registered accounts could not be retrieved. Retry or inspect the server database connection.',
    },{status:503,headers:privateHeaders})
  }
}

export async function PUT(request:NextRequest) {
  const auth=await requireAdmin(request)
  if(auth.error)return auth.error
  try {
    const body=await request.json().catch(()=>({}))
    const userId=String(body.userId||'')
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)){
      return NextResponse.json({success:false,error:'Invalid user ID'},{status:400,headers:privateHeaders})
    }
    const pool=getPool()
    const target=await pool.query('SELECT role,is_active FROM users WHERE id=$1::uuid',[userId])
    if(!target.rows[0])return NextResponse.json(
      {success:false,error:'User not found'},{status:404,headers:privateHeaders})
    if(target.rows[0].role==='admin')return NextResponse.json(
      {success:false,error:'Administrations accounts cannot be changed here'},
      {status:403,headers:privateHeaders})
    if(body.action==='set_active'){
      if(typeof body.active!=='boolean')return NextResponse.json(
        {success:false,error:'Active state must be true or false'},{status:400,headers:privateHeaders})
      const client=await pool.connect()
      try{
        await client.query('BEGIN')
        const changed=await client.query(
          "UPDATE users SET is_active=$2,updated_at=NOW() WHERE id=$1::uuid AND role<>'admin' RETURNING id",
          [userId,body.active])
        if(changed.rowCount!==1)throw new Error('User state changed during update')
        if(!body.active)await client.query('DELETE FROM sessions WHERE user_id=$1::uuid',[userId])
        await client.query('COMMIT')
      }catch(error){
        await client.query('ROLLBACK').catch(()=>{})
        throw error
      }finally{client.release()}
      return NextResponse.json({
        success:true,message:body.active?'Account reactivated':'Account deactivated; financial records retained',
      },{headers:privateHeaders})
    }
    const department=body.departmental_code
    const roles:Record<string,string>={HOPE:'bridger',STABILITY:'agent',MOVEMENT:'client'}
    if(department && (typeof department!=='string'||!roles[department])){
      return NextResponse.json({success:false,error:'Invalid departmental code'},
        {status:400,headers:privateHeaders})
    }
    if(!department){
      await pool.query(
        "UPDATE users SET departmental_code=NULL,role='user',assigned_agent_id=NULL,updated_at=NOW() "+
        "WHERE id=$1::uuid AND role<>'admin'",[userId])
      return NextResponse.json({success:true,message:'Departmental role removed'},{headers:privateHeaders})
    }
    await pool.query(
      "UPDATE users SET departmental_code=$2,role=$3,updated_at=NOW() WHERE id=$1::uuid AND role<>'admin'",
      [userId,department,roles[department]])
    return NextResponse.json({success:true,message:'Department updated'},{headers:privateHeaders})
  }catch(error){
    console.error('[Admin users] Update failure:',error)
    return NextResponse.json({success:false,error:'Unable to update account'},
      {status:503,headers:privateHeaders})
  }
}

/** Preserve financial identity and ledger when Administration deactivates an account. */
export async function DELETE(request:NextRequest){
  const auth=await requireAdmin(request)
  if(auth.error)return auth.error
  const userId=request.nextUrl.searchParams.get('userId')||''
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)){
    return NextResponse.json({success:false,error:'Invalid user ID'},
      {status:400,headers:privateHeaders})
  }
  const client=await getPool().connect()
  try{
    await client.query('BEGIN')
    const target=await client.query(
      "UPDATE users SET is_active=false,updated_at=NOW() WHERE id=$1::uuid AND role<>'admin' RETURNING id,email",
      [userId])
    if(target.rowCount!==1){
      await client.query('ROLLBACK')
      return NextResponse.json({success:false,error:'User not found or Administrations account is protected'},
        {status:409,headers:privateHeaders})
    }
    await client.query('DELETE FROM sessions WHERE user_id=$1::uuid',[userId])
    await client.query('COMMIT')
    return NextResponse.json({
      success:true,message:'Account deactivated. Wallet, ledger, payment history and profiles are preserved.',
    },{headers:privateHeaders})
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    console.error('[Admin users] Deactivation failed:',error)
    return NextResponse.json({success:false,error:'Unable to deactivate account'},
      {status:503,headers:privateHeaders})
  }finally{client.release()}
}
