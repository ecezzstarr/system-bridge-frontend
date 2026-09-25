import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getDivineShieldState } from '@/lib/weave-infrastructure'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  try{
    const [state,user]=await Promise.all([
      getDivineShieldState(),
      getAuthUser(request),
    ])
    return NextResponse.json({
      success:true,
      active:state.active,
      title:state.title,
      message:state.message,
      updatedAt:state.updatedAt,
      administrationBypass:user?.role==='admin',
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
      error:'Divine Shield status unavailable',
    },{status:200,headers:{'Cache-Control':'no-store, max-age=0'}})
  }
}
