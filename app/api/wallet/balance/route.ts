import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureClientMoneyEnvironment } from '@/lib/client-money-environment'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const clientMoney = user.role === 'client'
      ? await ensureClientMoneyEnvironment(sql, user.id)
      : null

    const wallets = await sql`
      SELECT balance_trx, balance_usdt, play_balance
      FROM wallets
      WHERE user_id = ${user.id}::uuid AND is_primary=true
      ORDER BY created_at ASC
      LIMIT 1
    `

    const wallet = wallets[0]
    if (!wallet) return NextResponse.json({
      success:false,error:'Your primary wallet record is unavailable. No zero balance was assumed.',
    },{status:409,headers:{'Cache-Control':'private, no-store'}})
    const actualBalance = Number(clientMoney?.mainWallet.flameCoin ?? wallet.balance_trx)
    if (!Number.isFinite(actualBalance)) {
      throw new Error('Primary wallet contains an invalid balance')
    }
    return NextResponse.json({
      success: true,
      // Backward-compatible field: this is the main operational wallet.
      flameCoinBalance: actualBalance,
      recordedAt:new Date().toISOString(),
      playFlameCoin: Number(wallet?.play_balance || 0),
      currency: 'System Switch',
      legacyCurrencyCode: 'FLAME_COIN',
      peg: '1 System Switch = 1 TRX',
      ...(clientMoney ? {
        clientMoney: {
          vault: clientMoney.vault,
          siblingsFundsWallet: clientMoney.siblingsFunds,
          mainClientWallet: clientMoney.mainWallet,
        }
      } : {}),
    },{headers:{'Cache-Control':'private, no-store, max-age=0',Vary:'Authorization'}})
  } catch (error) {
    console.error('Wallet balance error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch balance' }, { status: 500 })
  }
}
