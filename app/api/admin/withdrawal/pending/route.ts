import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const withdrawals = await sql`
    SELECT w.*, u.name, u.email, u.role as user_role
    FROM withdrawal_requests w
    JOIN users u ON u.id = w.user_id
    WHERE w.status = 'pending'
    ORDER BY w.created_at DESC
  `
  return NextResponse.json(withdrawals)
}
