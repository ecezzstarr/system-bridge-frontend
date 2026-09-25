import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { getDivineShieldState } from '@/lib/weave-infrastructure'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  const authHeader=request.headers.get('authorization')
  const bearerToken=authHeader?.replace(/^Bearer\s+/i,'').trim() || null
  const user=await getAuthUser(request).catch(()=>null)
  const administrationBypass=user?.role==='admin'

  try{
    const [state,tokenRows]=await Promise.all([
      getDivineShieldState(),
      bearerToken ? sql`SELECT 1 FROM sessions WHERE token=${bearerToken} AND expires_at>NOW() LIMIT 1` : Promise.resolve([]),
    ])
    return NextResponse.json({
      success:true,
      active:state.active,
      title:state.title,
      message:state.message,
      updatedAt:state.updatedAt,
      administrationBypass,
      sessionValid:bearerToken ? tokenRows.length>0 : true,
    },{
      headers:{'Cache-Control':'no-store, max-age=0'}
    })
  }catch(error){
    console.error('[Divine Shield] status error:',error)
    // Fail closed for public/non-admin access. Administration remains reachable
    // through the dedicated maintenance entrance so infrastructure can be repaired.
    return NextResponse.json({
      success:false,
      active:!administrationBypass,
      administrationBypass,
      sessionValid:administrationBypass,
      title:'WEAVE maintenance boundary',
      message:'WEAVE cannot currently verify the maintenance control. Participation remains outside while Administration restores the infrastructure.',
      error:'Divine Shield status unavailable',
    },{status:200,headers:{'Cache-Control':'no-store, max-age=0'}})
  }
}
