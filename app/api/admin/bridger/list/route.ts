import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { ensureContinuanceTables } from '@/lib/bridger-subscription'

export async function GET(request: NextRequest) {
  try {
    await ensureContinuanceTables()
    
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'

    let query = sql`
      SELECT id, name, email, role, departmental_code, 
             subscription_status, subscription_expiry, is_subscription_exempt, subscription_last_paid_at
      FROM users 
      WHERE (role = 'bridger' OR departmental_code = 'HOPE')
    `

    if (filter === 'due') {
      query = sql`${query} AND subscription_status = 'due'`
    } else if (filter === 'suspended') {
      query = sql`${query} AND subscription_status = 'suspended'`
    }

    const bridgers = await query
    
    return NextResponse.json({
      success: true,
      bridgers
    })
  } catch (error) {
    console.error('Bridger list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
