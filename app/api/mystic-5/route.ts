import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { moveWithMystic5 } from '@/lib/mystic-5'
import { momentFieldsFromPresence, saveMystic5Moment } from '@/lib/mystic-5-moments'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

    const result = await moveWithMystic5(user, {
      source: 'weave',
      surface: typeof body.surface === 'string' ? body.surface : 'Weave',
      activity: typeof body.activity === 'string' ? body.activity : '',
      position: typeof body.position === 'string' ? body.position : null,
      context: typeof body.context === 'string' ? body.context : null,
      message: typeof body.message === 'string' ? body.message : '',
      ageAtMoment: body.ageAtMoment ?? null,
      userDay: typeof body.userDay === 'string' ? body.userDay : null,
    })

    const moment = await saveMystic5Moment({
      userId: user.id,
      ...momentFieldsFromPresence(result.presence),
      userMessage: typeof body.message === 'string' ? body.message : '',
      mysticReply: result.reply,
    })

    return NextResponse.json({
      ...result,
      moment: {
        id: moment.id,
        occurredAt: moment.occurred_at,
        ageAtMoment: moment.age_at_moment,
        userDay: moment.user_day,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mystic 5 could not enter this movement.'
    const status = /requires|Unsupported|ageAtMoment|userDay/.test(message) ? 400 : 500
    console.error('[mystic-5] movement error:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
