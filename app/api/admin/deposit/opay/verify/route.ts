import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getSql } from '@/lib/db'
import { notifyDepositDecision } from '@/lib/deposit-notifications'

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthUser(request)

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin only' },
        { status: 403 }
      )
    }

    const { depositId, status } = await request.json()

    if (!depositId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'depositId and a valid status (approved|rejected) are required' },
        { status: 400 }
      )
    }

    const sql = getSql()

    const deposit = await sql`
      SELECT *
      FROM deposits
      WHERE id = ${depositId}::uuid
      AND status = 'pending'
    `

    if (!deposit[0]) {
      return NextResponse.json(
        { error: 'Deposit not found or already processed' },
        { status: 404 }
      )
    }

    if (status === 'rejected') {
      await sql`
        UPDATE deposits
        SET status = 'rejected',
            updated_at = NOW()
        WHERE id = ${depositId}::uuid
      `

      await notifyDepositDecision({
        userId: deposit[0].user_id,
        approved: false,
        rail: 'OPAY',
        depositId,
        amountLabel: `₦${Number(deposit[0].amount_usd || 0).toLocaleString()}`,
        adminId: admin.id,
      })

      return NextResponse.json({
        success: true,
        message: 'Deposit rejected'
      })
    }

    // status === 'approved'
    const flameCoinAmount = Number(deposit[0].amount_trx)

    await sql`
      UPDATE wallets
      SET balance_trx = balance_trx + ${flameCoinAmount},
          updated_at = NOW()
      WHERE user_id = ${deposit[0].user_id}::uuid
      AND is_primary = true
    `

    await sql`
      UPDATE deposits
      SET status = 'approved',
          updated_at = NOW()
      WHERE id = ${depositId}::uuid
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
        ${deposit[0].user_id}::uuid,
        'deposit',
        ${flameCoinAmount},
        'Flame Coin',
        'OPay Deposit Approved',
        ${JSON.stringify({
          deposit_id: depositId,
          approved_by: admin.id
        })}
      )
    `

    await notifyDepositDecision({
      userId: deposit[0].user_id,
      approved: true,
      rail: 'OPAY',
      depositId,
      amountLabel: `₦${Number(deposit[0].amount_usd || 0).toLocaleString()}`,
      creditedFlameCoin: flameCoinAmount,
      adminId: admin.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Flame Coin credited successfully'
    })

  } catch (error: any) {
    console.error('OPay approval error:', error)

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
