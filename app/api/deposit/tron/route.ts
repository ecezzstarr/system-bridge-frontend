import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

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

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO deposits (id, user_id, amount_trx, status, method, currency, receipt_data, created_at, updated_at)
      VALUES (gen_random_uuid(), ${user.id}::uuid, ${amount}, 'pending', 'tron', 'TRX', ${txHash || null}, NOW(), NOW())
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      message: 'Deposit submitted for verification. An admin will confirm and credit your wallet shortly.',
      depositId: result[0].id,
      txHash: txHash || null,
    })
  } catch (error: any) {
    console.error('TRON Deposit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
