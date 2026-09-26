import { NextRequest, NextResponse } from 'next/server'
import { submitContinuancePayment } from '@/lib/bridger-subscription'
import { getAuthUser } from '@/lib/auth-api'
import { WORLD_RULES } from '@/lib/world/constants'
import { issueWeaveReceipt } from '@/lib/weave-receipts'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'bridger') return NextResponse.json({ error: 'Bridger access required' }, { status: 403 })

    const { reference, paymentMethod } = await request.json()
    if (!reference || !paymentMethod) {
      return NextResponse.json({ error: 'Payment reference and method are required' }, { status: 400 })
    }

    const paymentId = await submitContinuancePayment(
      user.id,
      WORLD_RULES.BRIDGER_CONTINUANCE_NGN,
      String(reference).trim().slice(0, 255),
      String(paymentMethod).trim().slice(0, 50)
    )
    const receipt = paymentId ? await issueWeaveReceipt({
      userId: user.id,
      kind: 'subscription',
      source: 'bridger_continuance',
      sourceId: String(paymentId),
      amount: WORLD_RULES.BRIDGER_CONTINUANCE_NGN,
      currency: 'NGN',
      status: 'pending',
      description: 'Bridger monthly continuance submitted for Administration approval',
      metadata: { paymentMethod, reference: String(reference).trim().slice(0, 255) },
    }) : null
    return NextResponse.json({
      success: Boolean(paymentId),
      paymentId,
      receipt,
      message: paymentId ? 'Payment submitted, pending Administration approval' : 'Submission failed',
    })
  } catch (error) {
    console.error('Continuance submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
