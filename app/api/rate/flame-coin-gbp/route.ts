import { NextResponse } from 'next/server'
import { getTrxGbpRate } from '@/lib/trx-payment'

export async function GET() {
  const { rateGbpPerTrx, source } = await getTrxGbpRate()
  return NextResponse.json({
    success: Boolean(rateGbpPerTrx),
    rateGbpPerFlameCoin: rateGbpPerTrx,
    flameCoinPerGbp: rateGbpPerTrx ? 1 / rateGbpPerTrx : null,
    source,
    peg: '1 Flame Coin = 1 TRX',
    note: 'GBP is the contract denomination. Flame Coin is shown as a live indicative equivalent and changes with TRX/GBP.',
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}
