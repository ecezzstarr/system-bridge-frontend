import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { writePowerShellSnapshot } from '@/lib/weave-host-powershell'

export const dynamic='force-dynamic'
export const runtime='nodejs'
function hostAuthenticated(request:NextRequest){
  const expected=process.env.WEAVE_HOST_CONTROL_TOKEN||''
  const actual=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'')
  if(expected.length<32||actual.length!==expected.length)return false
  return timingSafeEqual(Buffer.from(actual),Buffer.from(expected))
}
export async function POST(request:NextRequest){
  if(!hostAuthenticated(request))return NextResponse.json({error:'Host worker authorization required'},{status:401})
  if(!request.headers.get('content-type')?.includes('application/json'))return NextResponse.json({error:'JSON required'},{status:415})
  try{
    const body=await request.json()
    const workerKey=String(body?.workerKey||'')
    if(!/^[a-z0-9][a-z0-9._-]{2,119}$/i.test(workerKey))return NextResponse.json({error:'Invalid worker identity'},{status:400})
    await writePowerShellSnapshot(workerKey,body?.snapshot)
    return NextResponse.json({success:true},{headers:{'Cache-Control':'no-store'}})
  }catch(error){
    console.error('[PowerShell Host] snapshot rejected',error)
    return NextResponse.json({error:'Host snapshot rejected'},{status:400})
  }
}
