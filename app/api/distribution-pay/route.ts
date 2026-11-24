import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureDepartmentEntryTicketSchema } from '@/lib/department-entry-tickets'
import { distributionPayableSql, ensureDistributionEntryBonusSchema } from '@/lib/distribution-entry-bonuses'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !['agent','bridger'].includes(user.role)) {
    return NextResponse.json({ error:'Staff access required' }, { status:403,headers })
  }
  try {
    await ensureDepartmentEntryTicketSchema()
    await ensureDistributionEntryBonusSchema()
    const result = await getPool().query(`
      SELECT due.month_start::text AS month,due.kind,due.amount_kobo::text,p.reference,p.recorded_at
      FROM (${distributionPayableSql}) due
      LEFT JOIN weave_distribution_payments p USING(regional_manager_id,month_start,recipient_id,kind)
      WHERE due.recipient_id=$1::uuid
      ORDER BY due.month_start DESC,due.kind LIMIT 100
    `, [user.id])
    return NextResponse.json({ payments:result.rows }, { headers })
  } catch (error) {
    console.error('[distribution staff pay]',error)
    return NextResponse.json({ error:'Pay records unavailable' }, { status:503,headers })
  }
}
