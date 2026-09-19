import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getBridgeAiContinuance, subscribeToBridgeAi } from '@/lib/bridge-ai-subscription'

// GET: current subscription status
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const subscription = await getBridgeAiContinuance(authUser.id)
  return NextResponse.json({ subscription })
}

// POST: subscribe / renew (15 TRX/month, deducted from primary wallet)
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (authUser.role !== 'bridger' && authUser.role !== 'admin') {
    return NextResponse.json({ error: 'Bridger only' }, { status: 403 })
  }

  const result = await subscribeToBridgeAi(authUser.id)
  if (!result.success) {
    const status = result.reason === 'insufficient_balance' ? 402 : 500
    return NextResponse.json(result, { status })
  }

  return NextResponse.json(result, { status: 201 })
}
