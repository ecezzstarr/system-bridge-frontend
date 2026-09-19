import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

// Browse published prospect packages - safe preview only, no contact details
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const packages = await sql`
      SELECT id, price_trx, title, description, created_at
      FROM market_prospect_packages
      WHERE status = 'published'
      ORDER BY created_at DESC
    `
    return NextResponse.json({ success: true, packages })
  } catch (error) {
    console.error('[Market Prospects Browse] Error:', error)
    return NextResponse.json({ error: 'Failed to load packages' }, { status: 500 })
  }
}
