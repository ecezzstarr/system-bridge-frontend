import { NextRequest, NextResponse } from 'next/server'
import { getAllAgentSalaries, creditAgentSalary } from '@/lib/agent-salary'

/**
 * Monthly cron job to process Agent Yields (Loop 1 closures)
 */
export async function GET(request: NextRequest) {
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
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
