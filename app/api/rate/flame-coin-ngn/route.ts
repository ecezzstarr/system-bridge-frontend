import { NextResponse } from 'next/server'
import { getTrxPaymentNgnRate } from '@/lib/trx-payment'
import { WORLD_RULES } from '@/lib/world/constants'

export async function GET() {
  const { rateNgnPerTrx, source } = await getTrxPaymentNgnRate()
  return NextResponse.json({
    rate: rateNgnPerTrx,
    source,
    currency: 'System Switch',
    legacyCurrencyCode: 'FLAME_COIN',
    peg: '1 System Switch = 1 TRX',
    platformFeePercent: WORLD_RULES.PLATFORM_FEE_PERCENT,
  })
}
