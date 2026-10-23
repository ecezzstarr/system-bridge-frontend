import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureVideoAdWorkshopSchema, mapVideoAdProject, type VideoAdScene } from '@/lib/video-ad-workshop'
import { VIDEO_STUDIO_CUSTOMER_ROLES } from '@/lib/video-ad-studio'
import { mediaObjectNameFromUrl } from '@/lib/weave-media-storage'

function ownedMedia(url: string, userId: string, category: 'audio'|'visual') {
  if(!url)return true
  const object=mediaObjectNameFromUrl(url)
  if(!object||!object.startsWith(`video-ads/customer-assets/${userId}/`))return false
  return category==='audio'
    ? /\.(mp3|m4a|wav|ogg|webm)$/i.test(object)
    : /\.(jpg|jpeg|png|webp|mp4|mov|webm)$/i.test(object)
}

export async function PATCH(request: NextRequest) {
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  if(!VIDEO_STUDIO_CUSTOMER_ROLES.has(user.role))return NextResponse.json({success:false,error:'Video Studio role required'},{status:403})
  try {
    const body=await request.json()
    const id=String(body?.projectId||'')
    if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({success:false,error:'Valid project ID required'},{status:400})
    await ensureVideoAdWorkshopSchema()
    const pool=getPool()
    const current=await pool.query(
      `SELECT p.* FROM admin_video_ad_projects p
       JOIN video_ad_studio_orders o ON o.id=p.order_id AND o.user_id=$2::uuid AND o.project_id=p.id
       WHERE p.id=$1::uuid AND p.created_by=$2::uuid AND o.price_flame_coin>=0`,[id,user.id])
    const row=current.rows[0]
    if(!row)return NextResponse.json({success:false,error:'Paid production not found'},{status:404})
    if(row.status==='rendering')return NextResponse.json({success:false,error:'Editing is locked while rendering'},{status:409})

    const existing=(Array.isArray(row.storyboard)?row.storyboard:[]) as VideoAdScene[]
    const incoming=body?.storyboard
    if(!Array.isArray(incoming)||!existing.length||incoming.length!==existing.length)
      return NextResponse.json({success:false,error:'Scene count cannot change for this paid production'},{status:400})

    const storyboard:VideoAdScene[]=existing.map((original,index)=>{
      const edit=incoming[index]||{}
      if(String(edit.id)!==original.id||Number(edit.order)!==original.order)throw new Error('Scene sequence must remain unchanged')
      const assetUrl=edit.assetUrl?String(edit.assetUrl):null
      const assetType=edit.assetType==='video'?'video':edit.assetType==='image'?'image':null
      if(assetUrl && !ownedMedia(assetUrl,user.id,'visual') && assetUrl!==original.assetUrl)
        throw new Error('Scene media must belong to this WEAVE producer')
      if(Boolean(assetUrl)!==Boolean(assetType))throw new Error('Each scene media URL requires a valid type')
      const durationSeconds=Math.round(Number(edit.durationSeconds))
      if(!Number.isFinite(durationSeconds)||durationSeconds<1||durationSeconds>90)throw new Error('Scene duration must be 1–90 seconds')
      return {
        id: original.id,order:original.order,durationSeconds,
        beat:String(original.beat||'').slice(0,64),
        text:String(edit.text||'').slice(0,160),
        visualDirection:String(edit.visualDirection||'').slice(0,700),
        voiceover:String(edit.voiceover||'').slice(0,700),
        assetUrl,assetType,
      }
    })
    if(storyboard.reduce((sum,scene)=>sum+scene.durationSeconds,0)!==Number(row.duration_seconds))
      return NextResponse.json({success:false,error:`Scene timings must total ${row.duration_seconds} seconds`},{status:400})
    const soundtrackUrl=body.soundtrackUrl===undefined?row.soundtrack_url:String(body.soundtrackUrl||'')||null
    const narrationUrl=body.narrationUrl===undefined?row.narration_url:String(body.narrationUrl||'')||null
    if(soundtrackUrl&&!ownedMedia(soundtrackUrl,user.id,'audio')&&soundtrackUrl!==row.soundtrack_url)
      return NextResponse.json({success:false,error:'Upload your own licensed soundtrack'},{status:400})
    if(narrationUrl&&!ownedMedia(narrationUrl,user.id,'audio')&&narrationUrl!==row.narration_url)
      return NextResponse.json({success:false,error:'Upload your own narration'},{status:400})

    const result=await pool.query(
      `UPDATE admin_video_ad_projects SET storyboard=$3::jsonb,soundtrack_url=$4,narration_url=$5,status='planned',output_url=NULL,error_message=NULL,updated_at=NOW()
       WHERE id=$1::uuid AND created_by=$2::uuid AND status<>'rendering' RETURNING *`,
      [id,user.id,JSON.stringify(storyboard),soundtrackUrl,narrationUrl])
    if(!result.rows[0])return NextResponse.json({success:false,error:'Production changed; refresh and try again'},{status:409})
    await pool.query("UPDATE video_ad_studio_orders SET status='in_production',output_url=NULL,updated_at=NOW() WHERE project_id=$1::uuid AND user_id=$2::uuid",[id,user.id])
    await pool.query("UPDATE video_ad_service_orders SET status='in_production',output_url=NULL,updated_at=NOW() WHERE project_id=$1::uuid AND provider_user_id=$2::uuid AND status<>'delivered'",[id,user.id])
    return NextResponse.json({success:true,project:mapVideoAdProject(result.rows[0])})
  }catch(error:any){
    console.error('[Video Studio editor] save failed',error)
    return NextResponse.json({success:false,error:error.message||'Unable to save video production'},{status:400})
  }
}
