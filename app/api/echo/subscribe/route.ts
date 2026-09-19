import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getEchoContinuance, subscribeToEcho, getEchoIdentity, createEchoIdentity } from '@/lib/echo-db'

// GET: current subscription status
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const subscription = await getEchoContinuance(authUser.id)
  return NextResponse.json({ subscription })
}

// POST: subscribe / renew (7 TRX/month, deducted from primary wallet).
// Also creates the Echo Identity on first successful subscribe.
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await subscribeToEcho(authUser.id)
  if (!result.success) {
    const status = result.reason === 'insufficient_balance' ? 402 : 500
    return NextResponse.json(result, { status })
  }

  let identity = await getEchoIdentity(authUser.id)
  if (!identity) {
    identity = await createEchoIdentity(authUser.id)
  }

  return NextResponse.json({ ...result, identity }, { status: 201 })
}
