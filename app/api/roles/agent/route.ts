import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getSql } from '@/lib/db'

async function requireAgent(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'agent') return { user: null, response: NextResponse.json({ error: 'Agent access required' }, { status: 403 }) }
  return { user, response: null }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAgent(request)
    if (auth.response) return auth.response

    const sql = getSql()
    const agent = await sql`
      SELECT * FROM agent_profiles
      WHERE user_id = ${auth.user!.id}::uuid
      LIMIT 1
    `

    if (!agent[0]) {
      return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: agent[0] })
  } catch (error) {
    console.error('[v0] Agent profile error:', error)
    return NextResponse.json({ error: 'Failed to fetch agent profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAgent(request)
  if (auth.response) return auth.response
  return NextResponse.json(
    { error: 'Agent profile terms and commission rates are controlled by Administration.' },
    { status: 403 }
  )
}
