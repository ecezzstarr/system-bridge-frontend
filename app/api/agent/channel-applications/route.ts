import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureAgentChannelTable, AGENT_CHANNELS } from '@/lib/agent-channels'

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'agent') {
    return NextResponse.json({ error: 'Agents only' }, { status: 403 })
  }
  try {
    await ensureAgentChannelTable()
    const applications = await sql`
      SELECT * FROM agent_channel_applications WHERE agent_id = ${authUser.id}::uuid
    `
    return NextResponse.json({ success: true, applications })
  } catch (error) {
    console.error('[Agent Channel Applications GET] Error:', error)
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'agent') {
    return NextResponse.json({ error: 'Agents only' }, { status: 403 })
  }
  try {
    await ensureAgentChannelTable()
    const { channel } = await request.json()
    if (!AGENT_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
    }
    const result = await sql`
      INSERT INTO agent_channel_applications (agent_id, channel, status)
      VALUES (${authUser.id}::uuid, ${channel}, 'pending')
      ON CONFLICT (agent_id, channel) DO UPDATE SET status = 'pending', applied_at = NOW(), reviewed_by = NULL, reviewed_at = NULL
      RETURNING *
    `
    return NextResponse.json({ success: true, application: result[0] })
  } catch (error) {
    console.error('[Agent Channel Applications POST] Error:', error)
    return NextResponse.json({ error: 'Failed to apply' }, { status: 500 })
  }
}
