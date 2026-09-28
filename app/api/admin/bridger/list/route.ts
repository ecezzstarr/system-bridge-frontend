import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { ensureContinuanceTables } from '@/lib/bridger-subscription'
import { getAuthUser } from '@/lib/auth-api'

export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    await ensureContinuanceTables()
    const filter = request.nextUrl.searchParams.get('filter') || 'all'
    const bridgers = filter === 'due'
      ? await sql`
          SELECT id,name,email,role,departmental_code,subscription_status,subscription_expiry,is_subscription_exempt,subscription_last_paid_at
          FROM users WHERE (role='bridger' OR departmental_code='HOPE') AND subscription_status='due'
          ORDER BY created_at DESC
        `
      : filter === 'suspended'
        ? await sql`
            SELECT id,name,email,role,departmental_code,subscription_status,subscription_expiry,is_subscription_exempt,subscription_last_paid_at
            FROM users WHERE (role='bridger' OR departmental_code='HOPE') AND subscription_status='suspended'
            ORDER BY created_at DESC
          `
        : await sql`
            SELECT id,name,email,role,departmental_code,subscription_status,subscription_expiry,is_subscription_exempt,subscription_last_paid_at
            FROM users WHERE role='bridger' OR departmental_code='HOPE'
            ORDER BY created_at DESC
          `
    return NextResponse.json({ success: true, bridgers }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Bridger list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
