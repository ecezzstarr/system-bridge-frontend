import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

    const { amount, address } = await request.json()
    const amountFlameCoin = Number(amount)
    if (!Number.isFinite(amountFlameCoin) || !address) {
      return NextResponse.json({ success: false, error: 'Amount and TRON address are required' }, { status: 400 })
    }
    if (amountFlameCoin < 10) {
      return NextResponse.json({ success: false, error: 'Minimum withdrawal is 10 Flame Coin' }, { status: 400 })
    }
    if (typeof address !== 'string' || !address.startsWith('T') || address.length !== 34) {
      return NextResponse.json({ success: false, error: 'Invalid TRON wallet address' }, { status: 400 })
    }

    const wallets = await sql`
      SELECT id,balance_trx FROM wallets WHERE user_id=${user.id}::uuid AND is_primary=true
    `
    const currentBalance = Number(wallets[0]?.balance_trx || 0)
    if (!wallets[0]) return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 })
    if (currentBalance < amountFlameCoin) {
      return NextResponse.json({ success: false, error: 'Insufficient Flame Coin balance' }, { status: 400 })
    }

    const pending = await sql`
      SELECT COALESCE(SUM(amount_trx),0)::numeric AS total
      FROM withdrawal_requests
      WHERE user_id=${user.id}::uuid AND status IN ('pending','approved')
    `
    const reserved = Number(pending[0]?.total || 0)
    if (currentBalance - reserved < amountFlameCoin) {
      return NextResponse.json({ success: false, error: 'Available balance is already reserved by pending withdrawals' }, { status: 409 })
    }

    const reference = `WD-${user.id.substring(0, 8)}-${Date.now()}`
    await sql`
      INSERT INTO withdrawal_requests
        (user_id,amount_trx,wallet_address,status,admin_note,created_at,updated_at)
      VALUES
        (${user.id}::uuid,${amountFlameCoin},${address},'pending',${reference},NOW(),NOW())
    `

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted',
      reference,
      availableBalance: currentBalance - reserved - amountFlameCoin,
    })
  } catch (error: any) {
    console.error('Withdrawal error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Withdrawal failed' }, { status: 500 })
  }
}
