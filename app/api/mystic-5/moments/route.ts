import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { listMystic5Moments } from '@/lib/mystic-5-moments'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawLimit = request.nextUrl.searchParams.get('limit')
    const limit = rawLimit ? Number(rawLimit) : 50
    const moments = await listMystic5Moments(user.id, Number.isFinite(limit) ? limit : 50)

    return NextResponse.json({
      moments,
      rule: 'Each row is one preserved Mystic 5 use. Older moments are not used to define the current user.',
    })
  } catch (error) {
    console.error('[mystic-5] moments error:', error)
    return NextResponse.json({ error: 'Unable to read Mystic 5 moments.' }, { status: 500 })
  }
}
