import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { sql } from '@/lib/db'
import { FLAME_EVENT } from '@/lib/weave-event'
import { ensureFlameFrontierSchema } from '@/lib/flame-frontier'

export const dynamic = 'force-dynamic'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireAdmin(request: NextRequest) {
  const user = await requireApiUser(request)
  return user?.role === 'admin' ? user : null
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ success: false, error: 'Administration access required' }, { status: 403 })
    await ensureFlameFrontierSchema()
    const records = await sql`
      SELECT id, state_code, sector, phase, title, public_summary, evidence_note,
             public_opt_in, status, submitted_role, submitted_by, created_at,
             reviewed_by, review_note, reviewed_at
      FROM weave_flame_frontier
      WHERE event_key = ${FLAME_EVENT.key}
      ORDER BY CASE WHEN status = 'submitted' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 100
    `
    return NextResponse.json({ success: true, records }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Flame frontier review read failed:', error)
    return NextResponse.json({ success: false, error: 'Unable to load frontier queue' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ success: false, error: 'Administration access required' }, { status: 403 })
    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''
    const decision = body.decision
    const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote.trim() : ''
    if (!uuidPattern.test(id) || !['verified', 'rejected'].includes(decision) || reviewNote.length < 12 || reviewNote.length > 2000) {
      return NextResponse.json({ success: false, error: 'Record, decision and review note (12–2000 characters) are required' }, { status: 400 })
    }
    await ensureFlameFrontierSchema()
    const [record] = await sql`
      UPDATE weave_flame_frontier
      SET status = ${decision}, reviewed_by = ${admin.id}::uuid, review_note = ${reviewNote},
          reviewed_at = NOW(), updated_at = NOW()
      WHERE id = ${id}::uuid AND event_key = ${FLAME_EVENT.key} AND status = 'submitted'
      RETURNING id, status, state_code, public_opt_in, reviewed_at
    `
    if (!record) return NextResponse.json({ success: false, error: 'Submission not found or already reviewed' }, { status: 409 })
    return NextResponse.json({ success: true, record })
  } catch (error) {
    console.error('Flame frontier review failed:', error)
    return NextResponse.json({ success: false, error: 'Unable to review movement' }, { status: 500 })
  }
}
