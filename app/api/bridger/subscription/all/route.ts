import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getBridgerSubscribeAllQuote, subscribeAllBridgerEssentials } from '@/lib/bridger-subscribe-all'

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
    const quote = await getBridgerSubscribeAllQuote(auth.user.id)
    return NextResponse.json(quote, { status: quote.success ? 200 : 404 })
  } catch (error) {
    console.error('[bridger subscribe-all GET] error:', error)
    return NextResponse.json({ error: 'Unable to load Bridger subscription bundle' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBridger(request)
    if (!auth.user) return auth.response!
    const result = await subscribeAllBridgerEssentials(auth.user.id)
    if (!result.success) {
      const status = result.reason === 'insufficient_balance' ? 402
        : result.reason === 'bridger_not_found' ? 404
        : result.reason === 'rate_unavailable' ? 503
        : 500
      return NextResponse.json(result, { status })
    }
    return NextResponse.json(result, { status: result.renewed ? 201 : 200 })
  } catch (error) {
    console.error('[bridger subscribe-all POST] error:', error)
    return NextResponse.json({ error: 'Unable to renew Bridger subscriptions together' }, { status: 500 })
  }
}
