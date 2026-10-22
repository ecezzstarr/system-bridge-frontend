import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureAgenticBridgerPurchaseTable } from '@/lib/agentic-bridger-purchase'

export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin) return NextResponse.json({error:'Unauthorized'},{status:401})
  if (admin.role !== 'admin') return NextResponse.json({error:'Forbidden'},{status:403})
  try {
    await ensureAgenticBridgerPurchaseTable()
    const result = await getPool().query(`
      SELECT u.id,u.name,u.email,u.role,u.departmental_code,
             'not_required'::text AS subscription_status,
             NULL::timestamptz AS subscription_expiry,
             true AS is_subscription_exempt,
             NULL::timestamptz AS subscription_last_paid_at,
             CASE WHEN EXISTS (SELECT 1 FROM bridge_ais b WHERE b.bridger_id=u.id)
               THEN 'templates_opened' ELSE 'per_template' END AS bridge_ai_status,
             NULL::timestamptz AS bridge_ai_expiry,
             NULL::timestamptz AS bridge_ai_last_paid_at,
             (p.user_id IS NOT NULL) AS agentic_bridger_owned,
             p.paid_at AS agentic_bridger_paid_at
      FROM users u
      LEFT JOIN bridger_agentic_purchases p ON p.user_id=u.id
      WHERE u.role='bridger' OR u.departmental_code='HOPE'
      ORDER BY u.created_at DESC
    `)
    const filter = request.nextUrl.searchParams.get('filter') || 'all'
    const all = result.rows
    const bridgers = filter==='due' ? all.filter((b:any)=>!b.agentic_bridger_owned)
      : filter==='suspended' ? [] : all
    const owned = all.filter((b:any)=>b.agentic_bridger_owned).length
    return NextResponse.json({
      success:true,bridgers,
      summary:{
        total:all.length,agenticOwned:owned,agenticNotOwned:all.length-owned,
        continuanceActive:owned,continuanceDue:all.length-owned,continuanceSuspended:0,
        bridgeAiActive:all.filter((b:any)=>b.bridge_ai_status==='templates_opened').length
      },
      membershipRule:'No Bridger subscription. Agentic-Bridger is a permanent 20 Flame Coin purchase.'
    },{headers:{'Cache-Control':'private, no-store'}})
  } catch (error) {
    console.error('[admin bridger list] error',error)
    return NextResponse.json({error:'Unable to load Bridgers'},{status:500})
  }
}
