import { NextRequest, NextResponse } from 'next/server'
import { getBridgerSubscription, autoDeductContinuance } from '@/lib/bridger-subscription'
import { getAuthUser } from '@/lib/auth-api'

async function requireBridger(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'bridger') return { user: null, response: NextResponse.json({ error: 'Bridger access required' }, { status: 403 }) }
  return { user, response: null }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireBridger(request)
    if (!auth.user) return auth.response!
    const continuance = await getBridgerSubscription(auth.user.id)
    if (!continuance) return NextResponse.json({ error: 'Bridger record not found' }, { status: 404 })
    return NextResponse.json({ success: true, continuance, subscription: continuance })
  } catch (error) {
    console.error('[continuance GET] error:', error)
    return NextResponse.json({ error: 'Failed to load continuance' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBridger(request)
    if (!auth.user) return auth.response!
    const { action } = await request.json()
    if (action !== 'auto_deduct') return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    return NextResponse.json(await autoDeductContinuance(auth.user.id))
  } catch (error: any) {
    console.error('[continuance POST] error:', error)
    return NextResponse.json({ error: error.message || 'Continuance action failed' }, { status: 500 })
  }
}
