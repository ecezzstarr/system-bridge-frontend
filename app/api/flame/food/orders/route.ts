import { NextRequest,NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { requireFoodBridgePosition,foodBridgeError } from '@/lib/food-bridge-access'
import { ensureFoodBridgeSchema,expireFoodRequests,safeText,uuidPattern,validPhone,validQuantity } from '@/lib/food-bridge'
import { validFoodState } from '@/lib/food-bridge-states'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  try {
    const user=await requireFoodBridgePosition(request)
    await expireFoodRequests()
    const {rows}=await getPool().query(`
      SELECT o.id,o.status,o.quantity,o.unit_price_ngn,o.food_subtotal_ngn,
        o.delivery_quote_ngn,o.quote_note,o.destination_state,o.destination_area,
        o.delivery_mode,o.created_at,l.produce,l.unit,f.farm_name,f.state AS origin_state,f.community,
        CASE WHEN f.consent_contact_sharing AND o.status IN ('farmer_confirmed','quoted','accepted','dispatched','delivered')
          THEN f.contact_private ELSE NULL END AS farmer_contact
      FROM weave_food_direct_orders o
      JOIN weave_food_surplus l ON l.id=o.listing_id
      JOIN weave_food_farmers f ON f.id=o.farmer_id
      WHERE o.buyer_user_id=$1::uuid ORDER BY o.created_at DESC LIMIT 70
    `,[user.id])
    return NextResponse.json({success:true,orders:rows},{headers:{'Cache-Control':'no-store'}})
  }catch(error){
    console.error('[lifestyle food orders] GET',error)
    return NextResponse.json({error:foodBridgeError(error)===500?'Unable to load your food orders':(error as Error).message},{status:foodBridgeError(error)})
  }
}

export async function POST(request:NextRequest){
  let client
  try{
    const user=await requireFoodBridgePosition(request)
    const body=await request.json().catch(()=>({}))
    const id=typeof body.offerId==='string'?body.offerId:''
    const phone=safeText(body.buyerPhone,60)
    const area=safeText(body.destinationArea,160)
    const qty=Number(body.quantity)
    const mode=body.deliveryMode==='pickup'?'pickup':'delivery'
    if(!uuidPattern.test(id)||!validPhone(phone)||area.length<3||!validFoodState(body.destinationState)||!validQuantity(qty)){
      return NextResponse.json({error:'Choose available produce, quantity, your contact and destination'},{status:400})
    }
    await expireFoodRequests()
    client=await getPool().connect()
    await client.query('BEGIN')
    const {rows:counts}=await client.query(`
      SELECT COUNT(*)::int AS total FROM weave_food_direct_orders
      WHERE buyer_user_id=$1::uuid AND created_at > NOW()-INTERVAL '1 hour'
    `,[user.id])
    if(Number(counts[0]?.total||0)>=5){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Hourly order limit reached'},{status:429})
    }
    const {rows:listings}=await client.query(`
      UPDATE weave_food_surplus l
      SET available_quantity=l.available_quantity-$1::numeric,updated_at=NOW()
      FROM weave_food_farmers f
      WHERE l.id=$2::uuid AND f.id=l.farmer_id
        AND f.agent_id<>$3::uuid
        AND f.status='approved' AND l.status='active'
        AND l.available_quantity >= $1::numeric AND l.minimum_quantity <= $1::numeric
      RETURNING l.id,l.farmer_id,l.unit_price_ngn,
        ROUND(l.unit_price_ngn*$1::numeric,2) AS subtotal
    `,[qty,id,user.id])
    if(!listings.length){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Requested stock is unavailable or cannot be bought from your own farm'},{status:409})
    }
    const listing=listings[0]
    const {rows:orders}=await client.query(`
      INSERT INTO weave_food_direct_orders
        (buyer_user_id,listing_id,farmer_id,buyer_name,buyer_phone_private,share_buyer_contact,
        destination_state,destination_area,delivery_mode,quantity,unit_price_ngn,food_subtotal_ngn)
      VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id,status,quantity,food_subtotal_ngn,created_at
    `,[user.id,listing.id,listing.farmer_id,safeText(user.name,120)||'WEAVE Buyer',phone,
      body.shareBuyerContact===true,body.destinationState,area,mode,qty,listing.unit_price_ngn,listing.subtotal])
    await client.query('COMMIT')
    return NextResponse.json({
      success:true,order:orders[0],
      message:'Stock reserved. Farmer confirmation and a real delivery quote must arrive before you accept the price. No payment has been taken.',
    },{status:201})
  }catch(error){
    if(client)await client.query('ROLLBACK').catch(()=>{})
    console.error('[lifestyle food orders] POST',error)
    return NextResponse.json({error:foodBridgeError(error)===500?'Unable to request this produce':(error as Error).message},{status:foodBridgeError(error)})
  }finally{client?.release()}
}

export async function PATCH(request:NextRequest){
  let client
  try{
    const user=await requireFoodBridgePosition(request)
    const body=await request.json().catch(()=>({}))
    const id=typeof body.orderId==='string'?body.orderId:''
    const action=body.action
    if(!uuidPattern.test(id)||!['accept_quote','cancel','confirm_delivery'].includes(action))
      return NextResponse.json({error:'Valid order and action required'},{status:400})
    await expireFoodRequests()
    if(action!=='cancel') {
      const expected=action==='accept_quote'?'quoted':'dispatched'
      const next=action==='accept_quote'?'accepted':'delivered'
      const {rows}=await getPool().query(`
        UPDATE weave_food_direct_orders SET status=$1,updated_at=NOW()
        WHERE id=$2::uuid AND buyer_user_id=$3::uuid AND status=$4
        AND ($1<>'accepted' OR delivery_quote_ngn IS NOT NULL)
        RETURNING id,status,food_subtotal_ngn,delivery_quote_ngn
      `,[next,id,user.id,expected])
      return rows.length?NextResponse.json({success:true,order:rows[0]})
        :NextResponse.json({error:'Order is not ready for that step'},{status:409})
    }
    client=await getPool().connect()
    await client.query('BEGIN')
    const {rows}=await client.query(`
      UPDATE weave_food_direct_orders SET status='cancelled',updated_at=NOW()
      WHERE id=$1::uuid AND buyer_user_id=$2::uuid
        AND status IN ('requested','farmer_confirmed','quoted')
      RETURNING id,listing_id,quantity
    `,[id,user.id])
    if(!rows.length){
      await client.query('ROLLBACK')
      return NextResponse.json({error:'Order can no longer be cancelled at this stage'},{status:409})
    }
    await client.query(`
      UPDATE weave_food_surplus SET available_quantity=LEAST(original_quantity,available_quantity+$1::numeric),updated_at=NOW()
      WHERE id=$2::uuid
    `,[rows[0].quantity,rows[0].listing_id])
    await client.query('COMMIT')
    return NextResponse.json({success:true,order:{id:rows[0].id,status:'cancelled'}})
  }catch(error){
    if(client)await client.query('ROLLBACK').catch(()=>{})
    console.error('[lifestyle food orders] PATCH',error)
    return NextResponse.json({error:foodBridgeError(error)===500?'Unable to update your food order':(error as Error).message},{status:foodBridgeError(error)})
  }finally{client?.release()}
}
