import { NextRequest, NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import { getAuthUser } from '@/lib/auth-api'
import { getPool, sql } from '@/lib/db'
import { ensureAgilitySchema } from '@/lib/agility'
import { ensureAgentDistributionSchema } from '@/lib/agent-distribution'
import { ensureCarrierFoodSchema } from '@/lib/carrier-food'

async function prepare() {
  await ensureAgilitySchema()
  await ensureAgentDistributionSchema()
  await ensureCarrierFoodSchema()
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  try {
    await prepare()

    const outlets = await sql`
      SELECT *
      FROM agent_distribution_outlets
      WHERE agent_id=${user.id}::uuid AND active=true
      ORDER BY created_at DESC
    `

    const placements = await sql`
      SELECT
        p.*,
        o.name AS outlet_name,
        o.address AS outlet_address,
        o.phone AS outlet_phone,
        s.packages_per_box,
        s.agent_unit_cost_ngn,
        s.retail_unit_price_ngn,
        (p.agreed_amount_ngn - p.amount_collected_ngn)::numeric AS outstanding_ngn,
        (p.package_count * s.agent_unit_cost_ngn)::numeric AS agent_cost_basis_ngn,
        (p.agreed_amount_ngn - (p.package_count * s.agent_unit_cost_ngn))::numeric AS expected_agent_margin_ngn,
        ((p.package_count * s.retail_unit_price_ngn) - p.agreed_amount_ngn)::numeric AS outlet_margin_at_weave_retail_ngn
      FROM agility_outlet_placements p
      JOIN agent_distribution_outlets o ON o.id=p.outlet_id
      JOIN agility_stock_orders s ON s.id=p.order_id
      WHERE p.agent_id=${user.id}::uuid
      ORDER BY p.supplied_at DESC
      LIMIT 200
    `

    const stock = await sql`
      SELECT
        s.*,
        COALESCE((SELECT SUM(a.quantity_packages) FROM agility_agent_sales a WHERE a.order_id=s.id),0)::int AS direct_sold_packages,
        COALESCE((SELECT SUM(p.package_count) FROM agility_outlet_placements p WHERE p.order_id=s.id),0)::int AS allocated_packages,
        COALESCE((SELECT SUM(c.quantity_packages) FROM carrier_food_orders c WHERE c.stock_order_id=s.id AND c.status='requested'),0)::int AS carrier_reserved_packages,
        GREATEST(
          0,
          s.package_count
          - COALESCE((SELECT SUM(a.quantity_packages) FROM agility_agent_sales a WHERE a.order_id=s.id),0)
          - COALESCE((SELECT SUM(p.package_count) FROM agility_outlet_placements p WHERE p.order_id=s.id),0)
          - COALESCE((SELECT SUM(c.quantity_packages) FROM carrier_food_orders c WHERE c.stock_order_id=s.id AND c.status='requested'),0)
        )::int AS available_packages
      FROM agility_stock_orders s
      WHERE s.agent_id=${user.id}::uuid
        AND s.payment_status='paid'
        AND s.fulfillment_status='received'
      ORDER BY s.received_at DESC NULLS LAST, s.created_at DESC
    `

    const [summary] = await sql`
      SELECT
        COALESCE((SELECT SUM(package_count - packages_reported_sold) FROM agility_outlet_placements WHERE agent_id=${user.id}::uuid AND supply_mode='pay_after_sale' AND status<>'settled'),0)::int AS packages_still_with_outlets,
        COALESCE((SELECT SUM(agreed_amount_ngn - amount_collected_ngn) FROM agility_outlet_placements WHERE agent_id=${user.id}::uuid AND supply_mode='pay_after_sale' AND status<>'settled'),0)::numeric AS outstanding_ngn,
        COALESCE((SELECT SUM(amount_ngn) FROM agility_outlet_collections WHERE agent_id=${user.id}::uuid AND (collected_at AT TIME ZONE 'Africa/Lagos')::date=(NOW() AT TIME ZONE 'Africa/Lagos')::date),0)::numeric AS collected_today_ngn,
        COALESCE((SELECT COUNT(*) FROM agent_distribution_outlets WHERE agent_id=${user.id}::uuid AND active=true),0)::int AS outlet_count,
        COALESCE((SELECT SUM(quantity_packages) FROM carrier_food_orders WHERE agent_id=${user.id}::uuid AND status='requested'),0)::int AS carrier_reserved_packages
    `

    return NextResponse.json({ success: true, outlets, placements, stock, summary })
  } catch (error) {
    console.error('[agent/distribution] GET failed', error)
    return NextResponse.json({ success: false, error: 'Unable to load Agent distribution movement' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  const body = await request.json()
  const action = String(body.action || '').trim()
  await prepare()

  if (action === 'create_outlet') {
    const name = String(body.name || '').trim().slice(0, 180)
    const contactName = String(body.contactName || '').trim().slice(0, 180)
    const phone = String(body.phone || '').trim().slice(0, 50)
    const address = String(body.address || '').trim().slice(0, 500)
    const notes = String(body.notes || '').trim().slice(0, 500)

    if (name.length < 2 || address.length < 3) {
      return NextResponse.json({ success: false, error: 'Outlet name and location are required' }, { status: 400 })
    }

    const [outlet] = await sql`
      INSERT INTO agent_distribution_outlets (agent_id,name,contact_name,phone,address,notes)
      VALUES (${user.id}::uuid,${name},${contactName || null},${phone || null},${address},${notes || null})
      RETURNING *
    `
    return NextResponse.json({ success: true, outlet }, { status: 201 })
  }

  if (action === 'place_stock') {
    const outletId = String(body.outletId || '').trim()
    const orderId = String(body.orderId || '').trim()
    const cartonCount = Number(body.cartonCount)
    const supplyMode = String(body.supplyMode || '').trim()
    const agreedAmountNgn = Number(body.agreedAmountNgn)
    const note = String(body.note || '').trim().slice(0, 500)

    if (!outletId || !orderId || !Number.isInteger(cartonCount) || cartonCount < 1 || cartonCount > 50) {
      return NextResponse.json({ success: false, error: 'Choose an outlet, stock order and valid carton quantity' }, { status: 400 })
    }
    if (!['paid_now','pay_after_sale'].includes(supplyMode)) {
      return NextResponse.json({ success: false, error: 'Choose Paid now or Pay after sale' }, { status: 400 })
    }
    if (!Number.isFinite(agreedAmountNgn) || agreedAmountNgn <= 0) {
      return NextResponse.json({ success: false, error: 'Enter the amount this outlet agrees to return to the Agent' }, { status: 400 })
    }

    let db: PoolClient | undefined
    try {
      db = await getPool().connect()
      await db.query('BEGIN')

      const outletResult = await db.query(
        `SELECT * FROM agent_distribution_outlets WHERE id=$1::uuid AND agent_id=$2::uuid AND active=true FOR UPDATE`,
        [outletId, user.id]
      )
      if (!outletResult.rows[0]) {
        await db.query('ROLLBACK')
        return NextResponse.json({ success: false, error: 'Outlet not found' }, { status: 404 })
      }

      const orderResult = await db.query(
        `SELECT * FROM agility_stock_orders
         WHERE id=$1::uuid AND agent_id=$2::uuid AND payment_status='paid' AND fulfillment_status='received'
         FOR UPDATE`,
        [orderId, user.id]
      )
      const order = orderResult.rows[0]
      if (!order) {
        await db.query('ROLLBACK')
        return NextResponse.json({ success: false, error: 'Only paid, received WEAVE stock can be supplied to an outlet' }, { status: 409 })
      }

      const soldResult = await db.query(
        `SELECT COALESCE(SUM(quantity_packages),0)::int AS sold FROM agility_agent_sales WHERE order_id=$1::uuid`,
        [orderId]
      )
      const allocatedResult = await db.query(
        `SELECT COALESCE(SUM(package_count),0)::int AS allocated FROM agility_outlet_placements WHERE order_id=$1::uuid`,
        [orderId]
      )
      const reservedResult = await db.query(
        `SELECT COALESCE(SUM(quantity_packages),0)::int AS reserved FROM carrier_food_orders WHERE stock_order_id=$1::uuid AND status='requested'`,
        [orderId]
      )
      const packageCount = cartonCount * Number(order.packages_per_box)
      const available = Number(order.package_count)
        - Number(soldResult.rows[0]?.sold || 0)
        - Number(allocatedResult.rows[0]?.allocated || 0)
        - Number(reservedResult.rows[0]?.reserved || 0)
      if (packageCount > available) {
        await db.query('ROLLBACK')
        return NextResponse.json({
          success: false,
          error: `Only ${Math.floor(Math.max(0, available) / Number(order.packages_per_box))} complete carton${Math.floor(Math.max(0, available) / Number(order.packages_per_box)) === 1 ? '' : 's'} remain free. Carrier customer orders are already reserved and cannot be placed with an outlet.`,
        }, { status: 409 })
      }

      const paidNow = supplyMode === 'paid_now'
      const placementResult = await db.query(
        `INSERT INTO agility_outlet_placements (
          agent_id,outlet_id,order_id,variant_id,carton_count,package_count,supply_mode,
          agreed_amount_ngn,packages_reported_sold,amount_collected_ngn,status,agent_note,settled_at
        ) VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,CASE WHEN $11='settled' THEN NOW() ELSE NULL END)
        RETURNING *`,
        [
          user.id,
          outletId,
          orderId,
          order.variant_id,
          cartonCount,
          packageCount,
          supplyMode,
          agreedAmountNgn,
          paidNow ? packageCount : 0,
          paidNow ? agreedAmountNgn : 0,
          paidNow ? 'settled' : 'with_outlet',
          note || null,
        ]
      )
      const placement = placementResult.rows[0]

      if (paidNow) {
        await db.query(
          `INSERT INTO agility_outlet_collections (placement_id,agent_id,amount_ngn,note)
           VALUES ($1::uuid,$2::uuid,$3,'Paid when cartons were supplied')`,
          [placement.id, user.id, agreedAmountNgn]
        )
      }

      await db.query('COMMIT')
      return NextResponse.json({ success: true, placement }, { status: 201 })
    } catch (error) {
      if (db) await db.query('ROLLBACK').catch(() => {})
      console.error('[agent/distribution] place stock failed', error)
      return NextResponse.json({ success: false, error: 'Unable to place stock with this outlet' }, { status: 500 })
    } finally {
      db?.release()
    }
  }

  if (action === 'report_sales') {
    const placementId = String(body.placementId || '').trim()
    const soldPackages = Number(body.soldPackages)
    if (!placementId || !Number.isInteger(soldPackages) || soldPackages < 1) {
      return NextResponse.json({ success: false, error: 'Enter the number of packs the outlet has sold' }, { status: 400 })
    }

    const [placement] = await sql`
      SELECT * FROM agility_outlet_placements
      WHERE id=${placementId}::uuid AND agent_id=${user.id}::uuid
      LIMIT 1
    `
    if (!placement || placement.supply_mode !== 'pay_after_sale') {
      return NextResponse.json({ success: false, error: 'Pay-after-sale placement required' }, { status: 404 })
    }
    const nextSold = Number(placement.packages_reported_sold) + soldPackages
    if (nextSold > Number(placement.package_count)) {
      return NextResponse.json({ success: false, error: 'Reported sales cannot exceed the stock placed at this outlet' }, { status: 409 })
    }
    const nextStatus = nextSold === Number(placement.package_count)
      ? (Number(placement.amount_collected_ngn) >= Number(placement.agreed_amount_ngn) ? 'settled' : 'sold_out_awaiting_settlement')
      : 'with_outlet'
    const [updated] = await sql`
      UPDATE agility_outlet_placements
      SET packages_reported_sold=${nextSold},status=${nextStatus},updated_at=NOW(),
          settled_at=CASE WHEN ${nextStatus}='settled' THEN COALESCE(settled_at,NOW()) ELSE settled_at END
      WHERE id=${placementId}::uuid AND agent_id=${user.id}::uuid
      RETURNING *
    `
    return NextResponse.json({ success: true, placement: updated })
  }

  if (action === 'record_collection') {
    const placementId = String(body.placementId || '').trim()
    const amountNgn = Number(body.amountNgn)
    const note = String(body.note || '').trim().slice(0, 300)
    if (!placementId || !Number.isFinite(amountNgn) || amountNgn <= 0) {
      return NextResponse.json({ success: false, error: 'Enter the amount collected from the outlet' }, { status: 400 })
    }

    let db: PoolClient | undefined
    try {
      db = await getPool().connect()
      await db.query('BEGIN')
      const result = await db.query(
        `SELECT * FROM agility_outlet_placements WHERE id=$1::uuid AND agent_id=$2::uuid FOR UPDATE`,
        [placementId, user.id]
      )
      const placement = result.rows[0]
      if (!placement || placement.supply_mode !== 'pay_after_sale') {
        await db.query('ROLLBACK')
        return NextResponse.json({ success: false, error: 'Pay-after-sale placement required' }, { status: 404 })
      }
      const outstanding = Number(placement.agreed_amount_ngn) - Number(placement.amount_collected_ngn)
      if (amountNgn > outstanding) {
        await db.query('ROLLBACK')
        return NextResponse.json({ success: false, error: `Only ₦${outstanding.toLocaleString()} remains outstanding` }, { status: 409 })
      }
      const nextCollected = Number(placement.amount_collected_ngn) + amountNgn
      const settled = nextCollected >= Number(placement.agreed_amount_ngn)
      const soldOut = Number(placement.packages_reported_sold) >= Number(placement.package_count)
      const nextStatus = settled ? 'settled' : soldOut ? 'sold_out_awaiting_settlement' : 'with_outlet'

      await db.query(
        `INSERT INTO agility_outlet_collections (placement_id,agent_id,amount_ngn,note)
         VALUES ($1::uuid,$2::uuid,$3,$4)`,
        [placementId, user.id, amountNgn, note || null]
      )
      const updatedResult = await db.query(
        `UPDATE agility_outlet_placements
         SET amount_collected_ngn=$1,status=$2,updated_at=NOW(),
             settled_at=CASE WHEN $2='settled' THEN COALESCE(settled_at,NOW()) ELSE settled_at END
         WHERE id=$3::uuid AND agent_id=$4::uuid
         RETURNING *`,
        [nextCollected, nextStatus, placementId, user.id]
      )
      await db.query('COMMIT')
      return NextResponse.json({ success: true, placement: updatedResult.rows[0] })
    } catch (error) {
      if (db) await db.query('ROLLBACK').catch(() => {})
      console.error('[agent/distribution] collection failed', error)
      return NextResponse.json({ success: false, error: 'Unable to record outlet collection' }, { status: 500 })
    } finally {
      db?.release()
    }
  }

  return NextResponse.json({ success: false, error: 'Unknown distribution action' }, { status: 400 })
}
