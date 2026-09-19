import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { getTrxNgnRate, trxToNgn, PLATFORM_FEE_PERCENT } from '@/lib/trx-rate'

export async function POST(request: NextRequest) {
  try {
    const authedUser = await getAuthUser(request)
    if (!authedUser) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    if (authedUser.role === 'client') {
      return NextResponse.json({ success: false, error: 'OPay withdrawal is reserved for admin, agent, and bridger accounts. Please use TRON withdrawal.' }, { status: 403 })
    }

    const { userId, amount, bankName, accountNumber, accountName } = await request.json()

    if (authedUser.id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    if (!userId || !amount || !bankName || !accountNumber || !accountName) {
      return NextResponse.json({ success: false, error: 'Missing required fields: amount, bankName, accountNumber, accountName' }, { status: 400 })
    }

    const amountTrx = Number(amount)
    if (amountTrx < 10) {
      return NextResponse.json({ success: false, error: 'Minimum withdrawal is 10 TRX' }, { status: 400 })
    }

    const wallets = await sql`
      SELECT id, balance_trx FROM wallets WHERE user_id = ${userId}::uuid
    `

    if (wallets.length === 0) {
      return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 })
    }

    const wallet = wallets[0]
    const currentBalance = parseFloat(wallet.balance_trx) || 0

    if (currentBalance < amountTrx) {
      return NextResponse.json({ success: false, error: 'Insufficient balance' }, { status: 400 })
    }

    const { rate, source } = await getTrxNgnRate()
    const amountNgn = trxToNgn(amountTrx, rate)

    const reference = 'WD-OPAY-' + userId.substring(0, 8) + '-' + Date.now()
    const payoutDetails = JSON.stringify({ bankName, accountNumber, accountName })

    await sql`
      INSERT INTO withdrawal_requests (
        user_id, amount_trx, wallet_address, status, admin_note, method, payout_details, amount_ngn, created_at, updated_at
      )
      VALUES (
        ${userId}::uuid, ${amountTrx}, ${accountNumber}, 'pending', ${reference}, 'opay', ${payoutDetails}, ${amountNgn}, NOW(), NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted: ' + amountTrx + ' TRX approx NGN ' + amountNgn.toLocaleString() + ' via OPay',
      reference,
      rateUsed: rate,
      rateSource: source,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      amountNgn,
    })
  } catch (error: any) {
    console.error('OPay Withdrawal error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Withdrawal failed',
    }, { status: 500 })
  }
}
