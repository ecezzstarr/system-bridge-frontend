import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { flameCoinToNgn } from '@/lib/flame-coin'
import { getTrxPaymentNgnRate } from '@/lib/trx-payment'
import { WORLD_RULES } from '@/lib/world/constants'
import { issueWeaveReceipt } from '@/lib/weave-receipts'

export async function POST(request: NextRequest) {
  const authedUser = await getAuthUser(request)
  if (!authedUser) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }
  if (authedUser.role === 'client') {
    return NextResponse.json(
      { success: false, error: 'OPay withdrawal is reserved for admin, agent, and bridger accounts. This account is not enabled for OPay withdrawal.' },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const amountFlameCoin = Number(body.amount)
  const bankName = String(body.bankName || '').trim().slice(0, 120)
  const accountNumber = String(body.accountNumber || '').trim().slice(0, 40)
  const accountName = String(body.accountName || '').trim().slice(0, 160)

  if (!Number.isFinite(amountFlameCoin) || amountFlameCoin < 10 || !bankName || !accountNumber || !accountName) {
    return NextResponse.json(
      { success: false, error: 'Valid amount, bank name, account number, and account name are required. Minimum withdrawal is 10 Flame Coin.' },
      { status: 400 },
    )
  }

  let rate: number
  let source: string
  try {
    const quote = await getTrxPaymentNgnRate()
    rate = Number(quote.rateNgnPerTrx || 0)
    source = quote.source
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Withdrawal rate unavailable')
  } catch (error) {
    console.error('OPay withdrawal rate error:', error)
    return NextResponse.json({ success: false, error: 'Withdrawal conversion rate is temporarily unavailable' }, { status: 503 })
  }

  const grossNgn = flameCoinToNgn(amountFlameCoin, rate)
  const amountNgn = Math.round(grossNgn * (1 - WORLD_RULES.PLATFORM_FEE_PERCENT / 100) * 100) / 100
  const userId = authedUser.id
  const reference = 'WD-OPAY-' + userId.substring(0, 8) + '-' + Date.now()
  const payoutDetails = JSON.stringify({ bankName, accountNumber, accountName })

  const client = await getPool().connect()
  let availableAfter = 0
  try {
    await client.query('BEGIN')

    const walletResult = await client.query(
      `SELECT id,balance_trx
       FROM wallets
       WHERE user_id=$1::uuid AND is_primary=true
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [userId],
    )
    const wallet = walletResult.rows[0]
    if (!wallet) {
      await client.query('ROLLBACK')
      return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 })
    }

    const currentBalance = Number(wallet.balance_trx || 0)
    const pendingResult = await client.query(
      `SELECT COALESCE(SUM(amount_trx),0)::numeric AS total
       FROM withdrawal_requests
       WHERE user_id=$1::uuid AND status IN ('pending','approved')`,
      [userId],
    )
    const reserved = Number(pendingResult.rows[0]?.total || 0)
    const available = currentBalance - reserved

    if (available < amountFlameCoin) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        {
          success: false,
          error: 'Available balance is already reserved by pending withdrawals or is insufficient',
          balance: currentBalance,
          reserved,
          available,
          requested: amountFlameCoin,
        },
        { status: 409 },
      )
    }

    await client.query(
      `INSERT INTO withdrawal_requests
        (user_id,amount_trx,wallet_address,status,admin_note,method,payout_details,amount_ngn,created_at,updated_at)
       VALUES
        ($1::uuid,$2,$3,'pending',$4,'opay',$5,$6,NOW(),NOW())`,
      [userId, amountFlameCoin, accountNumber, reference, payoutDetails, amountNgn],
    )

    availableAfter = available - amountFlameCoin
    await client.query('COMMIT')
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('OPay withdrawal reservation error:', error)
    return NextResponse.json({ success: false, error: 'Withdrawal request could not be reserved' }, { status: 500 })
  } finally {
    client.release()
  }

  let receipt = null
  try {
    receipt = await issueWeaveReceipt({
      userId,
      kind: 'withdrawal',
      source: 'wallet_opay_withdrawal',
      sourceId: reference,
      amount: amountFlameCoin,
      currency: 'Flame Coin',
      status: 'pending',
      description: 'OPay withdrawal request',
      metadata: {
        bankName,
        accountNumber,
        accountName,
        amountNgn,
        rateUsed: rate,
        platformFeePercent: WORLD_RULES.PLATFORM_FEE_PERCENT,
      },
    })
  } catch (error) {
    console.error('OPay withdrawal receipt error:', error)
  }

  return NextResponse.json({
    success: true,
    message: 'Withdrawal request submitted: ' + amountFlameCoin + ' Flame Coin approx NGN ' + amountNgn.toLocaleString() + ' via OPay',
    reference,
    receipt,
    rateUsed: rate,
    rateSource: source,
    platformFeePercent: WORLD_RULES.PLATFORM_FEE_PERCENT,
    amountNgn,
    availableBalance: availableAfter,
  })
}
