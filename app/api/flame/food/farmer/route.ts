import { NextRequest,NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { requireFoodBridgePosition,foodBridgeError } from '@/lib/food-bridge-access'
import { ensureFoodBridgeSchema,expireFoodRequests,safeText,uuidPattern,validNaira } from '@/lib/food-bridge'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest) {
  try {
    const user=await requireFoodBridgePosition(request)
    if(user.role!=='agent') return NextResponse.json({error:'Agent farm desk only'},{status:403})
    await expireFoodRequests()
    const result=await getPool().query(`
      SELECT id,farm_name,state,community,status,created_at
      FROM weave_food_farmers WHERE agent_id=$1::uuid LIMIT 1
    `,[user.id])
    const farmer=result.rows[0]||null
    if(!farmer) return NextResponse.json({success:true,farmer:null,offers:[],orders:[]},{headers:{'Cache-Control':'no-store'}})
    const [offers,orders]=await Promise.all([
      getPool().query(`
        SELECT id,produce,unit,original_quantity,available_quantity,minimum_quantity,unit_price_ngn,status
        FROM weave_food_surplus WHERE farmer_id=$1::uuid ORDER BY created_at DESC LIMIT 70
      `,[farmer.id]),
      getPool().query(`
        SELECT o.id,o.quantity,o.food_subtotal_ngn,o.delivery_quote_ngn,o.destination_state,
          o.destination_area,o.delivery_mode,o.status,o.created_at,l.produce,l.unit,
          CASE WHEN o.share_buyer_contact AND o.status NOT IN ('requested','rejected','expired','cancelled')
            THEN o.buyer_name ELSE NULL END AS buyer_name,
          CASE WHEN o.share_buyer_contact AND o.status NOT IN ('requested','rejected','expired','cancelled')
            THEN o.buyer_phone_private ELSE NULL END AS buyer_contact
        FROM weave_food_direct_orders o JOIN weave_food_surplus l ON l.id=o.listing_id
        WHERE o.farmer_id=$1::uuid ORDER BY o.created_at DESC LIMIT 100
      `,[farmer.id]),
    ])
    return NextResponse.json({success:true,farmer,offers:offers.rows,orders:orders.rows},{headers:{'Cache-Control':'no-store'}})
  } catch(error) {
    console.error('[lifestyle food farmer] GET',error)
    return NextResponse.json({error:foodBridgeError(error)===500?'Farmer desk unavailable':(error as Error).message},{status:foodBridgeError(error)})
  }
}

export async function PATCH(request:NextRequest) {
  try {
    const user=await requireFoodBridgePosition(request)
    if(user.role!=='agent') return NextResponse.json({error:'Agent farm desk only'},{status:403})
    await expireFoodRequests()
    const body=await request.json().catch(()=>({}))
    const action=body.action
    const id=typeof body.orderId==='string'?body.orderId:''
    const pool=getPool()
    const {rows:farmers}=await pool.query(`
      SELECT id FROM weave_food_farmers WHERE agent_id=$1::uuid AND status='approved' LIMIT 1
    `,[user.id])
    const farmer=farmers[0]
    if(!farmer)return NextResponse.json({error:'Your Agent farm needs Administration approval'},{status:403})
    if(['pause_offer','resume_offer'].includes(action)) {
      if(!uuidPattern.test(body.offerId||''))return NextResponse.json({error:'Invalid offer'},{status:400})
      const status=action==='pause_offer'?'paused':'active'
      const {rows}=await pool.query(`
        UPDATE weave_food_surplus SET status=$1,updated_at=NOW()
        WHERE id=$2::uuid AND farmer_id=$3::uuid AND status IN ('active','paused')
        RETURNING id,status
      `,[status,body.offerId,farmer.id])
      return rows.length?NextResponse.json({success:true,offer:rows[0]}):NextResponse.json({error:'Offer not found'},{status:404})
    }
    if(!uuidPattern.test(id)||!['confirm','quote','reject','dispatch'].includes(action))return NextResponse.json({error:'Invalid action'},{status:400})
    if(action==='quote') {
      const fee=Number(body.deliveryFeeNgn)
      const note=safeText(body.quoteNote,500)
      if(!validNaira(fee)||note.length<10)return NextResponse.json({error:'A real transport price and transport terms are required'},{status:400})
      const {rows}=await pool.query(`
        UPDATE weave_food_direct_orders SET delivery_quote_ngn=$1,quote_note=$2,
          status='quoted',updated_at=NOW()
        WHERE id=$3::uuid AND farmer_id=$4::uuid AND status='farmer_confirmed'
        RETURNING id,status,food_subtotal_ngn,delivery_quote_ngn
      `,[fee,note,id,farmer.id])
      return rows.length?NextResponse.json({success:true,order:rows[0]}):NextResponse.json({error:'Confirm this order before quoting'},{status:409})
    }
    if(action==='confirm'||action==='dispatch'){
      const expected=action==='confirm'?'requested':'accepted',next=action==='confirm'?'farmer_confirmed':'dispatched'
      const {rows}=await pool.query(`
        UPDATE weave_food_direct_orders SET status=$1,updated_at=NOW()
        WHERE id=$2::uuid AND farmer_id=$3::uuid AND status=$4
        RETURNING id,status
      `,[next,id,farmer.id,expected])
      return rows.length?NextResponse.json({success:true,order:rows[0]}):NextResponse.json({error:'Order already moved past this stage'},{status:409})
    }
    const client=await pool.connect()
    try{
      await client.query('BEGIN')
      const {rows}=await client.query(`
        UPDATE weave_food_direct_orders SET status='rejected',updated_at=NOW()
        WHERE id=$1::uuid AND farmer_id=$2::uuid AND status='requested'
        RETURNING id,listing_id,quantity
      `,[id,farmer.id])
      if(!rows.length){await client.query('ROLLBACK');return NextResponse.json({error:'Order is already handled'},{status:409})}
      await client.query(`
        UPDATE weave_food_surplus
        SET available_quantity=LEAST(original_quantity,available_quantity+$1::numeric),updated_at=NOW()
        WHERE id=$2::uuid
      `,[rows[0].quantity,rows[0].listing_id])
      await client.query('COMMIT')
      return NextResponse.json({success:true,order:{id,status:'rejected'}})
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }catch(error){
    console.error('[lifestyle food farmer] PATCH',error)
    return NextResponse.json({error:foodBridgeError(error)===500?'Unable to move this order':(error as Error).message},{status:foodBridgeError(error)})
  }
}
