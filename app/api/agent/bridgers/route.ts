import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// GET - Fetch bridgers assigned to a specific agent
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ success: false, error: 'Agent ID required' }, { status: 400 })
    }

    // Get bridgers assigned to this agent with their client count
    const bridgers = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.username,
        u.created_at,
        (SELECT COUNT(*) FROM clients c WHERE c.referred_by = u.id OR c.assigned_bridger_id = u.id) as client_count
      FROM users u
      WHERE u.assigned_agent_id = ${agentId}::uuid
      AND u.role = 'bridger'
      ORDER BY u.name ASC
      LIMIT 3
    `

    return NextResponse.json({
      success: true,
      bridgers: (bridgers || []).map(b => ({
        id: b.id,
        name: b.name || b.username || 'Bridger',
        email: b.email,
        clientCount: parseInt(b.client_count) || 0,
        earnings: 0,
        balance: 0,
      })),
      count: (bridgers || []).length,
      maxAllowed: 3
    })

  } catch (error) {
    console.error('Error fetching agent bridgers:', error)
    return NextResponse.json({ 
      success: false, 
      bridgers: [],
      error: String(error)
    }, { status: 500 })
  }
}
