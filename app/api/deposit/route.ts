import { NextRequest, NextResponse } from 'next/server'
import { initializePayment, verifyPayment } from '@/lib/flutterwave'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Initialize a deposit
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, currency = 'USD' } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })
    }

    const user = session.user as any
    const baseUrl = process.env.NEXTAUTH_URL || 'https://ssbnow.online'

    const result = await initializePayment(
      amount,
      currency,
      user.email || '',
      user.name || 'User',
      user.id || 'unknown',
      `${baseUrl}/wallet?deposit=callback`
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        paymentLink: result.paymentLink,
        reference: result.reference,
      })
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Deposit init error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Verify a deposit (callback from Flutterwave)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get('transaction_id')

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    }

    const result = await verifyPayment(transactionId)

    if (result.success && result.status === 'successful') {
      // TODO: Credit user wallet with the deposited amount
      // This would be done via Eight or direct database update
      
      return NextResponse.json({
        success: true,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        message: 'Deposit verified successfully',
      })
    } else {
      return NextResponse.json({
        success: false,
        status: result.status,
        error: result.error || 'Payment not successful',
      })
    }
  } catch (error: any) {
    console.error('Deposit verify error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
