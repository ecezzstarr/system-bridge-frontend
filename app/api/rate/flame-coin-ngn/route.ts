import { NextResponse } from 'next/server'
import { getTrxPaymentNgnRate } from '@/lib/trx-payment'
import { WORLD_RULES } from '@/lib/world/constants'

export async function GET() {
  const { rateNgnPerTrx, source } = await getTrxPaymentNgnRate()
  return NextResponse.json({
    rate: rateNgnPerTrx,
    source,
    currency: 'Flame Coin',
    peg: '1 Flame Coin = 1 TRX',
    platformFeePercent: WORLD_RULES.PLATFORM_FEE_PERCENT,
  })
}
