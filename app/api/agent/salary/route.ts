import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getAgentSalaryTier } from '@/lib/agent-salary'

export async function GET(request: NextRequest) {
  const agent = await getAuthUser(request)
  if (!agent) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (agent.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent access required' }, { status: 403 })
  }

  try {
    const result = await getAgentSalaryTier(agent.id)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error fetching agent yield:', error)
    return NextResponse.json({ success: false, error: 'Unable to load Agent yield' }, { status: 500 })
  }
}
