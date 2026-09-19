import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await sql`
      UPDATE users
      SET assigned_agent_id = NULL
      WHERE role = 'bridger' AND assigned_agent_id IS NOT NULL
      RETURNING id, name, email
    `

    return NextResponse.json({
      success: true,
      message: `Unassigned ${result.length} bridger(s) from all agents.`,
      unassigned: result
    })
  } catch (error) {
    console.error('Error unassigning all bridgers:', error)
    return NextResponse.json({ error: 'Failed to unassign bridgers' }, { status: 500 })
  }
}
