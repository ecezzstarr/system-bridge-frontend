import { NextRequest, NextResponse } from 'next/server'
import { getAgentSalaryTier } from '@/lib/agent-salary'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    if (!agentId) {
      return NextResponse.json({ success: false, error: 'Agent ID required' }, { status: 400 })
    }
    const result = await getAgentSalaryTier(agentId)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error fetching agent yield:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
