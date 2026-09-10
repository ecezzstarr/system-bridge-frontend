import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { getApiUser } from '@/lib/api-auth'

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

// GET - Fetch only clients belonging to the authenticated Bridger.
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if (user.role !== 'bridger') return NextResponse.json({ error: 'Bridger access required' }, { status: 403 })

    const sql = getDb()
    const clients = await sql`
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.business_name,
        c.created_at
      FROM clients c
      WHERE c.referred_by = ${user.id}::uuid
         OR c.assigned_bridger_id = ${user.id}::uuid
      ORDER BY c.created_at DESC
    `

    return NextResponse.json({
      success: true,
      clients: clients.map(c => ({
        id: c.id,
        name: c.name || 'Unnamed Client',
        email: c.email,
        phone: c.phone,
        business_name: c.business_name,
        created_at: c.created_at,
      }))
    })
  } catch (error) {
    console.error('Error fetching bridger clients:', error)
    return NextResponse.json({ success: false, clients: [], error: 'Unable to load clients' }, { status: 500 })
  }
}
