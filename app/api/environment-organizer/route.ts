import { NextResponse } from 'next/server'
import { getEnvironmentOrganizerState } from '@/lib/weave-environment-organizer'

export const dynamic='force-dynamic'

export async function GET(){
  try{
    const state=await getEnvironmentOrganizerState()
    return NextResponse.json({success:true,...state},{headers:{'Cache-Control':'no-store, max-age=0'}})
  }catch(error){
    console.error('[Environment Organizer] public state unavailable',error)
    return NextResponse.json({success:true,items:[],fallback:true},{headers:{'Cache-Control':'no-store, max-age=0'}})
  }
}
