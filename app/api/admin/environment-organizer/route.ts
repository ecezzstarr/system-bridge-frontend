import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { canAccessEnvironmentRoute } from '@/lib/company-guidance-access'
import { logAudit } from '@/lib/db'
import {
  getEnvironmentOrganizerState,
  restoreEnvironmentDefaults,
  restoreEnvironmentRuntimeDefaults,
  setEnvironmentRuntimeConfig,
  setEnvironmentSurfaceOrder,
  setEnvironmentSurfaceVisibility,
} from '@/lib/weave-environment-organizer'

export const dynamic='force-dynamic'

async function requireAdmin(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return {error:NextResponse.json({success:false,error:'Unauthorized'},{status:401})}
  if(user.role!=='admin')return {error:NextResponse.json({success:false,error:'Administration access required'},{status:403})}
  return {user}
}

export async function GET(request:NextRequest){
  const auth=await requireAdmin(request)
  if(auth.error)return auth.error
  try{
    const state=await getEnvironmentOrganizerState()
    return NextResponse.json({success:true,...state,items:state.items.filter((item:any)=>canAccessEnvironmentRoute(item.route,auth.user?.role))},{headers:{'Cache-Control':'no-store, max-age=0'}})
  }catch(error:any){
    return NextResponse.json({success:false,error:error.message||'Unable to load Environment Organizer'},{status:500})
  }
}

export async function PATCH(request:NextRequest){
  const auth=await requireAdmin(request)
  if(auth.error)return auth.error

  try{
    const input=await request.json()
    if(input.surfaceKey==='shared-company-guidance')return NextResponse.json({success:false,error:'Agent and Bridger environment'},{status:403})
    const action=String(input.action||'')
    let state

    if(action==='set_visibility'){
      const surfaceKey=String(input.surfaceKey||'')
      state=await setEnvironmentSurfaceVisibility(surfaceKey,Boolean(input.visible),auth.user.id)
      await logAudit(auth.user.id,'environment_organizer.visibility',{surfaceKey,visible:Boolean(input.visible)})
    }else if(action==='set_order'){
      const surfaceKey=String(input.surfaceKey||'')
      const sortOrder=Number(input.sortOrder)
      if(!Number.isFinite(sortOrder))return NextResponse.json({success:false,error:'Valid sort order required'},{status:400})
      state=await setEnvironmentSurfaceOrder(surfaceKey,sortOrder,auth.user.id)
      await logAudit(auth.user.id,'environment_organizer.order',{surfaceKey,sortOrder})
    }else if(action==='set_runtime'){
      state=await setEnvironmentRuntimeConfig(input.config,auth.user.id)
      await logAudit(auth.user.id,'environment_organizer.runtime',{config:state.runtime.config,version:state.runtime.version})
    }else if(action==='restore_runtime_defaults'){
      state=await restoreEnvironmentRuntimeDefaults(auth.user.id)
      await logAudit(auth.user.id,'environment_organizer.runtime_defaults',{version:state.runtime.version})
    }else if(action==='restore_defaults'){
      state=await restoreEnvironmentDefaults(auth.user.id)
      await logAudit(auth.user.id,'environment_organizer.restore_defaults',{})
    }else{
      return NextResponse.json({success:false,error:'Unknown Environment Organizer action'},{status:400})
    }

    return NextResponse.json({success:true,...state,items:state.items.filter((item:any)=>canAccessEnvironmentRoute(item.route,auth.user?.role))},{headers:{'Cache-Control':'no-store, max-age=0'}})
  }catch(error:any){
    console.error('[Environment Organizer] update error',error)
    return NextResponse.json({success:false,error:error.message||'Unable to update environment organization'},{status:500})
  }
}
