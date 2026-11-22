import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureClientMoneyEnvironment } from '@/lib/client-money-environment'
import { getLegacyUsdRate, legacyUnitsToUsd, PLATFORM_CURRENCY_CODE } from '@/lib/platform-currency'

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
    let entryLoan: { principalSystemSwitch: number; outstandingSystemSwitch: number; status: string } | null = null
    if (user.role === 'agent' || user.role === 'bridger') {
      // Optional loan history is separate from verified wallet funds and revenue.
      const relation = await sql`SELECT to_regclass('department_entry_loan_requests') AS name`
      if (relation[0]?.name) {
        const loans = await sql`
          SELECT approved_principal, status FROM department_entry_loan_requests
          WHERE registered_user_id=${user.id}::uuid
          ORDER BY registered_at DESC LIMIT 1
        `
        if (loans[0]) {
          const principal = Number(loans[0].approved_principal)
          entryLoan = {
            principalSystemSwitch: principal,
            outstandingSystemSwitch: Math.min(principal, Math.max(0, -actualBalance)),
            status: loans[0].status,
          }
        }
      }
    }
    const usdRate = await getLegacyUsdRate()
    const amountUsd = usdRate ? legacyUnitsToUsd(actualBalance, usdRate.usdPerSystemSwitch) : null
    return NextResponse.json({
      success: true,
      ...(entryLoan ? { entryLoan } : {}),
      // Backward-compatible field: this is the main operational wallet.
      flameCoinBalance: actualBalance,
      recordedAt:new Date().toISOString(),
      playFlameCoin: Number(wallet?.play_balance || 0),
      currency: 'System Switch', // Actual current spendable-account unit; never relabel as USD.
      platformCurrency: PLATFORM_CURRENCY_CODE,
      usdEquivalent: usdRate && amountUsd !== null ? {
        amountUsd, currency: PLATFORM_CURRENCY_CODE, estimateOnly: true,
        rateUsdPerSystemSwitch: usdRate.usdPerSystemSwitch,
        quotedAt: usdRate.checkedAt, source: usdRate.source,
      } : null,
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
