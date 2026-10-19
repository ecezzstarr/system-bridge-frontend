import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { ensureFoodBridgeSchema, expireFoodRequests, keyHash, safeText, toNaira, validKey } from '@/lib/food-bridge'

export const dynamic = 'force-dynamic'

async function farmerFor(request: NextRequest) {
  const key = request.headers.get('x-farmer-key') || ''
  if (!validKey(key)) return null
  const result = await getPool().query(`
    SELECT id,farm_name,state,community,status,created_at
    FROM weave_food_farmers WHERE key_digest=$1 LIMIT 1
  `, [keyHash(key)])
  return result.rows[0] || null
}

export async function GET(request: NextRequest) {
  try {
    await expireFoodRequests()
    const farmer = await farmerFor(request)
    if (!farmer) return NextResponse.json({ error:'Invalid farmer access key' }, { status:401 })
    const [offers, orders] = await Promise.all([
      getPool().query(`
        SELECT id,produce,unit,original_quantity,available_quantity,
          minimum_quantity,unit_price_ngn,status,created_at
        FROM weave_food_surplus WHERE farmer_id=$1 ORDER BY created_at DESC LIMIT 60
      `, [farmer.id]),
      getPool().query(`
        SELECT o.id,o.listing_id,o.quantity,o.unit_price_ngn,o.food_subtotal_ngn,
          o.destination_state,o.destination_area,o.delivery_mode,
          o.delivery_quote_ngn,o.quote_note,o.status,o.created_at,l.produce,l.unit,
          CASE WHEN o.share_buyer_contact=true AND o.status NOT IN ('requested','rejected','expired','cancelled')
            THEN o.buyer_name END AS buyer_name,
          CASE WHEN o.share_buyer_contact=true AND o.status NOT IN ('requested','rejected','expired','cancelled')
            THEN o.buyer_phone_private END AS buyer_contact
        FROM weave_food_direct_orders o
        JOIN weave_food_surplus l ON l.id=o.listing_id
        WHERE o.farmer_id=$1 ORDER BY o.created_at DESC LIMIT 100
      `, [farmer.id]),
    ])
    return NextResponse.json({ success:true, farmer, offers:offers.rows, orders:orders.rows }, {
      headers: { 'Cache-Control':'no-store' },
    })
  } catch(error) {
    console.error('Food bridge farmer inbox failed:',error)
    return NextResponse.json({ error:'Farmer inbox unavailable' }, { status:500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await expireFoodRequests()
    const farmer = await farmerFor(request)
    if (!farmer || farmer.status !== 'approved') {
      return NextResponse.json({ error:'Approved farmer key required' }, { status:403 })
    }
    const body = await request.json().catch(() => ({}))
    const action = body.action
    const id = typeof body.orderId === 'string' ? body.orderId : ''
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (action === 'pause_offer' || action === 'resume_offer') {
      if (!isUuid.test(body.offerId || '')) return NextResponse.json({ error:'Invalid offer reference' }, { status:400 })
      const status = action === 'pause_offer' ? 'paused' : 'active'
      const { rows } = await getPool().query(`
        UPDATE weave_food_surplus SET status=$1,updated_at=NOW()
        WHERE id=$2::uuid AND farmer_id=$3::uuid AND status IN ('active','paused')
        RETURNING id,status
      `, [status,body.offerId,farmer.id])
      return rows.length ? NextResponse.json({success:true,offer:rows[0]}) : NextResponse.json({error:'Offer not found'}, {status:404})
    }
    if (!isUuid.test(id) || !['confirm','reject','quote','dispatch'].includes(action)) {
      return NextResponse.json({ error:'Invalid order or action' }, { status:400 })
    }
    if (action === 'quote') {
      const fee = Number(body.deliveryFeeNgn)
      if (!toNaira(fee)) return NextResponse.json({ error:'Enter the actual quoted delivery amount in naira (zero is allowed for pickup)' }, { status:400 })
      const note = safeText(body.quoteNote,500)
      if (note.length < 10) return NextResponse.json({ error:'Provide the carrier, delivery method and terms of this quote' }, { status:400 })
      const { rows } = await getPool().query(`
        UPDATE weave_food_direct_orders
        SET delivery_quote_ngn=$1, quote_note=$2, status='quoted',updated_at=NOW()
        WHERE id=$3::uuid AND farmer_id=$4::uuid AND status='farmer_confirmed'
        RETURNING id,status,food_subtotal_ngn,delivery_quote_ngn
      `, [fee,note,id,farmer.id])
      return rows.length ? NextResponse.json({success:true,order:rows[0]}) : NextResponse.json({error:'Order must first be confirmed by the farmer'}, {status:409})
    }
    if (action === 'confirm' || action === 'dispatch') {
      const required = action === 'confirm' ? 'requested' : 'accepted'
      const next = action === 'confirm' ? 'farmer_confirmed' : 'dispatched'
      const { rows } = await getPool().query(`
        UPDATE weave_food_direct_orders SET status=$1,updated_at=NOW()
        WHERE id=$2::uuid AND farmer_id=$3::uuid AND status=$4
        RETURNING id,status
      `, [next,id,farmer.id,required])
      return rows.length ? NextResponse.json({success:true,order:rows[0]}) : NextResponse.json({error:'The order is no longer at this stage'}, {status:409})
    }
    // Declining a request restores reserved produce exactly once under a transaction.
    const client = await getPool().connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(`
        UPDATE weave_food_direct_orders SET status='rejected',updated_at=NOW()
        WHERE id=$1::uuid AND farmer_id=$2::uuid AND status='requested'
        RETURNING id,listing_id,quantity
      `, [id,farmer.id])
      if (!rows.length) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error:'Request already handled' }, { status:409 })
      }
      await client.query(`
        UPDATE weave_food_surplus
        SET available_quantity=LEAST(original_quantity,available_quantity+$1::numeric),updated_at=NOW()
        WHERE id=$2::uuid
      `, [rows[0].quantity,rows[0].listing_id])
      await client.query('COMMIT')
      return NextResponse.json({success:true,order:{id,status:'rejected'}})
    } catch(error) { await client.query('ROLLBACK'); throw error }
    finally { client.release() }
  } catch(error) {
    console.error('Farmer food order update failed:',error)
    return NextResponse.json({ error:'Unable to update food order' }, { status:500 })
  }
}
