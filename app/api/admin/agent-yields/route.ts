import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { getAllAgentSalaries } from '@/lib/agent-salary'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (user.role !== 'admin') return NextResponse.json({ success:false, error:'Administration access required' }, { status:403 })

  try {
    const agents = await getAllAgentSalaries()
    const ids = agents.map(agent => agent.agentId)

    const ledger = ids.length === 0 ? [] : await sql`
      SELECT user_id, amount, description, created_at
      FROM ledger_entries
      WHERE user_id = ANY(${ids}::uuid[])
        AND entry_type = 'agent_commission'
      ORDER BY created_at DESC
      LIMIT 100
    `

    const recentByAgent = new Map<string, any[]>()
    for (const row of ledger as any[]) {
      const key = String(row.user_id)
      const list = recentByAgent.get(key) || []
      if (list.length < 5) {
        list.push({
          amount: Number(row.amount || 0),
          description: row.description || '',
          createdAt: row.created_at,
        })
        recentByAgent.set(key, list)
      }
    }

    return NextResponse.json({
      success:true,
      agents: agents.map(agent => ({
        ...agent,
        recentCommissions: recentByAgent.get(String(agent.agentId)) || [],
      })),
      settlement: {
        state: 'administration_required',
        detail: 'Yield recognition does not by itself credit an external or cross-currency wallet. Settlement remains an Administration-controlled financial step.',
      },
    })
  } catch (error) {
    console.error('[admin agent yields] error:', error)
    return NextResponse.json({ success:false, error:'Unable to load Agent yield state' }, { status:500 })
  }
}
