import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { createEchoIdentity, writeEchoActivity, hasActiveContinuance } from '@/lib/echo-db'

const ALLOWED_SOURCES = ['extension', 'ios', 'android', 'web'] as const

// POST body: { source, activityType, content?, metadata?, occurredAt }
// Called by the browser extension / mobile apps to write activity.
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Echo is free for every active WEAVE position. There is no
  // recurring subscription gate or separate Identity signup.
  const subscribed = await hasActiveContinuance(authUser.id)
  if (!subscribed) {
    return NextResponse.json({ error: 'An active WEAVE account is required' }, { status: 403 })
  }
  const identity = await createEchoIdentity(authUser.id)

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
