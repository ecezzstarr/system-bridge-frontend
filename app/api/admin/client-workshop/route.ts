import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const { clientId, agentId, active = true } = await request.json()
    if (!clientId || !agentId) return NextResponse.json({ error: 'clientId and agentId are required' }, { status: 400 })
    const sql = neon(process.env.DATABASE_URL!)
    await ensureClientWorkshopSchema(sql)
    const [workshop] = await sql`SELECT id FROM client_system_workshops WHERE client_id=${clientId}::uuid LIMIT 1`
    if (!workshop) return NextResponse.json({ error: 'Client workshop not found' }, { status: 404 })
    const [agent] = await sql`SELECT id, name FROM users WHERE id=${agentId}::uuid AND role='agent' LIMIT 1`
    if (!agent) return NextResponse.json({ error: 'Approved participant must be an Agent' }, { status: 400 })
    await sql`
      INSERT INTO client_workshop_agents (workshop_id, agent_id, approved_by, active)
      VALUES (${workshop.id}::uuid, ${agentId}::uuid, ${auth.session.user.id}::uuid, ${Boolean(active)})
      ON CONFLICT (workshop_id, agent_id) DO UPDATE SET active=EXCLUDED.active, approved_by=EXCLUDED.approved_by, approved_at=NOW()
    `
    return NextResponse.json({ success: true, agent })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to update workshop support' }, { status: 500 })
  }
}
