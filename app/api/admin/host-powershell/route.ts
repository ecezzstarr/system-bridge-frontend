import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { getPowerShellStatus } from '@/lib/weave-host-powershell'

export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  const authorized=await requireWorkshopAuthorization(request)
  if(!authorized.authorized)return authorized.response
  try{return NextResponse.json({success:true,...await getPowerShellStatus()},{headers:{'Cache-Control':'private, no-store'}})}
  catch(error){console.error('[PowerShell Host] admin read failed',error);return NextResponse.json({error:'Host telemetry unavailable'},{status:503})}
}
