import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

// Real per-Bridger statistics for the authenticated Agent's own assigned Bridger.
// Deposit volume is raw Client activity, not a commission or earnings figure.
export async function GET(request: NextRequest) {
  const agent = await getAuthUser(request)
  if (!agent) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (agent.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent access required' }, { status: 403 })
  }

  try {
    const bridgerId = request.nextUrl.searchParams.get('bridgerId') || ''
    if (!isUuid(bridgerId)) {
      return NextResponse.json({ success: false, error: 'Valid Bridger required' }, { status: 400 })
    }

    const assigned = await sql`
      SELECT id
      FROM users
      WHERE id=${bridgerId}::uuid
        AND role='bridger'
        AND assigned_agent_id=${agent.id}::uuid
      LIMIT 1
    `
    if (!assigned[0]) {
      return NextResponse.json({ success: false, error: 'Bridger is not assigned to this Agent' }, { status: 403 })
    }

    const clientCountRows = await sql`
      SELECT COUNT(*) AS count
      FROM clients
      WHERE assigned_bridger_id=${bridgerId}::uuid
    `
    const clientCount = parseInt(clientCountRows[0]?.count || '0', 10) || 0

    const depositRows = await sql`
      SELECT le.currency, SUM(le.amount) AS total
      FROM ledger_entries le
      JOIN clients c ON c.id=le.user_id
      WHERE c.assigned_bridger_id=${bridgerId}::uuid
        AND le.entry_type='deposit'
      GROUP BY le.currency
    `

    const depositsByCurrency: Record<string, number> = {}
    for (const row of depositRows) {
      depositsByCurrency[row.currency] = parseFloat(row.total) || 0
    }

    return NextResponse.json(
      { success: true, clientCount, depositsByCurrency },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    console.error('Error fetching Bridger stats:', error)
    return NextResponse.json({ success: false, error: 'Unable to load Bridger statistics' }, { status: 500 })
  }
}
