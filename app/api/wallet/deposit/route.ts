import { NextRequest, NextResponse } from 'next/server'
import { depositToPlatformWallet, getUserById } from '@/lib/mock-db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, amount } = body

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid userId or amount' },
        { status: 400 }
      )
    }

    const success = depositToPlatformWallet(userId, amount)
    if (!success) {
      return NextResponse.json(
        { error: 'Deposit failed' },
        { status: 400 }
      )
    }

    const user = getUserById(userId)
    return NextResponse.json({
      success: true,
      message: 'Deposit successful',
      platform_wallet_balance: user?.platform_wallet_balance || 0,
    })
  } catch (error) {
    console.error('[v0] Deposit error:', error)
    return NextResponse.json(
      { error: 'Deposit processing failed' },
      { status: 500 }
    )
  }
}
