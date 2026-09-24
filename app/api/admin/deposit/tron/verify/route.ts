import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { creditAgentCommission } from '@/lib/agent-commission'
import { trxPaymentToFlameCoin } from '@/lib/trx-payment'
import { notifyDepositDecision } from '@/lib/deposit-notifications'

// Resolves the Bridger for a client, checking both the legacy users(role='client')
// path and the dedicated clients table — matches app/api/client/bridger/route.ts.
async function resolveBridgerForClient(clientId: string): Promise<string | null> {
  const users = await sql`
    SELECT referred_by FROM users WHERE id = ${clientId}::uuid AND role = 'client'
  `
  if (users.length > 0 && users[0].referred_by) return users[0].referred_by

  const clients = await sql`
    SELECT referred_by, assigned_bridger_id FROM clients WHERE id = ${clientId}::uuid
  `
  if (clients.length > 0) {
    return clients[0].assigned_bridger_id || clients[0].referred_by || null
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthUser(request)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { depositId, status } = await request.json()

    if (!depositId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'depositId and a valid status (approved|rejected) are required' },
        { status: 400 }
      )
    }

    const deposit = await sql`
      SELECT * FROM deposits
      WHERE id = ${depositId}::uuid AND method = 'tron' AND status = 'pending'
    `

    if (!deposit[0]) {
      return NextResponse.json({ error: 'Deposit not found or already processed' }, { status: 404 })
    }

    if (status === 'rejected') {
      await sql`
        UPDATE deposits
        SET status = 'rejected', verifier_id = ${admin.id}::uuid, verified_at = NOW(), updated_at = NOW()
        WHERE id = ${depositId}::uuid
      `
      await notifyDepositDecision({
        userId: deposit[0].user_id,
        approved: false,
        rail: 'TRX',
        depositId,
        amountLabel: `${Number(deposit[0].amount_trx).toLocaleString()} TRX`,
        adminId: admin.id,
      })
      return NextResponse.json({ success: true, message: 'TRON deposit rejected' })
    }

    const paidTrx = Number(deposit[0].amount_trx)
    const clientId = deposit[0].user_id
    const flameCoinAmount = trxPaymentToFlameCoin(paidTrx)

    if (!Number.isFinite(flameCoinAmount) || flameCoinAmount <= 0) {
      return NextResponse.json({ error: 'Unable to calculate Flame Coin value for this TRX payment' }, { status: 503 })
    }

    await sql`
      UPDATE wallets
      SET balance_trx = balance_trx + ${flameCoinAmount}, updated_at = NOW()
      WHERE user_id = ${clientId}::uuid AND is_primary = true
    `

    await sql`
      UPDATE deposits
      SET status = 'approved', verifier_id = ${admin.id}::uuid, verified_at = NOW(), updated_at = NOW()
      WHERE id = ${depositId}::uuid
    `

    await sql`
      INSERT INTO ledger_entries (user_id, entry_type, amount, currency, description, metadata)
      VALUES (
        ${clientId}::uuid,
        'deposit',
        ${flameCoinAmount},
        'Flame Coin',
        'Client TRX payment verified and credited as Flame Coin',
        ${JSON.stringify({
          deposit_id: depositId,
          approved_by: admin.id,
          funding_asset: 'TRX',
          paid_trx: paidTrx,
          peg: '1 Flame Coin = 1 TRX',
          credited_flame_coin: flameCoinAmount
        })}
      )
    `

    const bridgerId = await resolveBridgerForClient(clientId)
    if (bridgerId) {
      creditAgentCommission({
        bridgerId,
        activity: 'client_deposit',
        baseAmount: flameCoinAmount,
        description: `2% commission (5% of Weave's 40%): referred Bridger's client funded ${flameCoinAmount.toFixed(2)} Flame Coin from ${paidTrx.toFixed(6)} TRX`,
      }).catch(err => console.error('[tron verify] commission error:', err))
    }

    await notifyDepositDecision({
      userId: clientId,
      approved: true,
      rail: 'TRX',
      depositId,
      amountLabel: `${paidTrx.toLocaleString()} TRX`,
      creditedFlameCoin: flameCoinAmount,
      adminId: admin.id,
    })

    return NextResponse.json({ success: true, message: 'Flame Coin credited successfully', bridgerId, paidTrx, flameCoinAmount, peg: '1 Flame Coin = 1 TRX' })
  } catch (error: any) {
    console.error('TRON verify error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
