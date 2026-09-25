import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import {
  ensureWeaveInfrastructureSchema,
  getDivineShieldState,
  getInfrastructureRegistry,
  recentDeploymentRequests,
  recordDeploymentRequest,
} from '@/lib/weave-infrastructure'
import { cloudBuildControlStatus, triggerWeaveCloudBuild } from '@/lib/weave-cloud-control'
import { safePublicWebRead } from '@/lib/eight-web'

export const dynamic='force-dynamic'

async function requireAdmin(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return {response:NextResponse.json({error:'Unauthorized'},{status:401})}
  if(user.role!=='admin') return {response:NextResponse.json({error:'Forbidden'},{status:403})}
  return {user}
}

async function healthProbe(url:string,healthPath:string){
  const target=new URL(healthPath || '/api/health',url).toString()
  const started=Date.now()
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort(),5000)
  try{
    const response=await fetch(target,{cache:'no-store',signal:controller.signal})
    return {status:response.ok?'online':'error',httpStatus:response.status,latencyMs:Date.now()-started}
  }catch{
    return {status:'offline',httpStatus:null,latencyMs:Date.now()-started}
  }finally{
    clearTimeout(timeout)
  }
}

export async function GET(request:NextRequest){
  const auth=await requireAdmin(request)
  if(auth.response) return auth.response
  try{
    await ensureWeaveInfrastructureSchema()
    const [registry,shield,deployments]=await Promise.all([
      getInfrastructureRegistry(),
      getDivineShieldState(),
      recentDeploymentRequests(12),
    ])
    const systems=await Promise.all(registry.map(async(system:any)=>({
      ...system,
      health:system.public_url && system.enabled
        ? await healthProbe(system.public_url,system.health_path)
        : {status:system.enabled?'internal':'disabled',httpStatus:null,latencyMs:null},
    })))
    return NextResponse.json({
      success:true,
      cloud:cloudBuildControlStatus(),
      shield,
      systems,
      deployments,
    })
  }catch(error){
    console.error('[Infrastructure] snapshot error:',error)
    return NextResponse.json({success:false,error:error instanceof Error?error.message:'Infrastructure unavailable'},{status:500})
  }
}

export async function POST(request:NextRequest){
  const auth=await requireAdmin(request)
  if(auth.response) return auth.response
  const user=auth.user!
  try{
    const body=await request.json()
    const action=body?.action

    if(action==='web_probe'){
      if(typeof body.url!=='string' || !body.url.trim()) return NextResponse.json({success:false,error:'URL required'},{status:400})
      const result=await safePublicWebRead(body.url.trim())
      return NextResponse.json({success:true,result})
    }

    if(action==='deploy_preview' || action==='deploy_promote'){
      const expected=action==='deploy_preview'?'DEPLOY_PREVIEW':'PROMOTE_PRODUCTION'
      if(body.confirm!==expected){
        return NextResponse.json({success:false,error:`Confirmation "${expected}" required`},{status:409})
      }
      const cloudAction=action==='deploy_preview'?'preview':'promote'
      try{
        const result=await triggerWeaveCloudBuild(cloudAction)
        const deployment=await recordDeploymentRequest({
          action:cloudAction,
          sourceRef:result.sourceRef,
          externalId:result.operationName,
          status:'requested',
          adminId:user.id,
          details:{triggerId:result.triggerId},
        })
        return NextResponse.json({success:true,result,deployment})
      }catch(error){
        await recordDeploymentRequest({
          action:cloudAction,
          sourceRef:'main',
          status:'failed_to_start',
          adminId:user.id,
          details:{error:error instanceof Error?error.message:'Cloud Build request failed'},
        }).catch(()=>null)
        throw error
      }
    }

    return NextResponse.json({success:false,error:'Unknown infrastructure action'},{status:400})
  }catch(error){
    console.error('[Infrastructure] action error:',error)
    return NextResponse.json({success:false,error:error instanceof Error?error.message:'Infrastructure action failed'},{status:500})
  }
}
