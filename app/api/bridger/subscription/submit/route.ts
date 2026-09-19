import { NextRequest, NextResponse } from 'next/server'
import { submitContinuancePayment } from '@/lib/bridger-subscription'

export async function POST(request: NextRequest) {
  try {
    const { userId, amount, reference, paymentMethod } = await request.json()

    if (!userId || !amount || !reference || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const paymentId = await submitContinuancePayment(userId, amount, reference, paymentMethod)

    return NextResponse.json({
      success: !!paymentId,
      paymentId,
      message: paymentId ? 'Payment submitted, pending admin approval' : 'Submission failed'
    })
  } catch (error) {
    console.error('Continuance submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
