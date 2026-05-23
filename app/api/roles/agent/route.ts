import { NextResponse } from 'next/server'
import { getSession } from 'next-auth/react'
import { getSql } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const session = await getSession({ req: request })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sql = getSql()
    
    // Get agent profile or create if doesn't exist
    let agent = await sql`
      SELECT * FROM agent_profiles WHERE user_id = ${session.user.id}::uuid
    `
    
    if (agent.length === 0) {
      const result = await sql`
        INSERT INTO agent_profiles (user_id, agent_type, commission_rate, matches_completed, rating)
        VALUES (${session.user.id}::uuid, 'standard', 0.05, 0, 5.0)
        RETURNING *
      `
      agent = result
    }

    return NextResponse.json({ success: true, data: agent[0] })
  } catch (error) {
    console.error('[v0] Agent profile error:', error)
    return NextResponse.json({ error: 'Failed to fetch agent profile' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession({ req: request })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agent_type, commission_rate } = await request.json()
    const sql = getSql()

    const result = await sql`
      UPDATE agent_profiles 
      SET agent_type = ${agent_type}, commission_rate = ${commission_rate}, updated_at = NOW()
      WHERE user_id = ${session.user.id}::uuid
      RETURNING *
    `

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error) {
    console.error('[v0] Update agent error:', error)
    return NextResponse.json({ error: 'Failed to update agent profile' }, { status: 500 })
  }
}
