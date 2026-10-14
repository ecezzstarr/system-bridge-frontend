import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import {
  ensureWeaveInfrastructureSchema,
  getDivineShieldState,
  getInfrastructureRegistry,
} from '@/lib/weave-infrastructure'
import { listWeaveDeploymentRecords } from '@/lib/weave-deployment-records'
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
      listWeaveDeploymentRecords(20),
    ])
    const systems=await Promise.all(registry.map(async(system:any)=>({
      ...system,
      health:system.public_url && system.enabled
        ? await healthProbe(system.public_url,system.health_path)
        : {status:system.enabled?'internal':'disabled',httpStatus:null,latencyMs:null},
    })))
    return NextResponse.json({
      success:true,
      runtime:{
        mode:'selfhost',
        domain:process.env.WEAVE_DOMAIN || 'weavingsystem.online',
        serverKey:process.env.WEAVE_DEPLOYMENT_SERVER || 'weave-selfhost',
        releaseSha:process.env.WEAVE_RELEASE_SHA || null,
        edge:'caddy',
        application:'docker-compose',
        deployAuthority:'verified-main-to-selfhost',
      },
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
  try{
    const body=await request.json()
    const action=body?.action

    if(action==='web_probe'){
      if(typeof body.url!=='string' || !body.url.trim()) return NextResponse.json({success:false,error:'URL required'},{status:400})
      const result=await safePublicWebRead(body.url.trim())
      return NextResponse.json({success:true,result})
    }

    return NextResponse.json({
      success:false,
      error:'Production deployment is controlled by the verified main → WEAVE self-host deployment path. Cloud deployment actions are retired.',
    },{status:400})
  }catch(error){
    console.error('[Infrastructure] action error:',error)
    return NextResponse.json({success:false,error:error instanceof Error?error.message:'Infrastructure action failed'},{status:500})
  }
}
