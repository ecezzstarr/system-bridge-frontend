import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { getFlameEvent } from '@/lib/weave-event-store'
import { getTrxPaymentNgnRate } from '@/lib/trx-payment'
import { notifyAdminOrder } from '@/lib/admin-order-notifications'
import {
  FLAME_OF_HOPE_ENABLED, FLAME_OF_HOPE_EVENT_KEY, FLAME_OF_HOPE_PRODUCTS,
  FLAME_OF_HOPE_WEEK_SQL, eligibleFood, ensureFlameOfHopeFoodSchema,
  foodThreshold, getWeeklyFoodSpend,
} from '@/lib/flame-of-hope-food'

export const dynamic = 'force-dynamic'
const noStore = {'Cache-Control':'private, no-store'}

async function eventOpen() {
  const event = await getFlameEvent()
  const now = Date.now()
  return event.key === FLAME_OF_HOPE_EVENT_KEY && event.effectiveStatus === 'active' &&
    now >= Date.parse(event.startsAt) && now <= Date.parse(event.endsAt)
}

async function weeklyClaim(db:{query:(sql:string,values?:unknown[])=>Promise<{rows:any[]}>},bridgerId:string) {
  const record=await db.query(
    `SELECT c.id,c.claim_week_start::text AS week_start,c.product_id,c.product_price_ngn,c.required_spend_system_switch,c.actual_spend_system_switch,c.fulfillment_status,c.claimed_at,c.fulfilled_at,c.fulfillment_reference
      FROM weave_flame_of_hope_claims c
      WHERE c.bridger_id=$1::uuid AND c.event_key=$2 AND c.claim_week_start=`+FLAME_OF_HOPE_WEEK_SQL+` LIMIT 1`,
    [bridgerId,FLAME_OF_HOPE_EVENT_KEY],
  )
  return record.rows[0]||null
}

async function activeBridger(bridgerId:string) {
  const result=await getPool().query(
    "SELECT u.id FROM users u JOIN bridger_profiles p ON p.user_id=u.id WHERE u.id=$1::uuid AND u.role='bridger' AND u.is_active=true AND p.status='active' LIMIT 1",
    [bridgerId],
  )
  return !!result.rows[0]
}

export async function GET(request:NextRequest) {
  const user=await getAuthUser(request)
  if (!user || user.role!=='bridger')return NextResponse.json({success:false,error:'Bridger authentication required'},{status:403,headers:noStore})
  try {
    const open=await eventOpen()
    const enabled=FLAME_OF_HOPE_ENABLED()
    await ensureFlameOfHopeFoodSchema()
    const db=getPool()
    const claim=await weeklyClaim(db,user.id)
    if (!open || !enabled) {
      return NextResponse.json({success:true,open,enabled,claim,claimed:!!claim,eligible:false,options:[],spent:0},{headers:noStore})
    }
    if (!await activeBridger(user.id)) return NextResponse.json({success:false,error:'Active Bridger position required'},{status:403,headers:noStore})
    const [spent,rate]=await Promise.all([getWeeklyFoodSpend(db,user.id),getTrxPaymentNgnRate()])
    const options=FLAME_OF_HOPE_PRODUCTS.map(product=>({
      id:product.id,label:product.label,priceNgn:product.priceNgn,
      fiveTimesPriceNgn:product.priceNgn*5,
      requiredSystemSwitch:foodThreshold(product.priceNgn,rate.rateNgnPerTrx),
      unlocked:eligibleFood(spent,rate.rateNgnPerTrx).some(p=>p.id===product.id),
    }))
    return NextResponse.json({
      success:true,open,enabled,claim,claimed:!!claim,spent,options,
      referenceRateNgn:rate.rateNgnPerTrx,rateSource:rate.source,
      eligible:!claim && options.some(p=>p.unlocked),
    },{headers:noStore})
  } catch(error) {
    console.error('[flame-of-hope] status error',error)
    return NextResponse.json({success:false,error:'Unable to load your weekly Flame of Hope'},{status:503,headers:noStore})
  }
}

