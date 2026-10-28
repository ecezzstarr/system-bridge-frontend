import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureRegionalManagerCommissionSchema } from '@/lib/regional-manager-commission'

const ELIGIBLE_ROLES = ['client', 'bridger', 'agent']

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!ELIGIBLE_ROLES.includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Only active Clients, Bridgers, and Agents can apply.' }, { status: 403 })
  }
  await ensureRegionalManagerCommissionSchema()
  const [application] = await sql`
    SELECT user_id, source_role, region, experience, motivation, status, submitted_at,
      reviewed_at, review_note
    FROM weave_regional_manager_applications
    WHERE user_id=${user.id}::uuid
    LIMIT 1
  `
  const [appointment] = await sql`
    SELECT status, appointed_at FROM weave_regional_manager_appointments
    WHERE user_id=${user.id}::uuid LIMIT 1
  `
  return NextResponse.json({ success: true, application: application || null, appointment: appointment || null },
    { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!ELIGIBLE_ROLES.includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Only active Clients, Bridgers, and Agents can apply.' }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  const region = typeof body?.region === 'string' ? body.region.trim() : ''
  const experience = typeof body?.experience === 'string' ? body.experience.trim() : ''
  const motivation = typeof body?.motivation === 'string' ? body.motivation.trim() : ''
  if (region.length < 2 || region.length > 120 || experience.length < 20 || experience.length > 4000 ||
      motivation.length < 20 || motivation.length > 4000) {
    return NextResponse.json({
      success: false,
      error: 'Provide a region (2–120 characters), experience (20–4,000 characters), and motivation (20–4,000 characters).',
    }, { status: 400 })
  }

  await ensureRegionalManagerCommissionSchema()
  const [existingAppointment] = await sql`
    SELECT status FROM weave_regional_manager_appointments WHERE user_id=${user.id}::uuid LIMIT 1
  `
  if (existingAppointment?.status === 'active') {
    return NextResponse.json({ success: false, error: 'You are already an appointed Regional Manager.' }, { status: 409 })
  }
  const [existing] = await sql`
    SELECT status FROM weave_regional_manager_applications WHERE user_id=${user.id}::uuid LIMIT 1
  `
  if (existing?.status === 'pending' || existing?.status === 'approved') {
    return NextResponse.json({ success: false, error: 'Your Regional Manager application is already recorded.', status: existing.status }, { status: 409 })
  }

  const [application] = await sql`
    INSERT INTO weave_regional_manager_applications
      (user_id, source_role, region, experience, motivation, status, submitted_at, reviewed_at, reviewed_by, review_note, updated_at)
    VALUES (${user.id}::uuid, ${user.role}, ${region}, ${experience}, ${motivation}, 'pending', NOW(), NULL, NULL, NULL, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      source_role=EXCLUDED.source_role, region=EXCLUDED.region, experience=EXCLUDED.experience,
      motivation=EXCLUDED.motivation, status='pending', submitted_at=NOW(),
      reviewed_at=NULL, reviewed_by=NULL, review_note=NULL, updated_at=NOW()
    WHERE weave_regional_manager_applications.status IN ('rejected','withdrawn')
    RETURNING user_id, source_role, region, experience, motivation, status, submitted_at
  `
  if (!application) return NextResponse.json({ success: false, error: 'An application already exists and cannot be replaced.' }, { status: 409 })
  return NextResponse.json({ success: true, application }, { status: 201 })
}
