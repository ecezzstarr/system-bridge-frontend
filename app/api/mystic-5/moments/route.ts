import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { listMystic5Moments } from '@/lib/mystic-5-moments'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawLimit = request.nextUrl.searchParams.get('limit')
    const rawAge = request.nextUrl.searchParams.get('ageAtMoment')
    const userDay = request.nextUrl.searchParams.get('userDay')

    const limit = rawLimit ? Number(rawLimit) : 50
    const ageAtMoment = rawAge === null || rawAge === '' ? null : Number(rawAge)

    const moments = await listMystic5Moments(user.id, {
      limit: Number.isFinite(limit) ? limit : 50,
      ageAtMoment,
      userDay,
    })

    return NextResponse.json({
      moments,
      filters: {
        ageAtMoment,
        userDay,
      },
      rule: 'These are preserved uses only. They are not read back into the current Mystic 5 moment unless the operator explicitly brings one forward.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read Mystic 5 moments.'
    const status = /ageAtMoment|userDay/.test(message) ? 400 : 500
    console.error('[mystic-5] moments error:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
