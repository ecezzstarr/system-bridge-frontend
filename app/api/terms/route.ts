import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { CURRENT_TERMS_VERSION } from '@/lib/weave-terms'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await sql`
      SELECT terms_accepted_at as "termsAcceptedAt", terms_accepted_version as "termsAcceptedVersion"
      FROM users WHERE id = ${user.id}::uuid
    `

    const row = rows[0] || {}
    const needsAcceptance = !row.termsAcceptedAt || (row.termsAcceptedVersion || 0) < CURRENT_TERMS_VERSION

    return NextResponse.json({
      success: true,
      currentVersion: CURRENT_TERMS_VERSION,
      acceptedVersion: row.termsAcceptedVersion || 0,
      acceptedAt: row.termsAcceptedAt || null,
      needsAcceptance,
    })
  } catch (error: any) {
    console.error('Terms status error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (!['agent', 'bridger'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Terms acceptance only applies to agents and bridgers' }, { status: 403 })
    }

    const body = await request.json()
    const { fullName } = body
    if (!fullName?.trim()) {
      return NextResponse.json({ success: false, error: 'Full name confirmation required' }, { status: 400 })
    }

    await sql`
      UPDATE users
      SET terms_accepted_at = NOW(), terms_accepted_version = ${CURRENT_TERMS_VERSION}
      WHERE id = ${user.id}::uuid
    `

    await sql`
      INSERT INTO terms_acceptance_log (user_id, role, terms_version, full_name_confirmed)
      VALUES (${user.id}::uuid, ${user.role}, ${CURRENT_TERMS_VERSION}, ${fullName.trim()})
    `

    return NextResponse.json({ success: true, acceptedVersion: CURRENT_TERMS_VERSION })
  } catch (error: any) {
    console.error('Terms accept error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
