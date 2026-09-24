import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { getFlameEvent, updateFlameEvent } from '@/lib/weave-event-store'
import type { WeaveEventStatus } from '@/lib/weave-event'

export const dynamic = 'force-dynamic'

const STATUSES = new Set<WeaveEventStatus>(['planned', 'active', 'closed'])

export async function GET() {
  try {
    const event = await getFlameEvent()
    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error('Flame event GET error:', error)
    return NextResponse.json({ success: false, error: 'Unable to load Flame Event' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Administration access required' }, { status: 403 })
    }

    const current = await getFlameEvent()
    const body = await request.json()

    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : current.title
    const subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim().slice(0, 320) : current.subtitle
    const announcement = typeof body.announcement === 'string' ? body.announcement.trim().slice(0, 2000) : current.announcement
    const status = STATUSES.has(body.status) ? body.status as WeaveEventStatus : current.status
    const startsAt = typeof body.startsAt === 'string' ? body.startsAt : current.startsAt
    const endsAt = typeof body.endsAt === 'string' ? body.endsAt : current.endsAt
    const adEnabled = typeof body.adEnabled === 'boolean' ? body.adEnabled : current.adEnabled
    const autoStart = typeof body.autoStart === 'boolean' ? body.autoStart : current.autoStart

    if (!title) return NextResponse.json({ success: false, error: 'Event title is required' }, { status: 400 })

    const start = new Date(startsAt)
    const end = new Date(endsAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ success: false, error: 'Start and end dates must be valid' }, { status: 400 })
    }
    if (end.getTime() <= start.getTime()) {
      return NextResponse.json({ success: false, error: 'Event end must be after the start' }, { status: 400 })
    }

    const event = await updateFlameEvent({
      title,
      subtitle,
      announcement,
      status,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      adEnabled,
      autoStart,
      updatedBy: user.id,
    })

    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error('Flame event PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Unable to update Flame Event' }, { status: 500 })
  }
}
