import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { WORLD_RULES } from '@/lib/world/constants'
import { notifyDepositSubmitted } from '@/lib/deposit-notifications'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'client' && user.role !== 'admin') {
      return NextResponse.json({ error: 'TRON deposit is reserved for Clients. Please use OPay (NGN).' }, { status: 403 })
    }

    const body = await request.json()
    const { amount, txHash } = body

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })
    }

    if (!txHash || typeof txHash !== 'string' || !txHash.trim()) {
      return NextResponse.json({ error: 'TRX transaction hash is required for verification' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO deposits (id, user_id, amount_trx, status, method, currency, receipt_data, created_at, updated_at)
      VALUES (gen_random_uuid(), ${user.id}::uuid, ${Number(amount)}, 'pending', 'tron', 'TRX', ${txHash.trim()}, NOW(), NOW())
      RETURNING id
    `

    if (user.role !== 'admin') {
      await notifyDepositSubmitted({
        depositorId: user.id,
        depositorName: user.name || user.username || user.email,
        role: 'Client',
        depositId: result[0].id,
        rail: 'TRX',
        amountLabel: `${Number(amount).toLocaleString()} TRX`,
        secondaryLabel: `${Number(amount).toLocaleString()} Flame Coin after verification`,
        adminLink: '/admin/dashboard#payments',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'TRX payment submitted for verification. Administration will verify its value and credit the equivalent Flame Coin.',
      depositId: result[0].id,
      txHash: txHash.trim(),
      companyTrxWallet: WORLD_RULES.COMPANY_TRX_WALLET,
    })
  } catch (error: any) {
    console.error('TRON Deposit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
