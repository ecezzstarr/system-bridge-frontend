import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { ensureVideoCallSchema, expireVideoRoom, isVideoRoomId, videoCallAccess, videoCallSummary, videoIceServers } from '@/lib/weave-video-call'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context={params:Promise<{id:string}>}
const noStore={ 'Cache-Control':'private, no-store' }

async function access(request:NextRequest,id:string) {
  if(!isVideoRoomId(id))return null
  await ensureVideoCallSchema()
  await expireVideoRoom(id)
  return videoCallAccess(request,id)
}

export async function GET(request:NextRequest,{params}:Context) {
  const {id}=await params
  try {
    const caller=await access(request,id)
    if(!caller)return NextResponse.json({error:'Call access denied'},{status:403})
    const afterRaw=Number(request.nextUrl.searchParams.get('after')||0)
    const after=Number.isSafeInteger(afterRaw)&&afterRaw>=0?afterRaw:0
    const db=getPool()
    const signals=caller.room.status==='joined'
      ? await db.query(
        `SELECT id,kind,payload FROM weave_hope_video_signals
         WHERE call_id=$1::uuid AND from_role<>$2 AND id>$3
         ORDER BY id ASC LIMIT 100`,[id,caller.role,after])
      : {rows:[]}
    return NextResponse.json({
      success:true,call:videoCallSummary(caller.room),role:caller.role,
      iceServers:videoIceServers(id,caller.role),
      relayConfigured:Boolean(process.env.WEAVE_VIDEO_TURN_URLS && process.env.WEAVE_VIDEO_TURN_SHARED_SECRET),
      signals:signals.rows,
    },{headers:noStore})
  }catch(e){
    console.error('[hope video] read failed',e)
    return NextResponse.json({error:'Unable to retrieve call status'},{status:503})
  }
}

export async function POST(request:NextRequest,{params}:Context) {
  const {id}=await params
  try {
    const caller=await access(request,id)
    if(!caller)return NextResponse.json({error:'Call access denied'},{status:403})
    if(caller.room.status!=='joined')return NextResponse.json({error:'Call is not connected to a guest'},{status:409})
    const body=await request.json().catch(()=>({}))
    const kind=String(body.kind||'')
    const payload=body.payload
    if(!['offer','answer','ice'].includes(kind) || !payload || typeof payload!=='object' || Array.isArray(payload))
      return NextResponse.json({error:'Invalid video signaling payload'},{status:400})
    if((kind==='offer' && caller.role!=='bridger') || (kind==='answer' && caller.role!=='guest'))
      return NextResponse.json({error:'Invalid call signaling role'},{status:403})
    if(kind==='offer'||kind==='answer') {
      if(payload.type!==kind || typeof payload.sdp!=='string' || payload.sdp.length<10 || payload.sdp.length>32_000)
        return NextResponse.json({error:'Invalid media description'},{status:400})
    } else if(typeof payload.candidate!=='string' || payload.candidate.length>4096 ||
      (payload.sdpMid!==null && payload.sdpMid!==undefined && typeof payload.sdpMid!=='string') ||
      (payload.sdpMLineIndex!==null && payload.sdpMLineIndex!==undefined && !Number.isInteger(payload.sdpMLineIndex)))
      return NextResponse.json({error:'Invalid ICE candidate'},{status:400})
    const db=getPool()
    // Bound signaling traffic; rooms are two-person and expire after two hours.
    const record=await db.query(
      `INSERT INTO weave_hope_video_signals(call_id,from_role,kind,payload)
       SELECT $1::uuid,$2,$3,$4::jsonb
       WHERE (SELECT COUNT(*) FROM weave_hope_video_signals WHERE call_id=$1::uuid)<1200
         AND EXISTS(SELECT 1 FROM weave_hope_video_calls
           WHERE id=$1::uuid AND status='joined' AND expires_at>now())
       RETURNING id`,
      [id,caller.role,kind,JSON.stringify(payload)],
    )
    if(!record.rows[0])return NextResponse.json({error:'Call ended or signaling limit reached'},{status:409})
    return NextResponse.json({success:true,id:String(record.rows[0].id)},{headers:noStore})
  }catch(e){
    console.error('[hope video] signal failed',e)
    return NextResponse.json({error:'Unable to signal the call'},{status:503})
  }
}

export async function DELETE(request:NextRequest,{params}:Context) {
  const {id}=await params
  try {
    const caller=await access(request,id)
    if(!caller)return NextResponse.json({error:'Call access denied'},{status:403})
    const db=getPool()
    await db.query(
      "UPDATE weave_hope_video_calls SET status='ended',ended_at=coalesce(ended_at,now()) WHERE id=$1::uuid AND status IN ('inviting','joined')",
      [id],
    )
    await db.query('DELETE FROM weave_hope_video_signals WHERE call_id=$1::uuid',[id])
    return NextResponse.json({success:true},{headers:noStore})
  }catch(e){
    console.error('[hope video] hangup failed',e)
    return NextResponse.json({error:'Could not end call'},{status:503})
  }
}
