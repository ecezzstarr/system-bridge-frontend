import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureAgilitySchema } from '@/lib/agility'

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const orderId = String(body.orderId || '').trim()
    const receipt = String(body.receipt || '').trim()

    if (!orderId || receipt.length < 5) {
      return NextResponse.json({
        success: false,
        error: 'Electrolyte order and OPay transaction reference / receipt are required',
      }, { status: 400 })
    }

    await ensureAgilitySchema()
    const normalizedReceipt = receipt.toLowerCase().replace(/\s+/g, ' ').trim()
    const proofHash = createHash('sha256').update(normalizedReceipt).digest('hex')

    const [duplicate] = await sql`
      SELECT id
      FROM agility_stock_orders
      WHERE opay_proof_hash=${proofHash}
        AND id<>${orderId}::uuid
      LIMIT 1
    `
    if (duplicate) {
      return NextResponse.json({ success: false, error: 'This OPay proof is already attached to another WEAVE food order' }, { status: 409 })
    }

    const [order] = await sql`
      SELECT id,payment_status,total_ngn,payment_reference,opay_account_number
      FROM agility_stock_orders
      WHERE id=${orderId}::uuid
        AND agent_id=${user.id}::uuid
        AND variant_id IN ('electrolyte','electrolyte-medium')
      LIMIT 1
    `
    if (!order) return NextResponse.json({ success: false, error: 'Electrolyte order not found' }, { status: 404 })
    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: false, error: 'This Electrolyte order is already paid' }, { status: 409 })
    }

    const [updated] = await sql`
      UPDATE agility_stock_orders
      SET
        opay_receipt_data=${receipt.slice(0, 2000)},
        opay_proof_hash=${proofHash},
        payment_status='proof_submitted',
        proof_submitted_at=NOW(),
        updated_at=NOW()
      WHERE id=${orderId}::uuid
        AND agent_id=${user.id}::uuid
        AND variant_id IN ('electrolyte','electrolyte-medium')
        AND payment_status<>'paid'
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      order: updated,
      message: 'Electrolyte payment proof sent. Administration will verify it before fresh preparation begins.',
    })
  } catch (error: any) {
    console.error('[electrolyte/opay/receipt] failed', error)
    if (error?.code === '23505') {
      return NextResponse.json({ success: false, error: 'This OPay proof is already attached to another WEAVE food order' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: 'Unable to submit Electrolyte OPay proof' }, { status: 500 })
  }
}
