import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { logAudit } from '@/lib/db'
import {
  getVisualHistory,
  getVisualProfile,
  publishVisualProfile,
  resetVisualDraft,
  restoreDraftFromPublished,
  rollbackVisualProfile,
  saveVisualDraft,
} from '@/lib/weave-visual-runtime'

export const dynamic='force-dynamic'

async function requireAdmin(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return {error:NextResponse.json({success:false,error:'Unauthorized'},{status:401})}
  if(user.role!=='admin')return {error:NextResponse.json({success:false,error:'Administration access required'},{status:403})}
  return {user}
}

async function payload(){
  const [profile,history]=await Promise.all([getVisualProfile(),getVisualHistory(18)])
  return {success:true,profile,history}
}

export async function GET(request:NextRequest){
  const auth=await requireAdmin(request)
  if(auth.error)return auth.error
  try{
    return NextResponse.json(await payload(),{headers:{'Cache-Control':'no-store, max-age=0'}})
  }catch(error:any){
    console.error('[Visual Systems] load error',error)
    return NextResponse.json({success:false,error:error.message||'Unable to load Visual Systems Workshop'},{status:500})
  }
}

export async function PATCH(request:NextRequest){
  const auth=await requireAdmin(request)
  if(auth.error)return auth.error

  try{
    const input=await request.json()
    const action=String(input.action||'')

    if(action==='save_draft'){
      await saveVisualDraft(input.config,auth.user.id)
      await logAudit(auth.user.id,'visual_systems.save_draft',{profile:'flame-event-artifact'})
    }else if(action==='publish'){
      await publishVisualProfile(input.config,auth.user.id)
      await logAudit(auth.user.id,'visual_systems.publish',{profile:'flame-event-artifact'})
    }else if(action==='restore_live'){
      await restoreDraftFromPublished(auth.user.id)
      await logAudit(auth.user.id,'visual_systems.restore_live',{profile:'flame-event-artifact'})
    }else if(action==='reset_draft'){
      await resetVisualDraft(auth.user.id)
      await logAudit(auth.user.id,'visual_systems.reset_draft',{profile:'flame-event-artifact'})
    }else if(action==='rollback'){
      const revisionId=typeof input.revisionId==='string'?input.revisionId:''
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(revisionId)){
        return NextResponse.json({success:false,error:'Valid revision id required'},{status:400})
      }
      await rollbackVisualProfile(revisionId,auth.user.id)
      await logAudit(auth.user.id,'visual_systems.rollback',{profile:'flame-event-artifact',revisionId})
    }else{
      return NextResponse.json({success:false,error:'Unknown visual workshop action'},{status:400})
    }

    return NextResponse.json(await payload(),{headers:{'Cache-Control':'no-store, max-age=0'}})
  }catch(error:any){
    console.error('[Visual Systems] update error',error)
    return NextResponse.json({success:false,error:error.message||'Unable to update visual system'},{status:500})
  }
}
