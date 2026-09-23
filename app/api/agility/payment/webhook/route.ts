import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAndCompleteAgilityPayment } from '@/lib/agility-payment'

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function POST(request: NextRequest) {
  const secretHash = process.env.FLW_SECRET_HASH
  if (!secretHash) {
    return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 503 })
  }

  const rawBody = await request.text()
  const legacySignature = request.headers.get('verif-hash') || ''
  const modernSignature = request.headers.get('flutterwave-signature') || ''
  const expectedModern = createHmac('sha256', secretHash).update(rawBody).digest('base64')

  const signatureValid =
    (legacySignature && safeEqual(legacySignature, secretHash)) ||
    (modernSignature && safeEqual(modernSignature, expectedModern))

  if (!signatureValid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data = payload?.data || {}
  const reference = String(data.tx_ref || data.reference || '')
  const transactionId = String(data.id || data.transaction_id || '')

  if (!reference.startsWith('AGILITY-')) {
    return NextResponse.json({ received: true })
  }
  if (!/^[0-9]+$/.test(transactionId)) {
    return NextResponse.json({ received: true })
  }

  const result = await verifyAndCompleteAgilityPayment({
    transactionId,
    reference,
  })

  if (!result.success && ['verification_failed', 'processing_failed'].includes(result.error)) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ received: true, processed: result.success })
}
