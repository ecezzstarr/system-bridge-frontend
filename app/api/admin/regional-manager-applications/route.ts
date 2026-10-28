import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool, sql } from '@/lib/db'
import { ensureRegionalManagerCommissionSchema } from '@/lib/regional-manager-commission'

export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Administration access required' }, { status: 403 })
  }
  await ensureRegionalManagerCommissionSchema()
  const params = request.nextUrl.searchParams
  const status = params.get('status') || 'pending'
  if (!['pending', 'approved', 'rejected', 'withdrawn', 'all'].includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid application status filter.' }, { status: 400 })
  }
  const parsedLimit = Number.parseInt(params.get('limit') || '50', 10)
  const parsedOffset = Number.parseInt(params.get('offset') || '0', 10)
  const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 50
  const offset = Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0
  const values: unknown[] = []
  let where = ''
  if (status !== 'all') {
    values.push(status)
    where = 'WHERE a.status = $1'
  }
  values.push(limit, offset)
  const pool = getPool()
  const rows = await pool.query(`
    SELECT a.user_id, u.name, u.email, a.source_role, a.region, a.experience, a.motivation,
      a.status, a.submitted_at, a.reviewed_at, reviewer.name AS reviewer_name, a.review_note
    FROM weave_regional_manager_applications a
    JOIN users u ON u.id=a.user_id
    LEFT JOIN users reviewer ON reviewer.id=a.reviewed_by
    ${where}
    ORDER BY a.submitted_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `, values)
  const countValues = status === 'all' ? [] : [status]
  const countRows = await pool.query(`
    SELECT COUNT(*)::bigint AS total FROM weave_regional_manager_applications a ${where}
  `, countValues)
  return NextResponse.json({
    success: true,
    applications: rows.rows,
    pagination: { limit, offset, total: Number(countRows.rows[0]?.total || 0), hasMore: offset + rows.rows.length < Number(countRows.rows[0]?.total || 0) },
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Administration access required' }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  const decision = body?.decision
  const reviewNote = typeof body?.reviewNote === 'string' ? body.reviewNote.trim().slice(0, 2000) : ''
  if (!userId || !['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ success: false, error: 'Provide userId and an approve or reject decision.' }, { status: 400 })
  }

  await ensureRegionalManagerCommissionSchema()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(`
      SELECT a.user_id, a.source_role, a.status, u.is_active, u.role
      FROM weave_regional_manager_applications a
      JOIN users u ON u.id=a.user_id
      WHERE a.user_id=$1::uuid
      FOR UPDATE OF a, u
    `, [userId])
    const application = result.rows[0]
    if (!application || application.status !== 'pending') {
      await client.query('ROLLBACK')
      return NextResponse.json({ success: false, error: 'Pending Regional Manager application not found.' }, { status: 404 })
    }
    if (!application.is_active || !['client', 'bridger', 'agent'].includes(application.role) ||
        application.role !== application.source_role) {
      await client.query('ROLLBACK')
      return NextResponse.json({ success: false, error: 'Applicant is no longer eligible under their current account role.' }, { status: 409 })
    }

    if (decision === 'approve') {
      await client.query(`
        INSERT INTO weave_regional_manager_appointments (user_id, source_role, status, appointed_at, updated_at)
        VALUES ($1::uuid, $2, 'active', NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET source_role=EXCLUDED.source_role,
          status='active', appointed_at=NOW(), updated_at=NOW()
      `, [userId, application.source_role])
    }
    const newStatus = decision === 'approve' ? 'approved' : 'rejected'
    const updated = await client.query(`
      UPDATE weave_regional_manager_applications
      SET status=$2, reviewed_at=NOW(), reviewed_by=$3::uuid, review_note=$4, updated_at=NOW()
      WHERE user_id=$1::uuid AND status='pending'
      RETURNING user_id, source_role, status, reviewed_at, reviewed_by, review_note
    `, [userId, newStatus, admin.id, reviewNote || null])
    await client.query('COMMIT')
    return NextResponse.json({ success: true, application: updated.rows[0] })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    throw error
  } finally {
    client.release()
  }
}
