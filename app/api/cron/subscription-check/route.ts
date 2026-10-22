import { NextRequest, NextResponse } from 'next/server'
import { hasWeaveSchedulerAuthority } from '@/lib/weave-scheduler-auth'

// Kept for existing scheduler compatibility. No more Bridger auto-renewals.
export async function GET(request:NextRequest) {
  const authorized=await hasWeaveSchedulerAuthority(request,{workflowPath:'.github/workflows/bridger-continuance.yml'})
  if(!authorized)return NextResponse.json({error:'Unauthorized'},{status:401})
  return NextResponse.json({success:true,retired:true,results:{reminded:0,autoRenewed:0,alreadyCurrent:0,insufficient:0,errors:0}})
}
