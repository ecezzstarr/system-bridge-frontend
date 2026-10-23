import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getProspectAutoStatus, runProspectMarketAuto, saveProspectAutoSource, setProspectAutoEnabled } from '@/lib/prospect-market-auto'

export const dynamic = 'force-dynamic'
async function adminUser(request:NextRequest) {
  const user=await getAuthUser(request)
  return user?.role==='admin' ? user : null
}
export async function GET(request:NextRequest) {
  const user=await adminUser(request)
  if(!user)return NextResponse.json({error:'Administration access required'},{status:403})
  try{return NextResponse.json({success:true,...await getProspectAutoStatus()})}
  catch(error){console.error('[prospect-auto] status failed',error);return NextResponse.json({error:'Prospect automation unavailable'},{status:503})}
}
export async function POST(request:NextRequest) {
  const user=await adminUser(request)
  if(!user)return NextResponse.json({error:'Administration access required'},{status:403})
  try {
    const body=await request.json()
    const action=String(body?.action||'')
    if(action==='save_country') {
      await saveProspectAutoSource(user.id,String(body.countryCode||''),String(body.seed||''),body.enabled===true)
      return NextResponse.json({success:true,...await getProspectAutoStatus()})
    }
    if(action==='set_enabled') {
      await setProspectAutoEnabled(user.id,body.enabled===true)
      return NextResponse.json({success:true,...await getProspectAutoStatus()})
    }
    if(action==='run_now') {
      const result=await runProspectMarketAuto()
      return NextResponse.json({success:true,result,...await getProspectAutoStatus()})
    }
    return NextResponse.json({error:'Unsupported action'},{status:400})
  }catch(error:any){
    console.error('[prospect-auto] admin action failed',error)
    return NextResponse.json({error:error?.message||'Prospect automation failed'},{status:503})
  }
}
