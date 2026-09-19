import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureAgentChannelTable } from '@/lib/agent-channels'

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  try {
    await ensureAgentChannelTable()
    const applications = await sql`
      SELECT a.*, u.name as agent_name, u.email as agent_email
      FROM agent_channel_applications a
      JOIN users u ON u.id = a.agent_id
      ORDER BY a.applied_at DESC
    `
    return NextResponse.json({ success: true, applications })
  } catch (error) {
    console.error('[Admin Agent Channel Applications GET] Error:', error)
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  try {
    const { applicationId, status } = await request.json()
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
    }
    const result = await sql`
      UPDATE agent_channel_applications
      SET status = ${status}, reviewed_by = ${authUser.id}::uuid, reviewed_at = NOW()
      WHERE id = ${applicationId}::uuid
      RETURNING *
    `
    if (result.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, application: result[0] })
  } catch (error) {
    console.error('[Admin Agent Channel Applications POST] Error:', error)
    return NextResponse.json({ error: 'Failed to review application' }, { status: 500 })
  }
}
