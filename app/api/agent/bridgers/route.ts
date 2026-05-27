import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// GET - Fetch bridgers assigned to a specific agent
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 })
    }

    const sql = getDb()

    // Get bridgers assigned to this agent with their client count
    const bridgers = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.username,
        u.created_at,
        u.platform_wallet_balance,
        (SELECT COUNT(*) FROM clients c WHERE c.bridger_id = u.id) as client_count,
        COALESCE(
          (SELECT SUM(amount) FROM ledger_entries le WHERE le.user_id = u.id AND le.entry_type IN ('commission', 'referral_bonus')),
          0
        ) as total_earnings
      FROM users u
      WHERE u.assigned_agent_id = ${agentId}::uuid
      AND u.role = 'bridger'
      ORDER BY u.name ASC
      LIMIT 3
    `

    return NextResponse.json({
      success: true,
      bridgers: bridgers.map(b => ({
        id: b.id,
        name: b.name || b.username || 'Bridger',
        email: b.email,
        clientCount: parseInt(b.client_count) || 0,
        earnings: parseFloat(b.total_earnings) || 0,
        balance: parseFloat(b.platform_wallet_balance) || 0,
      })),
      count: bridgers.length,
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
