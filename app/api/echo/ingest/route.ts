import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getEchoIdentity, writeEchoActivity, hasActiveContinuance } from '@/lib/echo-db'

const ALLOWED_SOURCES = ['extension', 'ios', 'android', 'web'] as const

// POST body: { source, activityType, content?, metadata?, occurredAt }
// Called by the browser extension / mobile apps to write activity.
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const identity = await getEchoIdentity(authUser.id)
  if (!identity) {
    return NextResponse.json({ error: 'No Echo Identity for this user' }, { status: 404 })
  }

  // Continuance ended -> data collection stops, checked live each write
  const subscribed = await hasActiveContinuance(authUser.id)
  if (!subscribed) {
    return NextResponse.json({ error: 'Echo is locked; subscription inactive' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const { source, activityType, content, metadata, occurredAt } = body

  if (!ALLOWED_SOURCES.includes(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }
  if (!activityType || typeof activityType !== 'string') {
    return NextResponse.json({ error: 'activityType is required' }, { status: 400 })
  }

  await writeEchoActivity(
    identity.id,
    source,
    activityType,
    content ?? null,
    metadata ?? {},
    occurredAt ?? new Date().toISOString()
  )

  return NextResponse.json({ ok: true }, { status: 201 })
}
