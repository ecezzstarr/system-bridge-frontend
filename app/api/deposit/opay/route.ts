import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getSql } from '@/lib/db'
import { ngnToFlameCoin } from '@/lib/flame-coin'
import { getTrxPaymentNgnRate } from '@/lib/trx-payment'
import { WEAVE_OPAY_ACCOUNT_NUMBER } from '@/lib/opay-config'
import { notifyDepositSubmitted } from '@/lib/deposit-notifications'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!['admin', 'agent', 'bridger'].includes(user.role)) {
      return NextResponse.json(
        { error: 'OPay funding is available to Administration, Agents, and Bridgers. Clients fund Flame Coin through the Company TRX wallet.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { amount } = body

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    const sql = getSql()
    const { rateNgnPerTrx, source: rateSource } = await getTrxPaymentNgnRate()
    const flameCoinAmount = ngnToFlameCoin(Number(amount), rateNgnPerTrx)

    const result = await sql`
      INSERT INTO deposits (
        user_id,
        amount_usd,
        amount_trx,
        status
      )
      VALUES (
        ${user.id}::uuid,
        ${Number(amount)},
        ${flameCoinAmount},
        'pending'
      )
      RETURNING *
    `

    await sql`
      INSERT INTO ledger_entries (
        user_id,
        entry_type,
        amount,
        currency,
        description,
        metadata
      )
      VALUES (
        ${user.id}::uuid,
        'deposit',
        ${flameCoinAmount},
        'Flame Coin',
        'Manual OPay NGN Deposit Pending Flame Coin Verification',
        ${JSON.stringify({
          deposit_id: result[0].id,
          payment_method: 'OPay',
          opay_number: WEAVE_OPAY_ACCOUNT_NUMBER,
          ngn_amount: Number(amount),
          rate_used: rateNgnPerTrx,
          rate_source: rateSource,
          peg: '1 Flame Coin = 1 TRX',
          status: 'pending'
        })}
      )
    `

    if (user.role !== 'admin') {
      await notifyDepositSubmitted({
        depositorId: user.id,
        depositorName: user.name || user.username || user.email,
        role: user.role === 'bridger' ? 'Bridger' : 'Agent',
        depositId: result[0].id,
        rail: 'OPAY',
        amountLabel: `₦${Number(amount).toLocaleString()}`,
        secondaryLabel: `${flameCoinAmount.toLocaleString()} Flame Coin`,
        adminLink: '/admin/dashboard#payments',
      })
    }

    return NextResponse.json({
      success: true,
      message: `Send NGN to OPay ${WEAVE_OPAY_ACCOUNT_NUMBER}. Awaiting admin verification.`,
      depositId: result[0].id,
      deposit: result[0],
      opayAccountNumber: WEAVE_OPAY_ACCOUNT_NUMBER,
      status: 'pending'
    })

  } catch (error: any) {
    console.error('OPay Deposit Error:', error)

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
