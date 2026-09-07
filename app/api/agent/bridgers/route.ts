import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { getApiUser } from '@/lib/api-auth'

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

// GET - Fetch only the authenticated Agent's assigned Bridgers.
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (user.role !== 'agent') return NextResponse.json({ error: 'Agent access required' }, { status: 403 })

    const sql = getDb()
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
      WHERE u.assigned_agent_id = ${user.id}::uuid
        AND u.role = 'bridger'
        AND u.is_active = true
      ORDER BY u.name ASC
    `

    return NextResponse.json({
      success: true,
      bridgers: bridgers.map(b => ({
        id: b.id,
        name: b.name || b.username || 'Bridger',
        email: b.email,
        clientCount: Number(b.client_count) || 0,
        earnings: Number(b.total_earnings) || 0,
        balance: Number(b.platform_wallet_balance) || 0,
      })),
      count: bridgers.length,
      activeCount: bridgers.length,
      target: 6,
    })
  } catch (error) {
    console.error('Error fetching agent bridgers:', error)
    return NextResponse.json({ success: false, bridgers: [], error: 'Unable to load Bridgers' }, { status: 500 })
  }
}
