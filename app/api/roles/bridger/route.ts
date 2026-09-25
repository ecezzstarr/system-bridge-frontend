import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getSql } from '@/lib/db'

async function requireBridger(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'bridger') return { user: null, response: NextResponse.json({ error: 'Bridger access required' }, { status: 403 }) }
  return { user, response: null }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireBridger(request)
    if (auth.response) return auth.response

    const sql = getSql()
    const bridger = await sql`
      SELECT * FROM bridger_profiles
      WHERE user_id = ${auth.user!.id}::uuid
      LIMIT 1
    `

    if (!bridger[0]) {
      return NextResponse.json({ error: 'Bridger profile not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: bridger[0] })
  } catch (error) {
    console.error('[v0] Bridger profile error:', error)
    return NextResponse.json({ error: 'Failed to fetch bridger profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireBridger(request)
  if (auth.response) return auth.response
  return NextResponse.json(
    { error: 'Bridger profile terms and commission rates are controlled by Administration.' },
    { status: 403 }
  )
}
