import { NextResponse } from 'next/server'
import { getTrxPaymentNgnRate } from '@/lib/trx-payment'
import { WORLD_RULES } from '@/lib/world/constants'

export async function GET() {
  const { rateNgnPerTrx, source } = await getTrxPaymentNgnRate()
  return NextResponse.json({
    success: true,
    fundingAsset: 'TRX',
    creditedAsset: 'Flame Coin',
    rateNgnPerTrx,
    flameCoinPerTrx: 1,
    source,
    companyTrxWallet: WORLD_RULES.COMPANY_TRX_WALLET,
  })
}
