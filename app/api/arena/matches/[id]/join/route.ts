import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'Arena participant joining has moved to live Ace streaming and audience predictions.',
      replacement: '/api/arena/matches/[id]/predict',
    },
    { status: 410 }
  )
}
