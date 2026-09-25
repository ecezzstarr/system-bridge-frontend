import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Administration only' }, { status: 403 })
  }

  try {
    const deposits = await sql`
      SELECT
        d.id,
        d.user_id,
        d.amount_trx,
        d.currency,
        d.method,
        d.status,
        d.receipt_data,
        d.created_at,
        d.updated_at,
        u.name AS client_name,
        u.email AS client_email,
        u.file_number
      FROM deposits d
      JOIN users u ON u.id=d.user_id
      WHERE u.role='client'
        AND d.method='tron'
      ORDER BY
        CASE WHEN d.status='pending' THEN 0 ELSE 1 END,
        d.created_at DESC
      LIMIT 200
    `

    return NextResponse.json({
      success: true,
      pending: deposits.filter((row: any) => row.status === 'pending'),
      recent: deposits.filter((row: any) => row.status !== 'pending').slice(0, 100),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[admin/client-deposits]', error)
    return NextResponse.json({ error: 'Unable to load Client deposit requests' }, { status: 500 })
  }
}
