import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { aiConfigured,ensureRiverCallSchema,twilioConfigured,RIVER_CALL_PRICE_FLAME_COIN } from '@/lib/river-voice-outreach'

export const runtime='nodejs'
export async function GET(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user||user.role!=='admin')return NextResponse.json({error:'Administration required'},{status:403})
  await ensureRiverCallSchema()
  const pool=getPool()
  const [row,totals]=await Promise.all([
    pool.query('SELECT price_flame_coin,enabled,updated_at FROM weave_river_call_settings WHERE id=1'),
    pool.query("SELECT COUNT(*)::int AS calls,COUNT(*) FILTER(WHERE whatsapp_consent=true)::int AS handoffs,COUNT(*) FILTER(WHERE refund_at IS NOT NULL)::int AS refunds FROM weave_river_calls")
  ])
  return NextResponse.json({settings:row.rows[0],statistics:totals.rows[0],voiceConfigured:twilioConfigured(),aiConfigured:aiConfigured(),
    whatsappConfigured:Boolean(process.env.WEAVE_RIVER_WA_PHONE_NUMBER_ID && process.env.WEAVE_RIVER_WA_TOKEN && process.env.WEAVE_RIVER_WA_TEMPLATE_NAME)},
    {headers:{'Cache-Control':'private,no-store'}})
}
export async function PATCH(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user||user.role!=='admin')return NextResponse.json({error:'Administration required'},{status:403})
  const body=await request.json().catch(()=>({}))
  if(typeof body.enabled!=='boolean')return NextResponse.json({error:'An enabled setting is required'},{status:400})
  if(body.enabled && (!twilioConfigured()||!aiConfigured()))
    return NextResponse.json({error:'The verified voice provider and River AI must be configured before activation'},{status:409})
  await ensureRiverCallSchema()
  const updated=await getPool().query(
    'UPDATE weave_river_call_settings SET price_flame_coin=$1,enabled=$2,updated_at=NOW() WHERE id=1 RETURNING price_flame_coin,enabled,updated_at',
    [RIVER_CALL_PRICE_FLAME_COIN,body.enabled])
  return NextResponse.json({success:true,settings:updated.rows[0]})
}
