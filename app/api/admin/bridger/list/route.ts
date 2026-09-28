import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { ensureContinuanceTables } from '@/lib/bridger-subscription'
import { getAuthUser } from '@/lib/auth-api'
import { ensureBridgeAiContinuanceTable } from '@/lib/bridge-ai-subscription'

export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    await Promise.all([ensureContinuanceTables(), ensureBridgeAiContinuanceTable()])
    const filter = request.nextUrl.searchParams.get('filter') || 'all'
    const bridgers = filter === 'due'
      ? await sql`
          SELECT u.id,u.name,u.email,u.role,u.departmental_code,u.subscription_status,u.subscription_expiry,
                 u.is_subscription_exempt,u.subscription_last_paid_at,
                 CASE
                   WHEN bai.status='active' AND bai.expiry > NOW() THEN 'active'
                   WHEN bai.status='active' AND bai.expiry <= NOW() THEN 'expired'
                   ELSE COALESCE(bai.status,'inactive')
                 END AS bridge_ai_status,
                 bai.expiry AS bridge_ai_expiry,
                 bai.last_paid_at AS bridge_ai_last_paid_at
          FROM users u
          LEFT JOIN bridge_ai_subscriptions bai ON bai.user_id=u.id
          WHERE (u.role='bridger' OR u.departmental_code='HOPE') AND u.subscription_status='due'
          ORDER BY u.created_at DESC
        `
      : filter === 'suspended'
        ? await sql`
            SELECT u.id,u.name,u.email,u.role,u.departmental_code,u.subscription_status,u.subscription_expiry,
                   u.is_subscription_exempt,u.subscription_last_paid_at,
                   CASE
                     WHEN bai.status='active' AND bai.expiry > NOW() THEN 'active'
                     WHEN bai.status='active' AND bai.expiry <= NOW() THEN 'expired'
                     ELSE COALESCE(bai.status,'inactive')
                   END AS bridge_ai_status,
                   bai.expiry AS bridge_ai_expiry,
                   bai.last_paid_at AS bridge_ai_last_paid_at
            FROM users u
            LEFT JOIN bridge_ai_subscriptions bai ON bai.user_id=u.id
            WHERE (u.role='bridger' OR u.departmental_code='HOPE') AND u.subscription_status='suspended'
            ORDER BY u.created_at DESC
          `
        : await sql`
            SELECT u.id,u.name,u.email,u.role,u.departmental_code,u.subscription_status,u.subscription_expiry,
                   u.is_subscription_exempt,u.subscription_last_paid_at,
                   CASE
                     WHEN bai.status='active' AND bai.expiry > NOW() THEN 'active'
                     WHEN bai.status='active' AND bai.expiry <= NOW() THEN 'expired'
                     ELSE COALESCE(bai.status,'inactive')
                   END AS bridge_ai_status,
                   bai.expiry AS bridge_ai_expiry,
                   bai.last_paid_at AS bridge_ai_last_paid_at
            FROM users u
            LEFT JOIN bridge_ai_subscriptions bai ON bai.user_id=u.id
            WHERE u.role='bridger' OR u.departmental_code='HOPE'
            ORDER BY u.created_at DESC
          `

    const summary = bridgers.reduce((acc, bridger) => {
      acc.total += 1
      if (bridger.subscription_status === 'active' || bridger.is_subscription_exempt) acc.continuanceActive += 1
      if (bridger.subscription_status === 'due') acc.continuanceDue += 1
      if (bridger.subscription_status === 'suspended') acc.continuanceSuspended += 1
      if (bridger.bridge_ai_status === 'active') acc.bridgeAiActive += 1
      return acc
    }, { total: 0, continuanceActive: 0, continuanceDue: 0, continuanceSuspended: 0, bridgeAiActive: 0 })

    return NextResponse.json({ success: true, bridgers, summary }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Bridger list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
