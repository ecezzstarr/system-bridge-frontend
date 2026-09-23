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
    const body = await request.json()
    const orderId = String(body.orderId || '').trim()
    const receipt = String(body.receipt || '').trim()

    if (!orderId || receipt.length < 5) {
      return NextResponse.json({
        success: false,
        error: 'Order and OPay transaction reference / receipt are required',
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
      return NextResponse.json({
        success: false,
        error: 'This OPay proof is already attached to another Agility order',
      }, { status: 409 })
    }

    const [order] = await sql`
      SELECT id,payment_status,total_ngn,payment_reference,opay_account_number
      FROM agility_stock_orders
      WHERE id=${orderId}::uuid
        AND agent_id=${user.id}::uuid
      LIMIT 1
    `

    if (!order) {
      return NextResponse.json({ success: false, error: 'Agility order not found' }, { status: 404 })
    }
    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: false, error: 'This Agility order is already paid' }, { status: 409 })
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
        AND payment_status<>'paid'
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      order: updated,
      message: 'OPay proof submitted. Administration will verify the payment before preparation begins.',
    })
  } catch (error: any) {
    console.error('[agility/opay/receipt] failed', error)
    if (error?.code === '23505') {
      return NextResponse.json({
        success: false,
        error: 'This OPay proof is already attached to another Agility order',
      }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: 'Unable to submit OPay proof' }, { status: 500 })
  }
}
