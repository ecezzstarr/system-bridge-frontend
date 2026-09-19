import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getEchoIdentity, createEchoIdentity, hasActiveContinuance } from '@/lib/echo-db'

// GET: current user's Echo Identity
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const identity = await getEchoIdentity(authUser.id)
  return NextResponse.json({ identity })
}

// POST: create Echo Identity. Only succeeds with an active subscription.
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscribed = await hasActiveContinuance(authUser.id)
  if (!subscribed) {
    return NextResponse.json(
      { error: 'Active subscription required to create an Echo Identity' },
      { status: 403 }
    )
  }

  const identity = await createEchoIdentity(authUser.id)
  return NextResponse.json({ identity }, { status: 201 })
}
