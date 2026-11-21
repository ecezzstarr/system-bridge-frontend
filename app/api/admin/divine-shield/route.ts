import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getDivineShieldState, setDivineShieldState, recordDeploymentRequest } from '@/lib/weave-infrastructure'
import { getDivineShieldReadiness, runDivineShieldChecks } from '@/lib/weave-divine-shield-checks'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='admin') return NextResponse.json({error:'Forbidden'},{status:403})
  try{
    return NextResponse.json({success:true,state:await getDivineShieldState(),readiness:await getDivineShieldReadiness()})
  }catch(error){
    console.error('[Divine Shield] admin read error:',error)
    return NextResponse.json({success:false,error:'Unable to read Divine Shield'},{status:500})
  }
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='admin') return NextResponse.json({error:'Forbidden'},{status:403})
  try{
    const body=await request.json()
    if(body?.action==='check'){
      const result=await runDivineShieldChecks(user.id)
      return NextResponse.json({success:true,check:result,readiness:await getDivineShieldReadiness()})
    }
    if(typeof body?.active!=='boolean'){
      return NextResponse.json({success:false,error:'active must be boolean'},{status:400})
    }
    if(body.confirm!==(body.active?'RAISE_DIVINE_SHIELD':'RELEASE_DIVINE_SHIELD')){
      return NextResponse.json({success:false,error:'Explicit Administrations confirmation required'},{status:400})
    }
    const title=typeof body.title==='string' ? body.title.trim().slice(0,255) : undefined
    const message=typeof body.message==='string' ? body.message.trim().slice(0,2000) : undefined
    const state=await setDivineShieldState({active:body.active,title,message,adminId:user.id})
    // Every manual transition has durable actor and release context in the
    // infrastructure ledger, in addition to the persistent active control.
    let recorded=true
    try{
      await recordDeploymentRequest({
        action:body.active?'divine_shield_raise':'divine_shield_release',
        sourceRef:process.env.WEAVE_RELEASE_SHA||null,
        status:'completed',adminId:user.id,
        details:{preservedSessions:true,stateUpdatedAt:state.updatedAt},
      })
    }catch(auditError){
      // Do not pretend a successful state change failed. Surface the separate
      // audit fault prominently for immediate Administrations reconciliation.
      recorded=false
      console.error('[Divine Shield] state changed but transition audit failed:',auditError)
    }

    // Raising the shield never revokes or deletes genuine participant sessions.
    return NextResponse.json({success:true,state,preservedSessions:true,recorded,readiness:await getDivineShieldReadiness()})
  }catch(error){
    console.error('[Divine Shield] update error:',error)
    return NextResponse.json({success:false,error:error instanceof Error?error.message:'Unable to update Divine Shield'},{status:409})
  }
}
