import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { selectMainWallet } from '@/lib/ledger'
import { ensureClientMoneyEnvironment } from '@/lib/client-money-environment'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const wallets: Array<{
      balance_trx: string | number | null
      balance_usdt: string | number | null
      play_balance: string | number | null
      is_primary: boolean | null
    }> = await sql`
      SELECT balance_trx, balance_usdt, play_balance, is_primary
      FROM wallets
      WHERE user_id = ${user.id}::uuid
    `
    const {status, wallet, balance} = selectMainWallet(wallets)
    if (!wallet) return NextResponse.json({
      success: false,
      walletStatus: status,
      error: status === 'ambiguous'
        ? 'Administration must reconcile which wallet is primary.'
        : 'Your main wallet balance is unavailable.',
    }, {status: status === 'unavailable' ? 503 : 409, headers: {'Cache-Control': 'private, no-store'}})
    const clientMoney = user.role === 'client'
      ? await ensureClientMoneyEnvironment(sql, user.id, {
          balance_trx: balance,
          balance_usdt: wallet.balance_usdt,
        })
      : null
    return NextResponse.json({
      success: true,
      // Backward-compatible field: this is the main operational wallet.
      flameCoinBalance: balance,
      walletStatus: status,
      recordedAt:new Date().toISOString(),
      playFlameCoin: Number(wallet?.play_balance || 0),
      currency: 'Flame Coin',
      peg: '1 Flame Coin = 1 TRX',
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
