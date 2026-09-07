import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { neon } from '@/lib/pg-neon'

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

    const sql = neon(process.env.DATABASE_URL!)
    const wallets = await sql`
      SELECT balance_trx, play_balance
      FROM wallets
      WHERE user_id = ${user.id}::uuid AND is_primary = true
      LIMIT 1
    `
    return NextResponse.json({
      success: true,
      coreTrx: wallets.length ? Number(wallets[0].balance_trx) || 0 : 0,
      playTrx: wallets.length ? Number(wallets[0].play_balance) || 0 : 0,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Wallet balance error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, error: 'Failed to fetch balance' }, { status: 500 })
  }
}
