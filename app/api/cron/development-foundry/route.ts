import { NextRequest, NextResponse } from 'next/server'
import { runDevelopmentAgentPulse } from '@/lib/weave-development-agents'
import { hasWeaveSchedulerAuthority } from '@/lib/weave-scheduler-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authorized = await hasWeaveSchedulerAuthority(request, {
    workflowPath: '.github/workflows/weave-development-foundry.yml',
    extraSecretNames: ['WEAVE_DEVELOPMENT_AGENT_SECRET'],
  })
  if (!authorized) {
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
