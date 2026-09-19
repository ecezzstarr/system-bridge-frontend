import { NextResponse } from 'next/server'
import { getTrxNgnRate, PLATFORM_FEE_PERCENT } from '@/lib/trx-rate'

// GET /api/rate/trx-ngn
// Returns the current TRX -> NGN rate (live from CoinGecko, cached 60s,
// falling back to a fixed rate if the upstream call fails) plus the
// platform's fee percentage, for display on the deposit/withdraw page.
export async function GET() {
  try {
    const { rate, source } = await getTrxNgnRate()

    return NextResponse.json({
      rate,
      source,
      platformFeePercent: PLATFORM_FEE_PERCENT,
    })
  } catch (error) {
    console.error('Rate endpoint error:', error)
    return NextResponse.json({ error: 'Failed to fetch TRX/NGN rate' }, { status: 500 })
  }
}
