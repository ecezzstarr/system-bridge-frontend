import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { ensureFoodBridgeSchema, safeText } from '@/lib/food-bridge'
import { getPool } from '@/lib/db'

export const dynamic = 'force-dynamic'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function adminOnly(request:NextRequest) {
  const user = await requireApiUser(request)
  return user?.role === 'admin' ? user : null
}

export async function GET(request: NextRequest) {
  try {
    const admin = await adminOnly(request)
    if (!admin) return NextResponse.json({error:'Administration access required'},{status:403})
    await ensureFoodBridgeSchema()
    const [farmers,latestOrders] = await Promise.all([
      getPool().query(`
        SELECT id,farm_name,contact_private,state,community,status,
          consent_contact_sharing,review_note,reviewed_at,created_at
        FROM weave_food_farmers
        ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END,created_at DESC
        LIMIT 100
      `),
      getPool().query(`
        SELECT o.id,o.status,o.quantity,o.food_subtotal_ngn,o.delivery_quote_ngn,
          o.destination_state,o.destination_area,o.delivery_mode,
          o.created_at,l.produce,l.unit,f.farm_name,f.state AS origin_state
        FROM weave_food_direct_orders o
        JOIN weave_food_surplus l ON l.id=o.listing_id
        JOIN weave_food_farmers f ON f.id=o.farmer_id
        ORDER BY o.created_at DESC LIMIT 75
      `),
    ])
    return NextResponse.json({success:true,farmers:farmers.rows,orders:latestOrders.rows},{headers:{'Cache-Control':'no-store'}})
  } catch(error) {
    console.error('Food bridge administration read failed:',error)
    return NextResponse.json({error:'Unable to load farmer verification queue'},{status:500})
  }
}

export async function PATCH(request:NextRequest) {
  try {
    const admin=await adminOnly(request)
    if (!admin) return NextResponse.json({error:'Administration access required'},{status:403})
    const body=await request.json().catch(()=>({}))
    const id=typeof body.farmerId==='string' ? body.farmerId : ''
    const next=body.decision
    const note=safeText(body.reviewNote,2000)
    if (!uuid.test(id) || !['approved','rejected'].includes(next) || note.length<15) {
      return NextResponse.json({error:'Farmer, approval decision and verification note of at least 15 characters required'},{status:400})
    }
    await ensureFoodBridgeSchema()
    const {rows}=await getPool().query(`
      UPDATE weave_food_farmers
      SET status=$1,review_note=$2,reviewed_at=NOW(),reviewed_by=$3::uuid
      WHERE id=$4::uuid AND status='pending'
      RETURNING id,status,farm_name
    `,[next,note,admin.id,id])
    return rows.length ? NextResponse.json({success:true,farmer:rows[0]})
      : NextResponse.json({error:'Farmer was already reviewed'},{status:409})
  } catch(error) {
    console.error('Food bridge farmer verification failed:',error)
    return NextResponse.json({error:'Unable to verify this farmer'},{status:500})
  }
}
