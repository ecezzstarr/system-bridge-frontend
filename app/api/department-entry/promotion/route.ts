import { NextResponse } from 'next/server'
import { getFlameEvent } from '@/lib/weave-event-store'
import { isFlameSaturdayFreeEntry, FLAME_SATURDAY_ENTRY_SCHEDULE } from '@/lib/flame-saturday-free-entry'

export const dynamic = 'force-dynamic'

/** Public read-only schedule. Eligibility is checked again by ticket issuance. */
export async function GET() {
  try {
    const event = await getFlameEvent()
    const active = event.effectiveStatus === 'active' && isFlameSaturdayFreeEntry()
    return NextResponse.json(
      { active, schedule: FLAME_SATURDAY_ENTRY_SCHEDULE },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[department-entry] free-entry promotion status unavailable', error)
    return NextResponse.json(
      { active: false, schedule: FLAME_SATURDAY_ENTRY_SCHEDULE },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
