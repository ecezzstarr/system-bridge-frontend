import { NextResponse } from 'next/server'
import { getEnvironmentOrganizerState } from '@/lib/weave-environment-organizer'
import { DEFAULT_ENVIRONMENT_RUNTIME_CONFIG } from '@/lib/weave-environment-runtime-profile'

export const dynamic='force-dynamic'

export async function GET(){
  try{
    const state=await getEnvironmentOrganizerState()
    return NextResponse.json({success:true,...state},{headers:{'Cache-Control':'no-store, max-age=0'}})
  }catch(error){
    console.error('[Environment Organizer] public state unavailable',error)
    return NextResponse.json({success:true,items:[],runtime:{config:DEFAULT_ENVIRONMENT_RUNTIME_CONFIG,version:0,updatedAt:null},fallback:true},{headers:{'Cache-Control':'no-store, max-age=0'}})
  }
}
