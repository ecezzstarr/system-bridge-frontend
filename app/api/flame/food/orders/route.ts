import { NextRequest,NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { requireFoodBridgePosition,foodBridgeError } from '@/lib/food-bridge-access'
import { ensureFoodBridgeSchema,expireFoodRequests,safeText,uuidPattern,validPhone,validQuantity } from '@/lib/food-bridge'
import { validFoodState } from '@/lib/food-bridge-states'
import { initializeFarmEscrow,submitFarmEscrowProof,FARM_ESCROW_ACCOUNT_NUMBER } from '@/lib/food-escrow'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  try {
    const user=await requireFoodBridgePosition(request)
    await expireFoodRequests()
    const {rows}=await getPool().query(`
      SELECT o.id,o.status,o.quantity,o.unit_price_ngn,o.food_subtotal_ngn,
        o.delivery_quote_ngn,o.quote_note,o.destination_state,o.destination_area,
        e.status AS escrow_status,e.reference AS escrow_reference,e.buyer_total_ngn,e.seller_payout_ngn,
        e.verified_at,e.payout_recorded_at,
        o.delivery_mode,o.created_at,l.produce,l.unit,f.farm_name,f.state AS origin_state,f.community,
        CASE WHEN f.consent_contact_sharing AND o.status IN ('farmer_confirmed','quoted','accepted','dispatched','delivered')
          THEN f.contact_private ELSE NULL END AS farmer_contact
      FROM weave_food_direct_orders o
      JOIN weave_food_surplus l ON l.id=o.listing_id
      JOIN weave_food_farmers f ON f.id=o.farmer_id
      LEFT JOIN weave_food_escrow e ON e.order_id=o.id
      WHERE o.buyer_user_id=$1::uuid ORDER BY o.created_at DESC LIMIT 70
    `,[user.id])
    return NextResponse.json({success:true,orders:rows.map(row=>({...row,
      paymentAccountNumber:row.escrow_status==='awaiting_payment'?FARM_ESCROW_ACCOUNT_NUMBER:null,
      weaveCommissionNgn:0})),feePolicy:'WEAVE charges farmers zero commission.'},{headers:{'Cache-Control':'no-store'}})
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
    if(!uuidPattern.test(id)||!['accept_quote','submit_payment_proof','cancel','confirm_delivery','dispute'].includes(action))
      return NextResponse.json({error:'Valid order and action required'},{status:400})
    await expireFoodRequests()
    client=await getPool().connect()
    await client.query('BEGIN')
    // Lock the named buyer's order. The same order lock serializes every
    // transition and the independent escrow record.
    const {rows:orders}=await client.query(`
      SELECT id,status,listing_id,quantity,food_subtotal_ngn,delivery_quote_ngn
      FROM weave_food_direct_orders WHERE id=$1::uuid AND buyer_user_id=$2::uuid FOR UPDATE
    `,[id,user.id])
    const order=orders[0]
    if(!order){await client.query('ROLLBACK');return NextResponse.json({error:'Order not found'},{status:404})}
    if(action==='accept_quote'){
      if(order.status!=='quoted'||order.delivery_quote_ngn===null){
        await client.query('ROLLBACK');return NextResponse.json({error:'Farmer quotation must be complete'},{status:409})
      }
      await client.query(`UPDATE weave_food_direct_orders SET status='accepted',updated_at=NOW() WHERE id=$1::uuid`,[id])
      const escrow=await initializeFarmEscrow(client,id)
      await client.query('COMMIT')
      return NextResponse.json({success:true,order:{id,status:'accepted'},escrow,
        paymentAccountNumber:FARM_ESCROW_ACCOUNT_NUMBER,
        message:'Pay the exact quoted total to WEAVE using the unique FARM reference; submit actual payment proof for Administration verification. Do not send money to the farmer.'})
    }
    if(action==='submit_payment_proof'){
      if(order.status!=='accepted'){
        await client.query('ROLLBACK');return NextResponse.json({error:'Accept the quote first'},{status:409})
      }
      const proof=await submitFarmEscrowProof(client,id,String(body.transactionReference||''))
      await client.query('COMMIT')
      return NextResponse.json({success:true,payment:proof,
        message:'Payment reference submitted. WEAVE must independently reconcile actual funds before notifying the farmer to dispatch.'})
    }
    if(action==='confirm_delivery'||action==='dispute'){
      const {rows:escrows}=await client.query(`
        SELECT status FROM weave_food_escrow WHERE order_id=$1::uuid FOR UPDATE
      `,[id])
      const escrow=escrows[0]
      if(!escrow||!['held','release_due'].includes(escrow.status)){
        await client.query('ROLLBACK');return NextResponse.json({error:'No verified held funds are available for settlement.'},{status:409})
      }
      if(action==='confirm_delivery'&&order.status==='dispatched'&&escrow.status==='held'){
        await client.query(`UPDATE weave_food_direct_orders SET status='delivered',updated_at=NOW() WHERE id=$1::uuid`,[id])
        await client.query(`UPDATE weave_food_escrow SET status='release_due',updated_at=NOW() WHERE order_id=$1::uuid`,[id])
        await client.query(`
          INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
          SELECT id,'farm_escrow_release_due','Buyer confirmed farm food received',$1,
            'WEAVE Farm-to-Family','/admin/food-escrow'
          FROM users WHERE role='admin' AND is_active=true
        `,['Farm order '+id+' buyer confirmed receipt. Review and send the full seller payout; WEAVE commission is ₦0.'])
        await client.query('COMMIT')
        return NextResponse.json({success:true,order:{id,status:'delivered'},escrowStatus:'release_due',
          message:'Delivery acknowledged. WEAVE Administration must pay the farmer and record the bank payout reference.'})
      }
      if(action==='dispute'&&order.status==='dispatched'&&escrow.status==='held'){
        const note=safeText(body.disputeNote,500)
        if(note.length<15){await client.query('ROLLBACK');return NextResponse.json({error:'Explain the missing or incorrect delivery (15+ characters)'},{status:400})}
        await client.query(`UPDATE weave_food_direct_orders SET status='disputed',updated_at=NOW() WHERE id=$1::uuid`,[id])
        await client.query(`UPDATE weave_food_escrow SET status='disputed',dispute_note=$2,updated_at=NOW() WHERE order_id=$1::uuid`,[id,note])
        await client.query(`
          INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
          SELECT id,'farm_escrow_dispute','Farm delivery disputed',$1,
            'WEAVE Farm-to-Family','/admin/food-escrow'
          FROM users WHERE role='admin' AND is_active=true
        `,['Farm order '+id+' needs dispute review. Do not release seller funds without resolution.'])
        await client.query('COMMIT')
        return NextResponse.json({success:true,order:{id,status:'disputed'},message:'WEAVE is reviewing your delivery dispute; seller payout is on hold.'})
      }
      await client.query('ROLLBACK');return NextResponse.json({error:'Current delivery state does not permit this action.'},{status:409})
    }
    if(!['requested','farmer_confirmed','quoted','accepted'].includes(order.status)){
      await client.query('ROLLBACK');return NextResponse.json({error:'Paid or dispatched orders require a refund/dispute review, not cancellation.'},{status:409})
    }
    // A submitted bank proof may represent actual funds: do not allow instant
    // stock restoration/cancellation until Administration rejects/refunds.
    const {rows:payments}=await client.query(`
      SELECT status FROM weave_food_escrow WHERE order_id=$1::uuid FOR UPDATE
    `,[id])
    if(payments.length && payments[0].status!=='awaiting_payment'){
      await client.query('ROLLBACK');return NextResponse.json({error:'Payment proof is under review. Contact WEAVE Administration before cancelling.'},{status:409})
    }
    await client.query(`UPDATE weave_food_direct_orders SET status='cancelled',updated_at=NOW() WHERE id=$1::uuid`,[id])
    await client.query(`
      UPDATE weave_food_surplus SET available_quantity=LEAST(original_quantity,available_quantity+$1::numeric),updated_at=NOW()
      WHERE id=$2::uuid
    `,[order.quantity,order.listing_id])
    await client.query('COMMIT')
    return NextResponse.json({success:true,order:{id,status:'cancelled'}})
  }catch(error){
    if(client)await client.query('ROLLBACK').catch(()=>{})
    console.error('[lifestyle food orders] PATCH',error)
    return NextResponse.json({error:foodBridgeError(error)===500?'Unable to update this food order':(error as Error).message},{status:foodBridgeError(error)})
  }finally{client?.release()}
}
