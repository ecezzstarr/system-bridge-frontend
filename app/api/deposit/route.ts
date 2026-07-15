import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWalletBalance } from '@/lib/tron-wallet'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })
    }

    const companyWallet = process.env.COMPANY_TRON_WALLET

    if (!companyWallet) {
      return NextResponse.json({ error: 'Company wallet not configured' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      depositAddress: companyWallet,
      amount: amount,
      currency: 'TRX',
      message: 'Send TRX to this address to deposit',
      note: 'Your wallet will be credited within 2 minutes of confirmed transaction'
    })
  } catch (error: any) {
    console.error('Deposit init error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    const userWallet = user.tron_wallet_address

    if (!userWallet) {
      return NextResponse.json({ error: 'User wallet not configured' }, { status: 400 })
    }

    const balance = await getWalletBalance(userWallet)

    return NextResponse.json({
      success: true,
      balance: balance.trx,
      currency: 'TRX',
      address: userWallet
    })
  } catch (error: any) {
    console.error('Deposit status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
