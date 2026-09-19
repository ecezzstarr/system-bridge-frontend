import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  try {
    const deposits = await sql`
      SELECT d.*, u.name as user_name, u.email as user_email
      FROM deposits d
      JOIN users u ON u.id = d.user_id
      WHERE d.method = 'tron' AND d.status = 'pending'
      ORDER BY d.created_at ASC
    `
    return NextResponse.json({ success: true, deposits })
  } catch (error: any) {
    console.error('[TRON pending] error:', error)
    return NextResponse.json({ error: 'Failed to load pending TRON deposits' }, { status: 500 })
  }
}
