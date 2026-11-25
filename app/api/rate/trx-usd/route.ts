import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd',
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) },
    )
    if (!response.ok) throw new Error('Quote unavailable')
    const rate = (await response.json())?.tron?.usd
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) throw new Error('Invalid quote')
    return NextResponse.json({ usdPerTrx: rate }, { headers: { 'Cache-Control': 'public, max-age=60' } })
  } catch {
    return NextResponse.json({ usdPerTrx: null }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
