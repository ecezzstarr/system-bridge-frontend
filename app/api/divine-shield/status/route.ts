import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { getDivineShieldState } from '@/lib/weave-infrastructure'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  try{
    const authHeader=request.headers.get('authorization')
    const bearerToken=authHeader?.replace(/^Bearer\s+/i,'').trim() || null
    const [state,user,tokenRows]=await Promise.all([
      getDivineShieldState(),
      getAuthUser(request),
      bearerToken ? sql`SELECT 1 FROM sessions WHERE token=${bearerToken} AND expires_at>NOW() LIMIT 1` : Promise.resolve([]),
    ])
    return NextResponse.json({
      success:true,
      active:state.active,
      title:state.title,
      message:state.message,
      updatedAt:state.updatedAt,
      administrationBypass:user?.role==='admin',
      sessionValid:bearerToken ? tokenRows.length>0 : true,
    },{
      headers:{'Cache-Control':'no-store, max-age=0'}
    })
  }catch(error){
    console.error('[Divine Shield] status error:',error)
    // Fail open: infrastructure trouble must not accidentally lock everyone out.
    return NextResponse.json({
      success:false,
      active:false,
      administrationBypass:false,
      sessionValid:true,
      error:'Divine Shield status unavailable',
    },{status:200,headers:{'Cache-Control':'no-store, max-age=0'}})
  }
}
