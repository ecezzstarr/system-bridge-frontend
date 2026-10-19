import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import {
  ensureFoodBridgeSchema, expireFoodRequests, FOOD_BRIDGE_STATES,
  keyHash, safeText, secretKey, toNaira, validFoodState, validFoodUnit,
  validKey, validPhone, validQuantity,
} from '@/lib/food-bridge'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await expireFoodRequests()
    const state = request.nextUrl.searchParams.get('origin') || ''
    const produce = safeText(request.nextUrl.searchParams.get('search'),80)
    if (state && !validFoodState(state)) {
      return NextResponse.json({ error: 'Unknown origin state' }, { status: 400 })
    }
    const result = await getPool().query(`
      SELECT l.id, l.produce, l.unit, l.available_quantity, l.minimum_quantity,
             l.unit_price_ngn, l.details, f.farm_name, f.state, f.community
      FROM weave_food_surplus l
      JOIN weave_food_farmers f ON f.id=l.farmer_id
      WHERE f.status='approved' AND l.status='active'
        AND l.available_quantity >= l.minimum_quantity
        AND ($1::text = '' OR f.state=$1)
        AND ($2::text = '' OR l.produce ILIKE '%' || $2 || '%')
      ORDER BY l.created_at DESC LIMIT 100
    `, [state, produce])
    return NextResponse.json({ success:true, offers:result.rows, states:FOOD_BRIDGE_STATES }, {
      headers: { 'Cache-Control':'no-store' },
    })
  } catch (error) {
    console.error('Food bridge listing unavailable:',error)
    return NextResponse.json({ error:'Surplus food market unavailable' }, { status:500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action
    await ensureFoodBridgeSchema()
    if (action === 'register') {
      const farmName = safeText(body.farmName,120)
      const contact = safeText(body.contact,60)
      const community = safeText(body.community,120)
      const state = body.state
      if (farmName.length < 3 || !validPhone(contact) || community.length < 3 || !validFoodState(state)) {
        return NextResponse.json({ error:'Farm name, real contact, state and village/community are required' }, { status:400 })
      }
      const pool = getPool()
      const { rows: recent } = await pool.query(`
        SELECT COUNT(*)::int AS total
        FROM weave_food_farmers WHERE contact_private=$1
          AND created_at > NOW()-INTERVAL '24 hours'
      `, [contact])
      if (Number(recent[0]?.total||0) >= 2) {
        return NextResponse.json({ error:'A recent farmer application already exists for this contact' }, { status:429 })
      }
      const managementKey = secretKey()
      const { rows } = await pool.query(`
        INSERT INTO weave_food_farmers
          (key_digest,farm_name,contact_private,state,community,consent_contact_sharing)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id,status,farm_name,state,community
      `, [keyHash(managementKey),farmName,contact,state,community,body.shareFarmerContact===true])
      return NextResponse.json({
        success:true, farmer:rows[0], managementKey,
        instruction:'Store this private farmer key. It is needed to manage produce and respond to household requests. Your account is pending Administration verification.',
      }, { status:201 })
    }
    if (action === 'offer') {
      const managementKey = request.headers.get('x-farmer-key') || ''
      if (!validKey(managementKey)) return NextResponse.json({ error:'Private farmer key required' }, { status:401 })
      const produce = safeText(body.produce,120)
      const details = safeText(body.details,500)
      const qty = Number(body.quantity)
      const minimum = Number(body.minimumQuantity)
      const price = Number(body.priceNgn)
      if (produce.length < 2 || !validFoodUnit(body.unit) ||
          !validQuantity(qty) || !validQuantity(minimum) || minimum > qty ||
          !toNaira(price) || price <= 0) {
        return NextResponse.json({ error:'Provide valid produce, unit, quantity, minimum order and positive naira unit price' }, { status:400 })
      }
      const pool = getPool()
      const { rows: farmers } = await pool.query(
        'SELECT id FROM weave_food_farmers WHERE key_digest=$1 AND status=$2 LIMIT 1',
        [keyHash(managementKey),'approved'],
      )
      if (!farmers.length) {
        return NextResponse.json({ error:'Farmer verification is required before publishing available food' }, { status:403 })
      }
      const { rows: offers } = await pool.query(`
        INSERT INTO weave_food_surplus
          (farmer_id,produce,unit,original_quantity,available_quantity,minimum_quantity,unit_price_ngn,details)
        VALUES ($1,$2,$3,$4,$4,$5,$6,$7)
        RETURNING id,produce,unit,available_quantity,minimum_quantity,unit_price_ngn,status
      `, [farmers[0].id,produce,body.unit,qty,minimum,price,details])
      return NextResponse.json({ success:true, offer:offers[0] }, { status:201 })
    }
    return NextResponse.json({ error:'Unknown food bridge action' }, { status:400 })
  } catch (error) {
    console.error('Food bridge write failed:',error)
    return NextResponse.json({ error:'Food movement could not be recorded' }, { status:500 })
  }
}
