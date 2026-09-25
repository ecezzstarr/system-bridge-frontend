import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized', clients: [] }, { status: 401 })
  if (user.role !== 'bridger') return NextResponse.json({ success: false, error: 'Bridger access required', clients: [] }, { status: 403 })

  const pool = getPool()
  const client = await pool.connect()
  try {
    const result = await client.query(
      `SELECT id,name,email,whatsapp_number AS phone,business_name,created_at
       FROM users
       WHERE role='client' AND referred_by=$1::uuid
       UNION
       SELECT c.id,c.name,c.email,c.phone,c.business_name,c.created_at
       FROM clients c
       WHERE (c.referred_by=$1::uuid OR c.assigned_bridger_id=$1::uuid)
         AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id=c.id)
       ORDER BY created_at DESC`,
      [user.id]
    )

    return NextResponse.json({
      success: true,
      clients: result.rows.map((c: any) => ({
        id: c.id,
        name: c.name || 'Unnamed Client',
        email: c.email,
        phone: c.phone,
        business_name: c.business_name,
        created_at: c.created_at,
      })),
    })
  } catch (error) {
    console.error('Error fetching Bridger clients:', error)
    return NextResponse.json({ success: false, clients: [], error: 'Unable to load Clients' }, { status: 500 })
  } finally {
    client.release()
  }
}
