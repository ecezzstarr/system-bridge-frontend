import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureMarketTables } from '@/lib/market'

// Despite the route name (kept for compatibility with the existing
// Fulfillment Agent frontend), this now returns the FULL funnel across
// every status — pending, sent, opened, responded, converted — since
// there's no more admin approval gate. The Bridger sends the first
// message themselves; this is a real-time read-only view of that funnel.
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'admin') {
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureMarketTables()
    const pending = await sql`
      SELECT o.*, c.phone, c.name as contact_name, u.name as bridger_name
      FROM market_prospect_outreach o
      JOIN market_prospect_contacts c ON o.contact_id = c.id
      JOIN users u ON o.bridger_id = u.id
      ORDER BY o.last_activity_at DESC
    `
    return NextResponse.json({ success: true, pending })
  } catch (error) {
    console.error('[Market Outreach Pending] Error:', error)
    return NextResponse.json({ error: 'Failed to load outreach funnel' }, { status: 500 })
  }
}
