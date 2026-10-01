import { NextRequest, NextResponse } from 'next/server'

import { getPool } from '@/lib/db'
import { ensureEmailOutreachSchema, runAdminEmailOutreach } from '@/lib/email-outreach'
import { hasWeaveSchedulerAuthority } from '@/lib/weave-scheduler-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authorized = await hasWeaveSchedulerAuthority(request, {
    workflowPath: '.github/workflows/weave-email-outreach.yml',
  })
  if (!authorized) return NextResponse.json({ error: 'Unauthorized scheduler' }, { status: 401 })

  await ensureEmailOutreachSchema()
  const pool = getPool()
  const admins = await pool.query(
    `SELECT a.user_id
     FROM weave_email_outreach_automation a
     JOIN users u ON u.id=a.user_id
     WHERE a.enabled=true
       AND u.role='admin'
       AND u.is_active=true
     ORDER BY a.updated_at ASC`,
  )

  const results = []
  for (const row of admins.rows) {
    try {
      results.push({ userId: row.user_id, ...(await runAdminEmailOutreach(row.user_id)) })
    } catch (error: any) {
      results.push({ userId: row.user_id, error: String(error?.message || 'Email outreach failed') })
    }
  }

  return NextResponse.json({ success: true, admins: admins.rows.length, results })
}
