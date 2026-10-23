import { NextRequest, NextResponse } from 'next/server'
import { hasWeaveSchedulerAuthority } from '@/lib/weave-scheduler-auth'
import { runProspectMarketAuto } from '@/lib/prospect-market-auto'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest) {
  if (!await hasWeaveSchedulerAuthority(request,{workflowPath:'.github/workflows/weave-prospect-market.yml'})) {
    return NextResponse.json({error:'Unauthorized scheduler'},{status:403})
  }
  try{
    const result=await runProspectMarketAuto()
    return NextResponse.json({success:true,result},{headers:{'Cache-Control':'no-store'}})
  }catch(error){
    console.error('[prospect-auto] scheduled publication failed',error)
    return NextResponse.json({error:'Prospect marketplace replenishment failed'},{status:503})
  }
}