export async function POST(request:NextRequest) {
  const user=await getAuthUser(request)
  if (!user || user.role!=='bridger')return NextResponse.json({success:false,error:'Bridger authentication required'},{status:403,headers:noStore})
  if (!FLAME_OF_HOPE_ENABLED() || !await eventOpen())return NextResponse.json({success:false,error:'Flame of Hope food claims are not active'},{status:403,headers:noStore})
  // The official current System Switch/NGN quote is evaluated on the server.
  const rate=await getTrxPaymentNgnRate()
  if (!Number.isFinite(rate.rateNgnPerTrx) || rate.rateNgnPerTrx<=0) return NextResponse.json({success:false,error:'Official reference rate unavailable'},{status:503,headers:noStore})
  await ensureFlameOfHopeFoodSchema()
  const db=await getPool().connect()
  let claimed:any=null
  try {
    await db.query('BEGIN')
    // Serialize repeated mobile taps and concurrent requests for this Bridger.
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['flame-of-hope:'+user.id])
    const active=await db.query("SELECT u.id FROM users u JOIN bridger_profiles p ON p.user_id=u.id WHERE u.id=$1::uuid AND u.role='bridger' AND u.is_active=true AND p.status='active' LIMIT 1 FOR UPDATE OF u",[user.id])
    if (!active.rows[0]){
      await db.query('ROLLBACK')
      return NextResponse.json({success:false,error:'Active Bridger position required'},{status:403,headers:noStore})
    }
    const existing=await weeklyClaim(db,user.id)
    if(existing){
      await db.query('COMMIT')
      return NextResponse.json({success:true,alreadyClaimed:true,claim:existing},{headers:noStore})
    }
    const spent=await getWeeklyFoodSpend(db,user.id)
    const choices=eligibleFood(spent,rate.rateNgnPerTrx)
    if (!choices.length){
      await db.query('ROLLBACK')
      return NextResponse.json({success:false,error:'You have not yet spent System Switch equal to five times the eligible food product price this week.'},{status:409,headers:noStore})
    }
    // The surprise contains one of the *unlocked* physical foods, not credits.
    const chosen=choices[randomInt(choices.length)]
    const required=foodThreshold(chosen.priceNgn,rate.rateNgnPerTrx)
    const created=await db.query(
      `INSERT INTO weave_flame_of_hope_claims
        (bridger_id,event_key,claim_week_start,product_id,product_price_ngn,
         required_spend_system_switch,actual_spend_system_switch,reference_rate_ngn,fulfillment_status)
       VALUES($1::uuid,$2,`+FLAME_OF_HOPE_WEEK_SQL+`,$3,$4,$5,$6,$7,'pending_fulfillment')
       ON CONFLICT(bridger_id,event_key,claim_week_start) DO NOTHING
       RETURNING id,claim_week_start::text AS week_start,product_id,product_price_ngn,
         required_spend_system_switch,actual_spend_system_switch,fulfillment_status,claimed_at`,
       [user.id,FLAME_OF_HOPE_EVENT_KEY,chosen.id,chosen.priceNgn,required,spent,rate.rateNgnPerTrx],
    )
    if (!created.rows[0]){
      await db.query('ROLLBACK')
      return NextResponse.json({success:false,error:'This week’s reward has already been claimed. Refresh your box.'},{status:409,headers:noStore})
    }
    claimed=created.rows[0]
    await db.query(
      "INSERT INTO notifications(user_id,type,title,content,from_user_name,link) VALUES($1::uuid,'reward','Flame of Hope · food reward reserved',$2,'WEAVE · Hope','/bridger/flame-of-hope')",
      [user.id,'Your weekly mystery box contains '+chosen.label+'. Administrations will coordinate preparation and fulfilment. No System Switch payout was made.'],
    )
    await db.query('COMMIT')
  } catch(error){
    try{await db.query('ROLLBACK')}catch{}
    console.error('[flame-of-hope] claim error',error)
    return NextResponse.json({success:false,error:'Unable to record the weekly food reward'},{status:503,headers:noStore})
  } finally {db.release()}
  try {
    await notifyAdminOrder({
      orderId:String(claimed.id),event:'placed',department:'bridger',
      subject:'Flame of Hope · food fulfilment',
      detail:'A Bridger unlocked '+claimed.product_id+' through verified weekly System Switch spending. Arrange food preparation and recipient handoff; the box is not an automatic dispatch.',
      adminPath:'/admin/flame-of-hope',actorId:user.id,actorName:user.name||'Bridger',
    })
  } catch(error) {console.error('[flame-of-hope] Administrations notification error',error)}
  return NextResponse.json({success:true,alreadyClaimed:false,claim:claimed},{headers:noStore})
}
