import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureRegionalManagerCommissionSchema } from '@/lib/regional-manager-commission'

export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Administration access required' }, { status: 403 })
  }
  await ensureRegionalManagerCommissionSchema()
  const [appointments, assignments] = await Promise.all([
    sql`
      SELECT rm.user_id, u.name, u.email, rm.source_role, rm.status, rm.appointed_at, rm.updated_at,
        COUNT(member.bridger_user_id)::int AS assigned_bridgers
      FROM weave_regional_manager_appointments rm
      JOIN users u ON u.id=rm.user_id
      LEFT JOIN weave_regional_manager_bridgers member
        ON member.regional_manager_user_id=rm.user_id AND member.status='active'
      GROUP BY rm.user_id,u.name,u.email,rm.source_role,rm.status,rm.appointed_at,rm.updated_at
      ORDER BY rm.appointed_at DESC
    `,
    sql`
      SELECT member.bridger_user_id, bridger.name AS bridger_name, bridger.email AS bridger_email,
        member.regional_manager_user_id, manager.name AS regional_manager_name,
        member.status, member.assigned_at
      FROM weave_regional_manager_bridgers member
      JOIN users bridger ON bridger.id=member.bridger_user_id
      JOIN users manager ON manager.id=member.regional_manager_user_id
      ORDER BY member.assigned_at DESC
    `,
  ])
  return NextResponse.json({ success: true, appointments, assignments })
}

export async function POST(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Administration access required' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const action = body?.action
  if (!['appoint', 'assign_bridger', 'end_appointment', 'unassign_bridger'].includes(action)) {
    return NextResponse.json({ error: 'Unsupported Regional Manager action' }, { status: 400 })
  }

  await ensureRegionalManagerCommissionSchema()
  if (action === 'appoint') {
    const userId = String(body?.userId || '')
    const [candidate] = await sql`
      SELECT id, role, is_active FROM users WHERE id=${userId}::uuid LIMIT 1
    `
    if (!candidate || !candidate.is_active || !['client', 'bridger', 'agent'].includes(String(candidate.role))) {
      return NextResponse.json({ error: 'Regional Managers must be active Clients, Bridgers, or Agents.' }, { status: 422 })
    }
    const [appointment] = await sql`
      INSERT INTO weave_regional_manager_appointments (user_id, source_role, status, updated_at)
      VALUES (${userId}::uuid, ${String(candidate.role)}, 'active', NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        source_role=EXCLUDED.source_role, status='active', updated_at=NOW()
      RETURNING *
    `
    return NextResponse.json({ success: true, appointment })
  }

  if (action === 'assign_bridger') {
    const userId = String(body?.userId || '')
    const regionalManagerId = String(body?.regionalManagerId || '')
    const [bridger] = await sql`
      SELECT id FROM users WHERE id=${userId}::uuid AND role='bridger' AND is_active=true LIMIT 1
    `
    const [appointment] = await sql`
      SELECT user_id FROM weave_regional_manager_appointments
      WHERE user_id=${regionalManagerId}::uuid AND status='active' LIMIT 1
    `
    if (!bridger || !appointment) {
      return NextResponse.json({ error: 'Select an active Bridger and an appointed Regional Manager.' }, { status: 422 })
    }
    const [assignment] = await sql`
      INSERT INTO weave_regional_manager_bridgers
        (bridger_user_id,regional_manager_user_id,assigned_by,status,assigned_at,updated_at)
      VALUES (${userId}::uuid,${regionalManagerId}::uuid,${admin.id}::uuid,'active',NOW(),NOW())
      ON CONFLICT (bridger_user_id) DO UPDATE SET
        regional_manager_user_id=EXCLUDED.regional_manager_user_id,
        assigned_by=EXCLUDED.assigned_by,status='active',assigned_at=NOW(),updated_at=NOW()
      RETURNING *
    `
    return NextResponse.json({ success: true, assignment })
  }

  if (action === 'end_appointment') {
    const userId = String(body?.userId || '')
    const [appointment] = await sql`
      UPDATE weave_regional_manager_appointments SET status='ended',updated_at=NOW()
      WHERE user_id=${userId}::uuid AND status='active' RETURNING *
    `
    if (!appointment) return NextResponse.json({ error: 'Active Regional Manager appointment not found' }, { status: 404 })
    await sql`
      UPDATE weave_regional_manager_bridgers SET status='ended',updated_at=NOW()
      WHERE regional_manager_user_id=${userId}::uuid AND status='active'
    `
    return NextResponse.json({ success: true, appointment })
  }

  const userId = String(body?.userId || '')
  const [assignment] = await sql`
    UPDATE weave_regional_manager_bridgers SET status='ended',updated_at=NOW()
    WHERE bridger_user_id=${userId}::uuid AND status='active' RETURNING *
  `
  if (!assignment) return NextResponse.json({ error: 'Active Bridger assignment not found' }, { status: 404 })
  return NextResponse.json({ success: true, assignment })
}
