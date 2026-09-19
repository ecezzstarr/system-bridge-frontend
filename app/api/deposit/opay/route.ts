import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getSql } from '@/lib/db'
import { getTrxNgnRate, ngnToTrx } from '@/lib/trx-rate'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
    const { rate, source: rateSource } = await getTrxNgnRate()
    const trxAmount = ngnToTrx(Number(amount), rate)

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
        ${trxAmount},
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
        ${trxAmount},
        'TRX',
        'Manual OPay NGN Deposit Pending Verification',
        ${JSON.stringify({
          deposit_id: result[0].id,
          payment_method: 'OPay',
          opay_number: '8136003459',
          ngn_amount: Number(amount),
          rate_used: rate,
          rate_source: rateSource,
          status: 'pending'
        })}
      )
    `

    return NextResponse.json({
      success: true,
      message: 'Send NGN to OPay 8136003459. Awaiting admin verification.',
      depositId: result[0].id,
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
