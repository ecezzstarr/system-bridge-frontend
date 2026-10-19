import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAgentByCarrierFoodCode } from '@/lib/carrier-food'
import { getCarrierAccess } from '@/lib/carrier-access'
import {
  ensureFoodBridgeSchema,expireFoodRequests,digestGuestOrderKey,isGuestOrderKey,
} from '@/lib/food-bridge'
import { initializeFarmEscrow, submitFarmEscrowProof, FARM_ESCROW_ACCOUNT_NUMBER } from '@/lib/food-escrow'
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
        e.status AS escrow_status,e.reference AS escrow_reference,e.buyer_total_ngn,e.seller_payout_ngn,e.weave_commission_ngn,
        e.verified_at,e.payout_recorded_at,
        l.produce,l.unit,f.farm_name,f.state AS origin_state,f.community,
        CASE WHEN f.consent_contact_sharing AND o.status IN ('farmer_confirmed','quoted','accepted','dispatched','delivered')
        THEN f.contact_private ELSE NULL END AS farmer_contact
      FROM weave_food_direct_orders o
      JOIN weave_food_surplus l ON l.id=o.listing_id
      JOIN weave_food_farmers f ON f.id=o.farmer_id
      LEFT JOIN weave_food_escrow e ON e.order_id=o.id
      WHERE o.guest_order_digest=$1 AND f.agent_id=$2::uuid
        AND o.carrier_referral_code=$3
      LIMIT 1
    `,[digestGuestOrderKey(key),agent.id,String(agent.referral_code).toUpperCase()])
    return rows.length?NextResponse.json({success:true,order:{...rows[0],paymentAccountNumber:rows[0].escrow_status==='awaiting_payment'?FARM_ESCROW_ACCOUNT_NUMBER:null,weaveCommissionNgn:rows[0].weave_commission_ngn===null?1000:Number(rows[0].weave_commission_ngn)}},{headers:{'Cache-Control':'no-store'}})
      :NextResponse.json({error:'Tracking key not found for this Agent'},{status:404})
  }catch(error){
    console.error('[carrier farm tracking] GET',error)
    return NextResponse.json({error:'Order tracking unavailable'},{status:500})
  }
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{code:string}>}) {
  let client
  try{
    const {code}=await params
    const agent=await carrierFarmer(code)
    if(!agent)return NextResponse.json({error:'Carrier Door unavailable'},{status:404})
    const key=request.headers.get('x-farm-order-key')
    if(!isGuestOrderKey(key))return NextResponse.json({error:'Private tracking key required'},{status:401})
    const body=await request.json().catch(()=>({}))
    const action=body.action
    if(!['accept_quote','submit_payment_proof','cancel','confirm_delivery','dispute'].includes(action))
      return NextResponse.json({error:'Unsupported order movement'},{status:400})
    await expireFoodRequests()
    const digest=digestGuestOrderKey(key)
    client=await getPool().connect()
    await client.query('BEGIN')
    const {rows}=await client.query(`
      SELECT o.id,o.status,o.quantity,o.listing_id,o.delivery_quote_ngn
      FROM weave_food_direct_orders o JOIN weave_food_farmers f ON f.id=o.farmer_id
      WHERE o.guest_order_digest=$1 AND o.carrier_referral_code=$2
        AND f.agent_id=$3::uuid FOR UPDATE
    `,[digest,String(agent.referral_code).toUpperCase(),agent.id])
    const order=rows[0]
    if(!order){await client.query('ROLLBACK');return NextResponse.json({error:'Order not found on this Carrier Door'},{status:404})}
    if(action==='accept_quote'){
      if(order.status!=='quoted'||order.delivery_quote_ngn===null){
        await client.query('ROLLBACK');return NextResponse.json({error:'A complete farmer quote is required'},{status:409})
      }
      await client.query(`UPDATE weave_food_direct_orders SET status='accepted',updated_at=NOW() WHERE id=$1::uuid`,[order.id])
      const escrow=await initializeFarmEscrow(client,order.id)
      await client.query('COMMIT')
      return NextResponse.json({success:true,order:{id:order.id,status:'accepted'},escrow,paymentAccountNumber:FARM_ESCROW_ACCOUNT_NUMBER,
        message:'Pay WEAVE the complete food and delivery quote with the exact FARM reference. Never pay this farmer directly through an unverified claim.'})
    }
    if(action==='submit_payment_proof'){
      if(order.status!=='accepted'){
        await client.query('ROLLBACK');return NextResponse.json({error:'Accept a quote before submitting payment proof'},{status:409})
      }
      const proof=await submitFarmEscrowProof(client,order.id,String(body.transactionReference||''))
      await client.query('COMMIT')
      return NextResponse.json({success:true,payment:proof,
        message:'Bank reference sent to WEAVE Administration. The seller will not dispatch until the transfer is independently verified.'})
    }
    if(action==='confirm_delivery'||action==='dispute'){
      const {rows:payments}=await client.query(`SELECT status FROM weave_food_escrow WHERE order_id=$1::uuid FOR UPDATE`,[order.id])
      if(!payments.length||payments[0].status!=='held'||order.status!=='dispatched'){
        await client.query('ROLLBACK');return NextResponse.json({error:'Only a verified, dispatched order can be confirmed or disputed.'},{status:409})
      }
      if(action==='confirm_delivery'){
        await client.query(`UPDATE weave_food_direct_orders SET status='delivered',updated_at=NOW() WHERE id=$1::uuid`,[order.id])
        await client.query(`UPDATE weave_food_escrow SET status='release_due',updated_at=NOW() WHERE order_id=$1::uuid`,[order.id])
        await client.query(`
          INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
          SELECT id,'farm_escrow_release_due','Buyer confirmed farm delivery',$1,'WEAVE Farm-to-Family','/admin/food-escrow'
          FROM users WHERE role='admin' AND is_active=true
        `,['Carrier farm order '+order.id+' was received. Pay farmer the quoted total less one ₦1,000 WEAVE seller service fee.'])
        await client.query('COMMIT')
        return NextResponse.json({success:true,order:{id:order.id,status:'delivered'},escrowStatus:'release_due',
          message:'Receipt recorded. WEAVE Administration will arrange the farmer payout, then record the actual transfer.'})
      }
      const note=typeof body.disputeNote==='string'?body.disputeNote.trim().slice(0,500):''
      if(note.length<15){await client.query('ROLLBACK');return NextResponse.json({error:'Explain why delivery is disputed (15+ characters)'},{status:400})}
      await client.query(`UPDATE weave_food_direct_orders SET status='disputed',updated_at=NOW() WHERE id=$1::uuid`,[order.id])
      await client.query(`UPDATE weave_food_escrow SET status='disputed',dispute_note=$2,updated_at=NOW() WHERE order_id=$1::uuid`,[order.id,note])
      await client.query(`
        INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
        SELECT id,'farm_escrow_dispute','Farm delivery disputed',$1,'WEAVE Farm-to-Family','/admin/food-escrow'
        FROM users WHERE role='admin' AND is_active=true
      `,['Carrier farm order '+order.id+' needs dispute review; seller payout remains blocked.'])
      await client.query('COMMIT')
      return NextResponse.json({success:true,order:{id:order.id,status:'disputed'},message:'Delivery dispute recorded. Funds remain held for Administration review.'})
    }
    if(!['requested','farmer_confirmed','quoted','accepted'].includes(order.status)){
      await client.query('ROLLBACK');return NextResponse.json({error:'Paid or dispatched orders must follow dispute/refund review.'},{status:409})
    }
    const {rows:payments}=await client.query(`SELECT status FROM weave_food_escrow WHERE order_id=$1::uuid FOR UPDATE`,[order.id])
    if(payments.length && payments[0].status!=='awaiting_payment'){
      await client.query('ROLLBACK');return NextResponse.json({error:'Payment proof under review; contact WEAVE Administration before cancelling.'},{status:409})
    }
    await client.query(`UPDATE weave_food_direct_orders SET status='cancelled',updated_at=NOW() WHERE id=$1::uuid`,[order.id])
    await client.query(`
      UPDATE weave_food_surplus SET available_quantity=LEAST(original_quantity,available_quantity+$1::numeric),updated_at=NOW()
      WHERE id=$2::uuid
    `,[order.quantity,order.listing_id])
    await client.query('COMMIT')
    return NextResponse.json({success:true,order:{id:order.id,status:'cancelled'}})
  }catch(error){
    if(client)await client.query('ROLLBACK').catch(()=>{})
    console.error('[carrier farm tracking] PATCH',error)
    return NextResponse.json({error:'Unable to update tracked farm order'},{status:500})
  }finally{client?.release()}
}
