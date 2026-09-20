import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import { sql } from '@/lib/db'
export async function GET(request: NextRequest) {
 const auth = await requireWorkshopAuthorization(request)
 if (!auth.authorized) return auth.response
 try {
  await ensureClientWorkshopSchema(sql)
  const reports = await sql`SELECT r.*,u.name AS client_name FROM bridge_ai_reports r LEFT JOIN users u ON u.id=r.client_id ORDER BY r.created_at DESC LIMIT 100`
  return NextResponse.json({reports},{headers:{'Cache-Control':'private, no-store'}})
 } catch { return NextResponse.json({error:'Unable to load Bridge AI reports'},{status:500}) }
}
