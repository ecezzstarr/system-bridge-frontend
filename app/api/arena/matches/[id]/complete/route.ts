import { NextResponse } from 'next/server'

// Arena settlement now has one authoritative path:
// PATCH /api/arena/matches/[id] with action="end".
// Keeping this route as an explicit tombstone prevents an older client from
// accidentally invoking a second payout algorithm.
export async function POST() {
  return NextResponse.json(
    { error: 'This settlement endpoint has been retired. Use the Arena match control path.' },
    { status: 410 }
  )
}
