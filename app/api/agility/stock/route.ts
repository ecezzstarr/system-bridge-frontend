import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getApiUser } from '@/lib/api-auth'
import { AGILITY_PRICE_CEILING_NGN, AGILITY_VARIANTS, ensureAgilitySchema, getAgilityVariant } from '@/lib/agility'

export async function GET(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  try {
    await ensureAgilitySchema()
    const requests = await sql`
      SELECT id, variant_id, quantity, unit_price_ngn, total_ngn, status, agent_note, admin_note, created_at, updated_at
      FROM agility_stock_requests
      WHERE agent_id = ${user.id}::uuid
      ORDER BY created_at DESC
      LIMIT 50
    `

    return NextResponse.json({
      success: true,
      priceCeilingNgn: AGILITY_PRICE_CEILING_NGN,
      variants: AGILITY_VARIANTS,
      requests,
    })
  } catch (error) {
    console.error('[agility/stock] GET failed', error)
    return NextResponse.json({ success: false, error: 'Unable to load Agility stock requests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const variantId = String(body.variantId || '').trim()
    const quantity = Number(body.quantity)
    const agentNote = String(body.note || '').trim().slice(0, 500)
    const variant = getAgilityVariant(variantId)

    if (!variant) {
      return NextResponse.json({ success: false, error: 'Choose a valid Agility package' }, { status: 400 })
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
      return NextResponse.json({ success: false, error: 'Quantity must be between 1 and 500 boxes' }, { status: 400 })
    }
    if (variant.priceNgn >= AGILITY_PRICE_CEILING_NGN) {
      return NextResponse.json({ success: false, error: 'Agility package must remain below ₦3,000' }, { status: 409 })
    }

    await ensureAgilitySchema()
    const totalNgn = variant.priceNgn * quantity
    const [created] = await sql`
      INSERT INTO agility_stock_requests (
        agent_id, variant_id, quantity, unit_price_ngn, total_ngn, status, agent_note
      )
      VALUES (
        ${user.id}::uuid,
        ${variant.id},
        ${quantity},
        ${variant.priceNgn},
        ${totalNgn},
        'requested',
        ${agentNote || null}
      )
      RETURNING id, variant_id, quantity, unit_price_ngn, total_ngn, status, agent_note, admin_note, created_at, updated_at
    `

    return NextResponse.json({ success: true, request: created }, { status: 201 })
  } catch (error) {
    console.error('[agility/stock] POST failed', error)
    return NextResponse.json({ success: false, error: 'Unable to create Agility stock request' }, { status: 500 })
  }
}
