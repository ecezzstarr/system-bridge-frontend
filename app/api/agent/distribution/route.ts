import { NextRequest, NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import { getAuthUser } from '@/lib/auth-api'
import { getPool, sql } from '@/lib/db'
import { ensureAgilitySchema } from '@/lib/agility'
import { ensureAgentDistributionSchema } from '@/lib/agent-distribution'
import { formatWeaveFoodCartonQuantity, isValidWeaveFoodCartonQuantity } from '@/lib/weave-food-economics'

async function prepareDistribution() {
  await ensureAgilitySchema()
  await ensureAgentDistributionSchema()
}

function isMissingCarrierSchema(error: unknown) {
  const code = String((error as { code?: string } | null)?.code || '')
  return code === '42P01' || code === '42703'
}

async function carrierReservationsForAgent(agentId: string) {
  try {
    const relation = await getPool().query(`SELECT to_regclass('public.carrier_food_orders') AS relation`)
    if (!relation.rows[0]?.relation) return new Map<string, number>()
    const result = await getPool().query(
      `SELECT stock_order_id,COALESCE(SUM(quantity_packages),0)::int AS reserved
       FROM carrier_food_orders
       WHERE agent_id=$1::uuid
         AND (
           status IN ('awaiting_payment_verification','requested')
           OR (status='awaiting_customer_payment' AND payment_expires_at>NOW())
         )
       GROUP BY stock_order_id`,
      [agentId]
    )
    return new Map(result.rows.map(row => [String(row.stock_order_id), Number(row.reserved || 0)]))
  } catch (error) {
    if (isMissingCarrierSchema(error)) return new Map<string, number>()
    throw error
  }
}

async function carrierReservedForOrder(db: PoolClient, orderId: string) {
  try {
    const relation = await db.query(`SELECT to_regclass('public.carrier_food_orders') AS relation`)
    if (!relation.rows[0]?.relation) return 0
    const result = await db.query(
      `SELECT COALESCE(SUM(quantity_packages),0)::int AS reserved
       FROM carrier_food_orders
       WHERE stock_order_id=$1::uuid
         AND (
           status IN ('awaiting_payment_verification','requested')
           OR (status='awaiting_customer_payment' AND payment_expires_at>NOW())
         )`,
      [orderId]
    )
    return Number(result.rows[0]?.reserved || 0)
  } catch (error) {
    if (isMissingCarrierSchema(error)) return 0
    throw error
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  try {
    await prepareDistribution()

    const [outlets, placements, stockBase, summaryRows, carrierReservations] = await Promise.all([
      sql`
        SELECT *
        FROM agent_distribution_outlets
        WHERE agent_id=${user.id}::uuid AND active=true
        ORDER BY created_at DESC
      `,
      sql`
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
      `,
      sql`
        SELECT
          s.*,
          COALESCE((SELECT SUM(a.quantity_packages) FROM agility_agent_sales a WHERE a.order_id=s.id),0)::int AS direct_sold_packages,
          COALESCE((SELECT SUM(p.package_count) FROM agility_outlet_placements p WHERE p.order_id=s.id),0)::int AS allocated_packages
        FROM agility_stock_orders s
        WHERE s.agent_id=${user.id}::uuid
          AND s.payment_status='paid'
          AND s.fulfillment_status='received'
        ORDER BY s.received_at DESC NULLS LAST, s.created_at DESC
      `,
      sql`
        SELECT
          COALESCE((SELECT SUM(package_count - packages_reported_sold) FROM agility_outlet_placements WHERE agent_id=${user.id}::uuid AND supply_mode='pay_after_sale' AND status<>'settled'),0)::int AS packages_still_with_outlets,
          COALESCE((SELECT SUM(agreed_amount_ngn - amount_collected_ngn) FROM agility_outlet_placements WHERE agent_id=${user.id}::uuid AND supply_mode='pay_after_sale' AND status<>'settled'),0)::numeric AS outstanding_ngn,
          COALESCE((SELECT SUM(amount_ngn) FROM agility_outlet_collections WHERE agent_id=${user.id}::uuid AND (collected_at AT TIME ZONE 'Africa/Lagos')::date=(NOW() AT TIME ZONE 'Africa/Lagos')::date),0)::numeric AS collected_today_ngn,
          COALESCE((SELECT COUNT(*) FROM agent_distribution_outlets WHERE agent_id=${user.id}::uuid AND active=true),0)::int AS outlet_count
      `,
      carrierReservationsForAgent(String(user.id)),
    ])

    const stock = stockBase.map(row => {
      const carrierReserved = Number(carrierReservations.get(String(row.id)) || 0)
      const available = Math.max(
        0,
        Number(row.package_count || 0)
          - Number(row.direct_sold_packages || 0)
          - Number(row.allocated_packages || 0)
          - carrierReserved
      )
      return {
        ...row,
        carrier_reserved_packages: carrierReserved,
        available_packages: available,
      }
    })

    const summaryBase = summaryRows[0] || {}
    const carrierReservedPackages = Array.from(carrierReservations.values()).reduce((sum, value) => sum + Number(value || 0), 0)
    const summary = { ...summaryBase, carrier_reserved_packages: carrierReservedPackages }

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

  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '').trim()

  try {
    await prepareDistribution()
  } catch (error) {
    console.error('[agent/distribution] schema preparation failed', error)
    return NextResponse.json({ success: false, error: 'Agent distribution is temporarily unavailable while company stock tables are being prepared' }, { status: 503 })
  }

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

    if (!outletId || !orderId || !isValidWeaveFoodCartonQuantity(cartonCount)) {
      return NextResponse.json({ success: false, error: 'Choose an outlet and supply ½ carton or more in ½-carton steps' }, { status: 400 })
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

      const [soldResult, allocatedResult, carrierReserved] = await Promise.all([
        db.query(
          `SELECT COALESCE(SUM(quantity_packages),0)::int AS sold FROM agility_agent_sales WHERE order_id=$1::uuid`,
          [orderId]
        ),
        db.query(
          `SELECT COALESCE(SUM(package_count),0)::int AS allocated FROM agility_outlet_placements WHERE order_id=$1::uuid`,
          [orderId]
        ),
        carrierReservedForOrder(db, orderId),
      ])

      const packagesPerBox = Number(order.packages_per_box || 0)
      const packageCount = cartonCount * packagesPerBox
      if (!Number.isInteger(packageCount) || packageCount < 1) {
        await db.query('ROLLBACK')
        return NextResponse.json({ success: false, error: 'This carton quantity does not form a whole number of packages' }, { status: 400 })
      }

      const available = Number(order.package_count)
        - Number(soldResult.rows[0]?.sold || 0)
        - Number(allocatedResult.rows[0]?.allocated || 0)
        - Number(carrierReserved || 0)

      if (packageCount > available) {
        await db.query('ROLLBACK')
        const freeHalfStep = Math.floor((Math.max(0, available) / Math.max(1, packagesPerBox)) * 2) / 2
        return NextResponse.json({
          success: false,
          error: `${formatWeaveFoodCartonQuantity(freeHalfStep)} remains free for outlet supply. Carrier reservations and earlier outlet placements cannot be supplied again.`,
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
