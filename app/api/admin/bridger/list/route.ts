import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { ensureContinuanceTables } from '@/lib/bridger-subscription'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
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
    return NextResponse.json({ success: true, bridgers })
  } catch (error) {
    console.error('Bridger list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
