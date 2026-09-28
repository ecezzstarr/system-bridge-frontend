import { NextRequest, NextResponse } from 'next/server'
import { runDevelopmentAgentPulse } from '@/lib/weave-development-agents'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(request: NextRequest) {
  const supplied = request.headers.get('x-cron-secret') || request.headers.get('x-weave-development-agent-secret')
  const expected = [process.env.CRON_SECRET, process.env.WEAVE_DEVELOPMENT_AGENT_SECRET].filter(Boolean)
  return Boolean(supplied && expected.some(secret => supplied === secret))
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runDevelopmentAgentPulse({ maxAgents: 1 })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error: any) {
    console.error('[Development Foundry cron]', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Development Foundry pulse failed',
    }, { status: 500 })
  }
}
