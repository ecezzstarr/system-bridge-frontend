import { NextRequest, NextResponse } from 'next/server'
import { getAllAgentSalaries, creditAgentSalary } from '@/lib/agent-salary'

/**
 * Legacy monthly Agent Yield processor.
 * This is not part of the Agent Commission surface and must never be public.
 */
export async function GET(request: NextRequest) {
  const supplied = request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || supplied !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const agents = await getAllAgentSalaries()

    for (const agent of agents) {
      if (agent.yieldNgn > 0) {
        await creditAgentSalary(agent.agentId, agent.yieldNgn)
      }
    }

    return NextResponse.json({ success: true, processedCount: agents.length })
  } catch (error) {
    console.error('Agent yield cron failed:', error)
    return NextResponse.json({ success: false, error: 'Agent yield processing failed' }, { status: 500 })
  }
}
