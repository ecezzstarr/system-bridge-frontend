import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { ensureVideoCallSchema, hashVideoSecret, isVideoRoomId, newVideoSecret, videoCallSummary } from '@/lib/weave-video-call'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params
  const invite = request.headers.get('x-weave-video-invite') || ''
  if(!isVideoRoomId(id)||invite.length<32||invite.length>160)
    return NextResponse.json({error:'Invalid invitation'},{status:404})
  const body = await request.json().catch(()=>({}))
  const name = String(body.name||'').trim().slice(0,100)
  if(name.length<2)return NextResponse.json({error:'Enter your name to join the call'},{status:400})
  try {
    await ensureVideoCallSchema()
    const db = getPool()
    const guestSecret = newVideoSecret()
    const joined = await db.query(
      `UPDATE weave_hope_video_calls SET guest_hash=$1,guest_name=$2,status='joined',joined_at=now()
       WHERE id=$3::uuid AND invite_hash=$4 AND guest_hash IS NULL
         AND status='inviting' AND expires_at>now()
       RETURNING *`,
      [hashVideoSecret(guestSecret),name,id,hashVideoSecret(invite)],
    )
    if(!joined.rows[0])return NextResponse.json({error:'This invitation is unavailable, already accepted or expired. Ask the Bridger for a new one.'},{status:409})
    return NextResponse.json({success:true,call:videoCallSummary(joined.rows[0]),guestAccess:guestSecret},
      {headers:{'Cache-Control':'private, no-store'}})
  } catch(e) {
    console.error('[hope video] guest join failed',e)
    return NextResponse.json({error:'Unable to join this call'},{status:503})
  }
}
