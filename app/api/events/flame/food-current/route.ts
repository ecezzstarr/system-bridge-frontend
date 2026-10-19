import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { FLAME_EVENT } from '@/lib/weave-event'
import { ensureFoodBridgeSchema } from '@/lib/food-bridge'

export const dynamic='force-dynamic'

/**
 * The Flame Food Current is a read-only projection of real Food Bridge orders.
 * No records are manufactured to make any state appear active. Farm offers are
 * supplier-reported; delivery is buyer-reported, NOT a verified payment.
 * Personal details, precise destinations, and private notes never leave here.
 */
export async function GET(){
  try {
    await ensureFoodBridgeSchema()
    const pool=getPool()
    const [offers, corridors, totals]=await Promise.all([
      pool.query(`
        SELECT l.id,l.produce,l.unit,l.available_quantity,l.minimum_quantity,
          l.unit_price_ngn,f.farm_name,f.state AS origin_state,f.community,
          u.referral_code
        FROM weave_food_surplus l
        JOIN weave_food_farmers f ON f.id=l.farmer_id
        JOIN users u ON u.id=f.agent_id
        WHERE f.status='approved' AND l.status='active'
          AND l.available_quantity>=l.minimum_quantity
          AND u.role='agent' AND u.is_active=true
          AND u.referral_code IS NOT NULL AND u.referral_code<>''
        ORDER BY l.updated_at DESC, l.created_at DESC
        LIMIT 9
      `),
      pool.query(`
        SELECT o.id,l.produce,l.unit,o.quantity,f.state AS origin_state,
          o.destination_state,o.status,o.updated_at,
          u.referral_code
        FROM weave_food_direct_orders o
        JOIN weave_food_surplus l ON l.id=o.listing_id
        JOIN weave_food_farmers f ON f.id=o.farmer_id
        JOIN users u ON u.id=f.agent_id
        WHERE o.created_at >= $1::timestamptz
          AND o.created_at <= $2::timestamptz
          AND o.status IN ('requested','farmer_confirmed','quoted','accepted','dispatched','delivered')
          AND u.role='agent' AND u.is_active=true
          AND u.referral_code IS NOT NULL AND u.referral_code<>''
          AND (o.status <> 'requested' OR o.created_at > NOW()-INTERVAL '24 hours')
          AND (o.status NOT IN ('farmer_confirmed','quoted') OR o.updated_at > NOW()-INTERVAL '48 hours')
        ORDER BY o.updated_at DESC
        LIMIT 9
      `,[FLAME_EVENT.startsAt,FLAME_EVENT.endsAt]),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE o.status IN ('requested','farmer_confirmed','quoted')
            AND (o.status<>'requested' OR o.created_at>NOW()-INTERVAL '24 hours')
            AND (o.status NOT IN ('farmer_confirmed','quoted') OR o.updated_at>NOW()-INTERVAL '48 hours')
          )::int AS awaiting_agreement,
          COUNT(*) FILTER (WHERE o.status='accepted')::int AS accepted_quotes,
          COUNT(*) FILTER (WHERE o.status='dispatched')::int AS farmer_reported_dispatches,
          COUNT(*) FILTER (WHERE o.status='delivered')::int AS household_reported_receipts,
          COUNT(DISTINCT CASE WHEN o.status='delivered' THEN f.state END)::int AS source_states_with_receipts,
          COUNT(DISTINCT CASE WHEN o.status='delivered' THEN o.destination_state END)::int AS destination_states_with_receipts
        FROM weave_food_direct_orders o
        JOIN weave_food_farmers f ON f.id=o.farmer_id
        WHERE o.created_at >= $1::timestamptz AND o.created_at <= $2::timestamptz
      `,[FLAME_EVENT.startsAt,FLAME_EVENT.endsAt]),
    ])
    return NextResponse.json({
      success:true,eventKey:FLAME_EVENT.key,
      offers:offers.rows.map(row=>({
        id:row.id,produce:row.produce,unit:row.unit,
        availableQuantity:Number(row.available_quantity),
        minimumQuantity:Number(row.minimum_quantity),
        unitPriceNgn:Number(row.unit_price_ngn),
        farmName:row.farm_name,originState:row.origin_state,community:row.community,
        carrierPath:`/carrier/food/${encodeURIComponent(String(row.referral_code))}`,
      })),
      corridors:corridors.rows.map(row=>({
        id:row.id,produce:row.produce,unit:row.unit,quantity:Number(row.quantity),
        originState:row.origin_state,destinationState:row.destination_state,
        status:row.status,updatedAt:row.updated_at,
        carrierPath:`/carrier/food/${encodeURIComponent(String(row.referral_code))}`,
      })),
      totals:totals.rows[0]||{
        awaiting_agreement:0,accepted_quotes:0,farmer_reported_dispatches:0,
        household_reported_receipts:0,source_states_with_receipts:0,destination_states_with_receipts:0,
      },
      notes:{
        inventory:'Farm stock quantities are reported by approved Agent farmers.',
        delivery:'Delivered means a household acknowledged receipt. It does not independently prove physical delivery or payment.',
        attribution:'Every listed offer links to the owning Agent Carrier Door.',
      },
    },{headers:{'Cache-Control':'no-store'}})
  }catch(error){
    console.error('[Flame Event live food current]',error)
    return NextResponse.json({success:false,error:'Food current is not available'}, {status:500})
  }
}
