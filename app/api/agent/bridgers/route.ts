import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const agent = await getAuthUser(request)
  if (!agent) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (agent.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent access required' }, { status: 403 })
  }

  try {
    const bridgers = await sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.username,
        u.created_at,
        u.subscription_status,
        (
          SELECT COUNT(*)
          FROM clients c
          WHERE c.referred_by = u.id OR c.assigned_bridger_id = u.id
        ) AS client_count
      FROM users u
      WHERE u.assigned_agent_id = ${agent.id}::uuid
        AND u.role = 'bridger'
      ORDER BY u.name ASC
      LIMIT 3
    `

    return NextResponse.json({
      success: true,
      bridgers: bridgers.map((bridger: any) => ({
        id: bridger.id,
        name: bridger.name || bridger.username || 'Bridger',
        email: bridger.email,
        subscriptionStatus: bridger.subscription_status || 'unknown',
        clientCount: Number(bridger.client_count || 0),
      })),
      count: bridgers.length,
      maxAllowed: 3,
    })
  } catch (error) {
    console.error('Error fetching Agent Bridgers:', error)
    return NextResponse.json(
      { success: false, bridgers: [], error: 'Unable to load Bridgers' },
      { status: 500 }
    )
  }
}
