import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const sql = neon(process.env.DATABASE_URL!)
    await ensureClientWorkshopSchema(sql)
    const reports = await sql`
      SELECT r.*, c.name AS client_name, c.email AS client_email
      FROM bridge_ai_reports r
      LEFT JOIN clients c ON c.id=r.client_id
      ORDER BY r.created_at DESC LIMIT 100
    `
    return NextResponse.json({ success: true, reports })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to load Bridge AI reports' }, { status: 500 })
  }
}
