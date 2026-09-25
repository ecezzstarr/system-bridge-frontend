import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const wallets = await sql`
      SELECT balance_trx, play_balance
      FROM wallets
      WHERE user_id = ${user.id}::uuid
      ORDER BY is_primary DESC NULLS LAST, created_at ASC
      LIMIT 1
    `

    const wallet = wallets[0]
    return NextResponse.json({
      success: true,
      flameCoinBalance: Number(wallet?.balance_trx || 0),
      playFlameCoin: Number(wallet?.play_balance || 0),
      currency: 'Flame Coin',
      peg: '1 Flame Coin = 1 TRX',
    })
  } catch (error) {
    console.error('Wallet balance error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch balance' }, { status: 500 })
  }
}
