import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(
    {
      error: 'Arena participant joining has moved to live Ace streaming and audience predictions.',
      replacement: '/api/arena/matches/[id]/predict',
    },
    { status: 410 }
  )
}
