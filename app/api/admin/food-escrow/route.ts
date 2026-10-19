import { NextRequest,NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureFoodBridgeSchema,uuidPattern } from '@/lib/food-bridge'

export const dynamic='force-dynamic'
function invalid(message:string,status=400){return NextResponse.json({success:false,error:message},{status})}
const bankRefValid=(v:unknown)=>typeof v==='string'&&v.trim().length>=8&&v.trim().length<=255

export async function GET(request:NextRequest){
  const admin=await getAuthUser(request)
  if(!admin||admin.role!=='admin')return invalid('Administration only',403)
  try{
    await ensureFoodBridgeSchema()
    const {rows}=await getPool().query(`
      SELECT e.order_id,e.status AS escrow_status,e.reference,e.food_amount_ngn,e.delivery_amount_ngn,
        e.buyer_total_ngn,e.weave_commission_ngn,e.seller_payout_ngn,
        e.proof_reference,e.proof_submitted_at,e.verified_bank_reference,e.verified_amount_ngn,e.verified_at,
        e.payout_reference,e.payout_recorded_at,e.refund_reference,e.refund_recorded_at,e.dispute_note,
        e.administration_note,o.status AS order_status,o.buyer_name,o.buyer_phone_private,o.share_buyer_contact,
        o.destination_area,o.destination_state,o.delivery_mode,o.quantity,
        f.farm_name,f.state AS farmer_state,f.community,f.contact_private AS farmer_phone,
        f.payout_bank_name,f.payout_account_number,f.payout_account_name,
        u.id AS seller_agent_id,u.name AS seller_agent_name,
        l.produce,l.unit
      FROM weave_food_escrow e
      JOIN weave_food_direct_orders o ON o.id=e.order_id
      JOIN weave_food_farmers f ON f.id=o.farmer_id
      JOIN users u ON u.id=f.agent_id
      JOIN weave_food_surplus l ON l.id=o.listing_id
      ORDER BY CASE e.status
        WHEN 'proof_submitted' THEN 1 WHEN 'release_due' THEN 2
        WHEN 'disputed' THEN 3 WHEN 'held' THEN 4 ELSE 5 END,e.updated_at DESC
      LIMIT 150
    `)
    return NextResponse.json({success:true,orders:rows,feePolicy:'WEAVE farmer commission is always ₦0. Buyer transport quote is passed to the seller without a WEAVE markup.',manualBankReconciliationRequired:true},
      {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[admin/farm escrow] GET',error);return invalid('Cannot load payment reviews',500)}
}

export async function PATCH(request:NextRequest){
  const admin=await getAuthUser(request)
  if(!admin||admin.role!=='admin')return invalid('Administration only',403)
  const body=await request.json().catch(()=>({}))
  const orderId=body.orderId
  const decision=body.action
  const note=typeof body.note==='string'?body.note.trim().slice(0,2000):''
  if(!uuidPattern.test(String(orderId||''))||!['verify_payment','reject_proof','record_payout','record_refund','hold_dispute'].includes(decision))
    return invalid('Valid farm escrow order and review action are required')
  if(note.length<12)return invalid('Record an audit reason of at least 12 characters')
  let client
  try{
    await ensureFoodBridgeSchema()
    client=await getPool().connect()
    await client.query('BEGIN')
    const {rows}=await client.query(`
      SELECT e.*,o.status AS order_status,o.destination_area,o.destination_state,
        o.buyer_name,o.buyer_phone_private,o.share_buyer_contact,o.quantity,
        o.farmer_id, f.agent_id AS seller_agent_id,f.payout_bank_name,f.payout_account_number,
        f.payout_account_name,l.produce,l.unit
      FROM weave_food_escrow e
      JOIN weave_food_direct_orders o ON o.id=e.order_id
      JOIN weave_food_farmers f ON f.id=o.farmer_id
      JOIN weave_food_surplus l ON l.id=o.listing_id
      WHERE e.order_id=$1::uuid FOR UPDATE OF e,o
    `,[orderId])
    const order=rows[0]
    if(!order){await client.query('ROLLBACK');return invalid('Escrow order not found',404)}
    if(Number(order.weave_commission_ngn)!==0||Number(order.seller_payout_ngn)!==Number(order.buyer_total_ngn))
      throw new Error('Zero-fee farmer payout invariant does not hold')
    if(decision==='verify_payment'){
      const bankReference=typeof body.bankReference==='string'?body.bankReference.trim():''
      const amount=Number(body.verifiedAmountNgn)
      if(order.status!=='proof_submitted'||order.order_status!=='accepted'||!bankRefValid(bankReference)||
        !Number.isFinite(amount)||Math.abs(amount-Number(order.buyer_total_ngn))>0.001){
        await client.query('ROLLBACK');return invalid('Bank-confirmed transfer reference and the exact received order total are required for a pending proof',409)
      }
      await client.query(`
        UPDATE weave_food_escrow SET status='held',verified_bank_reference=$2,verified_amount_ngn=$3,
          verified_by=$4::uuid,verified_at=NOW(),administration_note=$5,updated_at=NOW()
        WHERE order_id=$1::uuid
      `,[orderId,bankReference,amount,admin.id,note])
      await client.query(`UPDATE weave_food_direct_orders SET status='funds_held',updated_at=NOW() WHERE id=$1::uuid`,[orderId])
      const instructions=[
        'WEAVE has verified the buyer funds are held. DISPATCH IS NOW AUTHORIZED.',
        String(order.produce)+' · '+String(order.quantity)+' '+String(order.unit),
        'Order '+orderId,
        'Deliver to '+String(order.destination_area)+', '+String(order.destination_state),
        order.share_buyer_contact?'Buyer '+String(order.buyer_name)+' · '+String(order.buyer_phone_private):'Buyer contact not released; coordinate through WEAVE Administration.',
        'Farm price + delivery quote: ₦'+Number(order.seller_payout_ngn).toLocaleString('en-NG'),
        'WEAVE commission: ₦0.',
        'Open Lifestyle → Farm-to-Family to record dispatch.',
      ].join('\n')
      await client.query(`
        INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)
        VALUES($1::uuid,'farm_payment_held','Buyer payment confirmed · dispatch farm produce',
          $2,$3::uuid,'WEAVE Administration','/weave/lifestyles/food')
      `,[order.seller_agent_id,instructions,admin.id])
      await client.query('COMMIT')
      return NextResponse.json({success:true,orderId,status:'funds_held',escrowStatus:'held',
        message:'Actual bank credit recorded. Farmer notified to dispatch to the recorded buyer location.'})
    }
    if(decision==='reject_proof'){
      if(order.status!=='proof_submitted'||order.order_status!=='accepted'){
        await client.query('ROLLBACK');return invalid('Only pending proof may be rejected.',409)
      }
      await client.query(`
        UPDATE weave_food_escrow SET status='awaiting_payment',
          proof_reference=NULL,proof_submitted_at=NULL,rejected_by=$2::uuid,rejected_at=NOW(),
          administration_note=$3,updated_at=NOW() WHERE order_id=$1::uuid
      `,[orderId,admin.id,note])
      await client.query('COMMIT')
      return NextResponse.json({success:true,orderId,escrowStatus:'awaiting_payment',
        message:'Rejected payment evidence. The buyer can provide a new reference; no dispatch is authorized.'})
    }
    if(decision==='record_payout'){
      const transfer=typeof body.bankReference==='string'?body.bankReference.trim():''
      const confirmed=body.confirmedBankTransfer===true
      if(order.status!=='release_due'||order.order_status!=='delivered'||!bankRefValid(transfer)||!confirmed||
        !order.payout_bank_name||!order.payout_account_number||!order.payout_account_name){
        await client.query('ROLLBACK')
        return invalid('Buyer receipt, complete farmer bank details and a genuinely completed payout reference are required. WEAVE does not transfer funds automatically.',409)
      }
      await client.query(`
        UPDATE weave_food_escrow SET status='released',
          payout_reference=$2,payout_recorded_by=$3::uuid,payout_recorded_at=NOW(),
          administration_note=$4,updated_at=NOW() WHERE order_id=$1::uuid
      `,[orderId,transfer,admin.id,note])
      await client.query(`UPDATE weave_food_direct_orders SET status='released',updated_at=NOW() WHERE id=$1::uuid`,[orderId])
      await client.query(`
        INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)
        VALUES($1::uuid,'farm_payout_released','Farm-to-Family payout recorded',$2,
          $3::uuid,'WEAVE Administration','/weave/lifestyles/food')
      `,[order.seller_agent_id,'Order '+orderId+' paid in full (₦'+Number(order.seller_payout_ngn).toLocaleString('en-NG')+'). Transfer reference: '+transfer+'. WEAVE commission: ₦0.',admin.id])
      await client.query('COMMIT')
      return NextResponse.json({success:true,orderId,escrowStatus:'released',
        message:'Administration recorded a completed external bank payout and notified the seller.'})
    }
    if(decision==='hold_dispute'){
      if(order.status!=='release_due'||order.order_status!=='delivered'){
        await client.query('ROLLBACK');return invalid('Only unpaid buyer-confirmed delivery can be disputed before payout.',409)
      }
      await client.query(`UPDATE weave_food_escrow SET status='disputed',dispute_note=$2,administration_note=$2,updated_at=NOW() WHERE order_id=$1::uuid`,[orderId,note])
      await client.query(`UPDATE weave_food_direct_orders SET status='disputed',updated_at=NOW() WHERE id=$1::uuid`,[orderId])
      await client.query('COMMIT')
      return NextResponse.json({success:true,orderId,escrowStatus:'disputed',
        message:'Payout blocked pending documented dispute review.'})
    }
    if(decision==='record_refund'){
      const transfer=typeof body.bankReference==='string'?body.bankReference.trim():''
      if(order.status!=='disputed'||order.order_status!=='disputed'||!bankRefValid(transfer)||
        body.confirmedBankTransfer!==true){
        await client.query('ROLLBACK');return invalid('Refund requires a disputed escrow and confirmed external bank refund reference.',409)
      }
      await client.query(`UPDATE weave_food_escrow SET status='refunded',
        refund_reference=$2,refund_recorded_by=$3::uuid,refund_recorded_at=NOW(),
        administration_note=$4,updated_at=NOW() WHERE order_id=$1::uuid`,[orderId,transfer,admin.id,note])
      await client.query(`UPDATE weave_food_direct_orders SET status='refunded',updated_at=NOW() WHERE id=$1::uuid`,[orderId])
      await client.query('COMMIT')
      return NextResponse.json({success:true,orderId,escrowStatus:'refunded',
        message:'Completed external refund recorded. Do not double-dispatch or release seller payout.'})
    }
    await client.query('ROLLBACK')
    return invalid('Unsupported operation')
  }catch(error){
    if(client)await client.query('ROLLBACK').catch(()=>{})
    console.error('[admin/farm escrow] PATCH',error)
    return invalid('Farm settlement decision failed; no funds have been moved by this API.',500)
  }finally{client?.release()}
}
