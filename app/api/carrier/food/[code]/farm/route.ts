import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAgentByCarrierFoodCode } from '@/lib/carrier-food'
import { getCarrierAccess } from '@/lib/carrier-access'
import {
  ensureFoodBridgeSchema, expireFoodRequests, guestOrderKey, digestGuestOrderKey,
  safeText, uuidPattern, validPhone, validQuantity,
} from '@/lib/food-bridge'
import { validFoodState } from '@/lib/food-bridge-states'

export const dynamic = 'force-dynamic'

async function carrierAgent(code:string) {
  const agent=await getAgentByCarrierFoodCode(code)
  if(!agent)return null
  const access=await getCarrierAccess({
    id:String(agent.id), role:'agent', name:agent.name, username:agent.username,
  })
  return access.active ? agent : null
}

/** The exact same public /carrier/food/[code] link exposes the Agent's
 * approved farm inventory to guests without a second account or website. */
export async function GET(_request:NextRequest,{params}:{params:Promise<{code:string}>}) {
  try {
    const {code}=await params
    const agent=await carrierAgent(code)
    if(!agent)return NextResponse.json({error:'This Agent Carrier Door is not active'}, {status:404})
    await expireFoodRequests()
    const {rows}=await getPool().query(`
      SELECT l.id,l.produce,l.unit,l.unit_price_ngn,l.available_quantity,l.minimum_quantity,
        l.details,f.farm_name,f.state,f.community,
        b.components AS basket_components,b.separate_listed_ngn AS basket_individual_total_ngn,
        b.listing_saving_ngn AS basket_listed_saving_ngn
      FROM weave_food_surplus l
      JOIN weave_food_farmers f ON f.id=l.farmer_id
      LEFT JOIN weave_food_household_bundles b ON b.listing_id=l.id
      WHERE f.agent_id=$1::uuid AND f.status='approved'
        AND l.status='active' AND l.available_quantity>=l.minimum_quantity
      ORDER BY l.created_at DESC LIMIT 50
    `,[agent.id])
    return NextResponse.json({success:true,agentName:agent.name||agent.username,offers:rows},
      {headers:{'Cache-Control':'no-store'}})
  }catch(error){
    console.error('[carrier farm offers] GET',error)
    return NextResponse.json({error:'Farm products could not load'}, {status:500})
  }
}

export async function POST(request:NextRequest,{params}:{params:Promise<{code:string}>}) {
  let client
  try {
    const {code}=await params
    const agent=await carrierAgent(code)
    if(!agent)return NextResponse.json({error:'This Carrier Door is not active'}, {status:404})
    const body=await request.json().catch(()=>({}))
    const offerId=typeof body.offerId==='string'?body.offerId:''
    const buyerName=safeText(body.buyerName,120)
    const buyerPhone=safeText(body.buyerPhone,60)
    const destinationState=body.destinationState
    const destinationArea=safeText(body.destinationArea,160)
    const deliveryMode=body.deliveryMode==='pickup'?'pickup':'delivery'
    const quantity=Number(body.quantity)
    if(!uuidPattern.test(offerId)||buyerName.length<2||!validPhone(buyerPhone)||
        !validFoodState(destinationState)||destinationArea.length<3||!validQuantity(quantity)){
      return NextResponse.json({error:'Select available produce, quantity, buyer contact and destination'}, {status:400})
    }
    await expireFoodRequests()
    client=await getPool().connect()
    await client.query('BEGIN')
    // Bound per contact and Agent to limit abuse of the publicly shared Carrier link.
    const {rows:recent}=await client.query(`
      SELECT COUNT(*)::int AS total FROM weave_food_direct_orders
      WHERE buyer_phone_private=$1 AND carrier_referral_code=$2
        AND created_at > NOW()-INTERVAL '1 hour'
    `,[buyerPhone,String(agent.referral_code)])
    if(Number(recent[0]?.total||0)>=3){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'This contact has reached the hourly request limit'}, {status:429})
    }

    // Enforce this Agent's farm ownership on the server, and reserve quantity
    // atomically. Another Carrier Door cannot route an order to this stock.
    const {rows:listings}=await client.query(`
      UPDATE weave_food_surplus l
      SET available_quantity=l.available_quantity-$1::numeric,updated_at=NOW()
      FROM weave_food_farmers f
      WHERE l.id=$2::uuid AND f.id=l.farmer_id
        AND f.agent_id=$3::uuid AND f.status='approved'
        AND l.status='active' AND l.available_quantity>=$1::numeric
        AND l.minimum_quantity<=$1::numeric
        AND (l.unit<>'pack' OR $1::numeric=TRUNC($1::numeric))
      RETURNING l.id,l.farmer_id,l.unit_price_ngn,ROUND(l.unit_price_ngn*$1::numeric,2) AS subtotal
    `,[quantity,offerId,agent.id])
    if(!listings.length){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'This produce or quantity is no longer available'}, {status:409})
    }
    const offer=listings[0]
    const orderKey=guestOrderKey()
    const {rows:orders}=await client.query(`
      INSERT INTO weave_food_direct_orders (
        guest_order_digest,carrier_referral_code,listing_id,farmer_id,
        buyer_name,buyer_phone_private,share_buyer_contact,destination_state,destination_area,
        delivery_mode,quantity,unit_price_ngn,food_subtotal_ngn
      ) VALUES ($1,$2,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id,status,quantity,food_subtotal_ngn,created_at
    `,[
      digestGuestOrderKey(orderKey),String(agent.referral_code).toUpperCase(),
      offer.id,offer.farmer_id,buyerName,buyerPhone,body.shareBuyerContact===true,
      destinationState,destinationArea,deliveryMode,quantity,offer.unit_price_ngn,offer.subtotal,
    ])
    await client.query('COMMIT')
    return NextResponse.json({
      success:true,order:orders[0],orderKey,
      message:'Your food is reserved pending this farmer’s confirmation and transport quote. No payment has been taken. Keep your private tracking key.',
    },{status:201})
  }catch(error){
    if(client)await client.query('ROLLBACK').catch(()=>{})
    console.error('[carrier farm offers] POST',error)
    return NextResponse.json({error:'The farm order could not be submitted'}, {status:500})
  }finally{client?.release()}
}
