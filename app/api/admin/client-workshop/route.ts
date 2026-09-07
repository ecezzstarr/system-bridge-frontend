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
    const clients = await sql`
      SELECT c.id,c.name,c.email,c.file_number,w.id AS workshop_id,w.title,w.workshop_type,
             COALESCE((SELECT string_agg(u.name, ', ' ORDER BY u.name) FROM client_workshop_agents a JOIN users u ON u.id=a.agent_id WHERE a.workshop_id=w.id AND a.active=true),'') AS approved_agents
      FROM clients c LEFT JOIN client_system_workshops w ON w.client_id=c.id
      WHERE c.file_number IS NOT NULL ORDER BY c.created_at DESC LIMIT 100
    `
    const agents = await sql`SELECT id,name,username,email,departmental_code FROM users WHERE role='agent' ORDER BY name`
    return NextResponse.json({ success:true, clients, agents })
  } catch (error:any) {
    return NextResponse.json({ success:false,error:error.message || 'Unable to load Client workshops' }, {status:500})
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const { clientId, agentId, active=true } = await request.json()
    if (!clientId || !agentId) return NextResponse.json({error:'clientId and agentId are required'},{status:400})
    const sql = neon(process.env.DATABASE_URL!)
    await ensureClientWorkshopSchema(sql)
    const [workshop] = await sql`SELECT id FROM client_system_workshops WHERE client_id=${clientId}::uuid LIMIT 1`
    if (!workshop) return NextResponse.json({error:'Client workshop not found'},{status:404})
    const [agent] = await sql`SELECT id,name FROM users WHERE id=${agentId}::uuid AND role='agent' LIMIT 1`
    if (!agent) return NextResponse.json({error:'Approved participant must be an Agent'},{status:400})
    await sql`
      INSERT INTO client_workshop_agents(workshop_id,agent_id,approved_by,active)
      VALUES(${workshop.id}::uuid,${agentId}::uuid,${auth.session.user.id}::uuid,${Boolean(active)})
      ON CONFLICT(workshop_id,agent_id) DO UPDATE SET active=EXCLUDED.active,approved_by=EXCLUDED.approved_by,approved_at=NOW()
    `
    return NextResponse.json({success:true,agent})
  } catch(error:any) {
    return NextResponse.json({success:false,error:error.message || 'Failed to update workshop support'},{status:500})
  }
}
