import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureMarketTables } from '@/lib/market'

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'admin') {
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureMarketTables()
    const contacts = await sql`
      SELECT * FROM market_prospect_contacts
      WHERE status = 'available'
      ORDER BY created_at DESC
    `
    return NextResponse.json({ success: true, contacts })
  } catch (error) {
    console.error('[Market Prospects List Available] Error:', error)
    return NextResponse.json({ error: 'Failed to load contacts' }, { status: 500 })
  }
}
