import { NextResponse } from 'next/server'
import { DEFAULT_FLAME_ARTIFACT_CONFIG } from '@/lib/weave-visual-profile'
import { getPublishedVisualProfile } from '@/lib/weave-visual-runtime'

export const dynamic='force-dynamic'

export async function GET(){
  try{
    const profile=await getPublishedVisualProfile()
    return NextResponse.json(
      {success:true,profileKey:'flame-event-artifact',...profile},
      {headers:{'Cache-Control':'no-store, max-age=0'}}
    )
  }catch(error){
    console.error('[Visual Runtime] published profile unavailable',error)
    return NextResponse.json(
      {success:true,profileKey:'flame-event-artifact',config:DEFAULT_FLAME_ARTIFACT_CONFIG,version:0,publishedAt:null,fallback:true},
      {headers:{'Cache-Control':'no-store, max-age=0'}}
    )
  }
}
