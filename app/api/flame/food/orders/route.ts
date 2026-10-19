import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import {
  ensureFoodBridgeSchema, expireFoodRequests, keyHash, safeText, secretKey,
  validFoodState, validKey, validPhone, validQuantity,
} from '@/lib/food-bridge'

export const dynamic = 'force-dynamic'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  let client
  try {
    const body = await request.json().catch(() => ({}))
    const listingId = typeof body.offerId === 'string' ? body.offerId : ''
    const name = safeText(body.buyerName,120)
    const phone = safeText(body.buyerPhone,60)
    const destination = body.destinationState
    const area = safeText(body.destinationArea,160)
    const qty = Number(body.quantity)
    const mode = body.deliveryMode === 'pickup' ? 'pickup' : 'delivery'
    if (!uuidPattern.test(listingId) || name.length < 2 || !validPhone(phone) || !validFoodState(destination) ||
        area.length < 3 || !validQuantity(qty)) {
      return NextResponse.json({ error:'Valid produce, quantity, household contact, destination state and delivery area are required' }, { status:400 })
    }
    await expireFoodRequests()
    client = await getPool().connect()
    await client.query('BEGIN')
    const { rows: recent } = await client.query(`
      SELECT COUNT(*)::int AS total FROM weave_food_direct_orders
      WHERE buyer_phone_private=$1 AND created_at > NOW() - INTERVAL '1 hour'
    `, [phone])
    if (Number(recent[0]?.total||0) >= 3) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error:'Hourly household order limit reached' }, { status:429 })
    }

    // One conditional update both validates the supplier and reserves the
    // available produce. Concurrent buyers cannot take the same quantity.
    const { rows: listing } = await client.query(`
      UPDATE weave_food_surplus l
      SET available_quantity=l.available_quantity-$1::numeric,updated_at=NOW()
      FROM weave_food_farmers f
      WHERE l.id=$2::uuid AND f.id=l.farmer_id
        AND f.status='approved' AND l.status='active'
        AND l.available_quantity >= $1::numeric
        AND l.minimum_quantity <= $1::numeric
      RETURNING l.id,l.farmer_id,l.unit,l.produce,l.unit_price_ngn,
        ROUND((l.unit_price_ngn*$1::numeric)::numeric,2) AS food_subtotal_ngn
    `, [qty,listingId])
    if (!listing.length) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error:'That quantity is unavailable. Refresh the market and choose an available amount.' }, { status:409 })
    }
    const buyerKey = secretKey()
    const { rows } = await client.query(`
      INSERT INTO weave_food_direct_orders (
        buyer_key_digest,listing_id,farmer_id,buyer_name,buyer_phone_private,share_buyer_contact,
        destination_state,destination_area,delivery_mode,quantity,unit_price_ngn,food_subtotal_ngn
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id,status,quantity,unit_price_ngn,food_subtotal_ngn,delivery_quote_ngn,created_at
    `, [keyHash(buyerKey),listing[0].id,listing[0].farmer_id,name,phone,
      body.shareBuyerContact===true,destination,area,mode,qty,listing[0].unit_price_ngn,
      listing[0].food_subtotal_ngn])
    await client.query('COMMIT')
    return NextResponse.json({
      success:true, order:rows[0], buyerKey,
      instruction:'Save your private order key. This is a produce request only, not a paid order. Farmer confirmation and a delivery quote must follow before you accept the total cost.',
    }, { status:201 })
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(()=>{})
    console.error('Direct food order failed:',error)
    return NextResponse.json({ error:'Unable to request food from this farmer' }, { status:500 })
  } finally { client?.release() }
}

export async function GET(request: NextRequest) {
  try {
    await ensureFoodBridgeSchema()
    const key = request.headers.get('x-food-order-key') || ''
    if (!validKey(key)) return NextResponse.json({ error:'Private household order key required' }, { status:401 })
    const { rows } = await getPool().query(`
      SELECT o.id,o.status,o.quantity,o.unit_price_ngn,o.food_subtotal_ngn,
        o.delivery_quote_ngn,o.quote_note,o.destination_state,o.destination_area,o.delivery_mode,
        o.created_at,l.produce,l.unit,f.farm_name,f.state AS origin_state,f.community,
        CASE WHEN f.consent_contact_sharing=true AND o.status IN ('farmer_confirmed','quoted','accepted','dispatched','delivered')
          THEN f.contact_private ELSE NULL END AS farmer_contact
      FROM weave_food_direct_orders o
      JOIN weave_food_surplus l ON l.id=o.listing_id
      JOIN weave_food_farmers f ON f.id=o.farmer_id
      WHERE o.buyer_key_digest=$1
      LIMIT 1
    `, [keyHash(key)])
    return rows.length ? NextResponse.json({success:true,order:rows[0]}, {headers:{'Cache-Control':'no-store'}})
      : NextResponse.json({error:'Order key not found'},{status:404})
  } catch(error) {
    console.error('Direct food order tracking failed:',error)
    return NextResponse.json({error:'Order tracking unavailable'},{status:500})
  }
}

export async function PATCH(request: NextRequest) {
  let client
  try {
    const key = request.headers.get('x-food-order-key') || ''
    if (!validKey(key)) return NextResponse.json({error:'Private household order key required'},{status:401})
    const body = await request.json().catch(()=>({}))
    const action = body.action
    if (!['accept_quote','cancel','confirm_delivery'].includes(action)) {
      return NextResponse.json({error:'Unknown order movement'},{status:400})
    }
    await expireFoodRequests()
    const digest = keyHash(key)
    if (action === 'accept_quote' || action === 'confirm_delivery') {
      const expected=action === 'accept_quote' ? 'quoted' : 'dispatched'
      const next=action === 'accept_quote' ? 'accepted' : 'delivered'
      const { rows } = await getPool().query(`
        UPDATE weave_food_direct_orders
        SET status=$1,updated_at=NOW()
        WHERE buyer_key_digest=$2 AND status=$3
          AND ($1 <> 'accepted' OR delivery_quote_ngn IS NOT NULL)
        RETURNING id,status,food_subtotal_ngn,delivery_quote_ngn
      `,[next,digest,expected])
      return rows.length ? NextResponse.json({success:true,order:rows[0]})
        : NextResponse.json({error:'This order is not ready for that step'},{status:409})
    }
    client=await getPool().connect()
    await client.query('BEGIN')
    const { rows }=await client.query(`
      UPDATE weave_food_direct_orders
      SET status='cancelled',updated_at=NOW()
      WHERE buyer_key_digest=$1 AND status IN ('requested','farmer_confirmed','quoted')
      RETURNING id,listing_id,quantity
    `,[digest])
    if (!rows.length) {
      await client.query('ROLLBACK')
      return NextResponse.json({error:'This order can no longer be cancelled here'},{status:409})
    }
    await client.query(`
      UPDATE weave_food_surplus
      SET available_quantity=LEAST(original_quantity,available_quantity+$1::numeric),updated_at=NOW()
      WHERE id=$2::uuid
    `,[rows[0].quantity,rows[0].listing_id])
    await client.query('COMMIT')
    return NextResponse.json({success:true,order:{id:rows[0].id,status:'cancelled'}})
  } catch(error) {
    if (client) await client.query('ROLLBACK').catch(()=>{})
    console.error('Direct food buyer step failed:',error)
    return NextResponse.json({error:'Unable to update household order'},{status:500})
  } finally { client?.release() }
}
