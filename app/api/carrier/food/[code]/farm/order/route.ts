import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAgentByCarrierFoodCode } from '@/lib/carrier-food'
import { getCarrierAccess } from '@/lib/carrier-access'
import {
  ensureFoodBridgeSchema,expireFoodRequests,digestGuestOrderKey,isGuestOrderKey,
} from '@/lib/food-bridge'
export const dynamic='force-dynamic'

async function carrierFarmer(code:string) {
  const agent=await getAgentByCarrierFoodCode(code)
  if(!agent)return null
  const access=await getCarrierAccess({
    id:String(agent.id),role:'agent',name:agent.name,username:agent.username,
  })
  return access.active ? agent : null
}

export async function GET(request:NextRequest,{params}:{params:Promise<{code:string}>}) {
  try {
    const {code}=await params
    const agent=await carrierFarmer(code)
    if(!agent)return NextResponse.json({error:'Carrier Door unavailable'},{status:404})
    const key=request.headers.get('x-farm-order-key')
    if(!isGuestOrderKey(key))return NextResponse.json({error:'Private tracking key required'},{status:401})
    await expireFoodRequests()
    const {rows}=await getPool().query(`
      SELECT o.id,o.status,o.quantity,o.unit_price_ngn,o.food_subtotal_ngn,
        o.delivery_quote_ngn,o.quote_note,o.delivery_mode,
        o.destination_state,o.destination_area,o.created_at,
        l.produce,l.unit,f.farm_name,f.state AS origin_state,f.community,
        CASE WHEN f.consent_contact_sharing AND o.status IN ('farmer_confirmed','quoted','accepted','dispatched','delivered')
        THEN f.contact_private ELSE NULL END AS farmer_contact
      FROM weave_food_direct_orders o
      JOIN weave_food_surplus l ON l.id=o.listing_id
      JOIN weave_food_farmers f ON f.id=o.farmer_id
      WHERE o.guest_order_digest=$1 AND f.agent_id=$2::uuid
        AND o.carrier_referral_code=$3
      LIMIT 1
    `,[digestGuestOrderKey(key),agent.id,String(agent.referral_code).toUpperCase()])
    return rows.length?NextResponse.json({success:true,order:rows[0]},{headers:{'Cache-Control':'no-store'}})
      :NextResponse.json({error:'Tracking key not found for this Agent'},{status:404})
  }catch(error){
    console.error('[carrier farm tracking] GET',error)
    return NextResponse.json({error:'Order tracking unavailable'},{status:500})
  }
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{code:string}>}) {
  let client
  try {
    const {code}=await params
    const agent=await carrierFarmer(code)
    if(!agent)return NextResponse.json({error:'Carrier Door unavailable'},{status:404})
    const key=request.headers.get('x-farm-order-key')
    if(!isGuestOrderKey(key))return NextResponse.json({error:'Private tracking key required'},{status:401})
    const body=await request.json().catch(()=>({}))
    const action=body.action
    if(!['accept_quote','cancel','confirm_delivery'].includes(action))
      return NextResponse.json({error:'Unsupported order movement'},{status:400})
    await expireFoodRequests()
    const digest=digestGuestOrderKey(key)
    if(action!=='cancel'){
      const expected=action==='accept_quote'?'quoted':'dispatched'
      const next=action==='accept_quote'?'accepted':'delivered'
      const {rows}=await getPool().query(`
        UPDATE weave_food_direct_orders o SET status=$1,updated_at=NOW()
        FROM weave_food_farmers f
        WHERE o.farmer_id=f.id AND f.agent_id=$2::uuid
          AND o.carrier_referral_code=$3 AND o.guest_order_digest=$4
          AND o.status=$5 AND ($1<>'accepted' OR o.delivery_quote_ngn IS NOT NULL)
        RETURNING o.id,o.status,o.food_subtotal_ngn,o.delivery_quote_ngn
      `,[next,agent.id,String(agent.referral_code).toUpperCase(),digest,expected])
      return rows.length?NextResponse.json({success:true,order:rows[0]})
        :NextResponse.json({error:'The order is not ready for this action'},{status:409})
    }
    client=await getPool().connect()
    await client.query('BEGIN')
    const {rows}=await client.query(`
      UPDATE weave_food_direct_orders o SET status='cancelled',updated_at=NOW()
      FROM weave_food_farmers f
      WHERE o.farmer_id=f.id AND f.agent_id=$1::uuid
        AND o.carrier_referral_code=$2 AND o.guest_order_digest=$3
        AND o.status IN ('requested','farmer_confirmed','quoted')
      RETURNING o.id,o.listing_id,o.quantity
    `,[agent.id,String(agent.referral_code).toUpperCase(),digest])
    if(!rows.length){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'This order cannot be cancelled now'},{status:409})
    }
    await client.query(`
      UPDATE weave_food_surplus
      SET available_quantity=LEAST(original_quantity,available_quantity+$1::numeric),updated_at=NOW()
      WHERE id=$2::uuid
    `,[rows[0].quantity,rows[0].listing_id])
    await client.query('COMMIT')
    return NextResponse.json({success:true,order:{id:rows[0].id,status:'cancelled'}})
  }catch(error){
    if(client)await client.query('ROLLBACK').catch(()=>{})
    console.error('[carrier farm tracking] PATCH',error)
    return NextResponse.json({error:'Order update unavailable'},{status:500})
  }finally{client?.release()}
}
