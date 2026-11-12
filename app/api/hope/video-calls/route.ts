import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { getWeavePublicOrigin } from '@/lib/weave-origin'
import { ensureVideoCallSchema, hashVideoSecret, newVideoSecret, videoCallSummary } from '@/lib/weave-video-call'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const noStore = { 'Cache-Control':'private, no-store' }

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'bridger') return NextResponse.json({error:'Hope Bridger access required'},{status:403})
  try {
    await ensureVideoCallSchema()
    const db = getPool()
    const rows = await db.query(
      'SELECT id,status,guest_name,created_at,joined_at,ended_at,expires_at FROM weave_hope_video_calls WHERE bridger_id=$1::uuid ORDER BY created_at DESC LIMIT 20',
      [auth.id],
    )
    return NextResponse.json({success:true,calls:rows.rows.map(videoCallSummary)}, {headers:noStore})
  } catch (e) {
    console.error('[hope video] list failed',e)
    return NextResponse.json({error:'Video call records unavailable'},{status:503})
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth || auth.role !== 'bridger') return NextResponse.json({error:'Hope Bridger access required'},{status:403})
  try {
    await ensureVideoCallSchema()
    const db = getPool()
    const client = await db.connect()
    const invite = newVideoSecret()
    let room: any
    try {
      await client.query('BEGIN')
      // One active invitation per Bridger; serialize simultaneous mobile requests.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['hope-video:' + auth.id])
      const rate = await client.query(
        "SELECT COUNT(*)::int AS total FROM weave_hope_video_calls WHERE bridger_id=$1::uuid AND created_at>now()-interval '10 minutes'",
        [auth.id],
      )
      if (Number(rate.rows[0].total)>=10) {
        await client.query('ROLLBACK')
        return NextResponse.json({error:'Call creation limit reached. Try again later.'},{status:429})
      }
      await client.query(
        "UPDATE weave_hope_video_calls SET status='ended',ended_at=now() WHERE bridger_id=$1::uuid AND status IN ('inviting','joined')",
        [auth.id],
      )
      const result = await client.query(
        "INSERT INTO weave_hope_video_calls (bridger_id,invite_hash) VALUES ($1::uuid,$2) RETURNING *",
        [auth.id,hashVideoSecret(invite)],
      )
      room = result.rows[0]
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK').catch(()=>{})
      throw e
    } finally {client.release()}
    const url = getWeavePublicOrigin()+'/video-call/'+room.id+'#invite='+encodeURIComponent(invite)
    return NextResponse.json({success:true,call:videoCallSummary(room),inviteLink:url},{status:201,headers:noStore})
  } catch (e) {
    console.error('[hope video] create failed',e)
    return NextResponse.json({error:'Could not create a private video invitation'},{status:503})
  }
}
