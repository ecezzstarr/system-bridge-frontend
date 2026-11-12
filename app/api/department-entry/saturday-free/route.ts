import { NextResponse } from 'next/server'
import { saturdayFreeEntryWindow } from '@/lib/saturday-free-entry'

export const dynamic = 'force-dynamic'

/** Public display hint only; the ticket issuer independently enforces eligibility. */
export async function GET() {
  const window = saturdayFreeEntryWindow()
  return NextResponse.json({
    active: window.active,
    closesAt: window.closesAt,
    timeZone: 'Africa/Lagos',
    schedule: 'Saturday 08:00–10:00 WAT during Burning River',
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
