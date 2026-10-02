import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { canAccessEnvironmentRoute } from '@/lib/company-guidance-access'
import { getEnvironmentOrganizerState } from '@/lib/weave-environment-organizer'
import { DEFAULT_ENVIRONMENT_RUNTIME_CONFIG } from '@/lib/weave-environment-runtime-profile'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  try{
    const state=await getEnvironmentOrganizerState()
    const user=await getAuthUser(request)
    const items=state.items.filter((item:any)=>canAccessEnvironmentRoute(item.route,user?.role))
    return NextResponse.json({success:true,...state,items},{headers:{'Cache-Control':'no-store, max-age=0'}})
  }catch(error){
    console.error('[Environment Organizer] public state unavailable',error)
    return NextResponse.json({success:true,items:[],runtime:{config:DEFAULT_ENVIRONMENT_RUNTIME_CONFIG,version:0,updatedAt:null},fallback:true},{headers:{'Cache-Control':'no-store, max-age=0'}})
  }
}
