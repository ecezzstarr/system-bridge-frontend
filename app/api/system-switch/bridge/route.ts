import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

export const dynamic = 'force-dynamic'

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('Database not configured')
  return neon(url)
}

export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get('code')?.trim()
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })

  try {
    const sql = getDb()
    const rows = await sql`
      SELECT code, message, topic, context, flame_name, flame_external_id, flame_presence, crossing_state, provider_key, provider_name
      FROM chatgpt_bridge_sessions
      WHERE code = ${code} AND expires_at > now()
      LIMIT 1
    `
    if (!rows.length) return NextResponse.json({ error: 'Crossing not found or expired' }, { status: 404 })

    await sql`
      UPDATE chatgpt_bridge_sessions
      SET opened_at = COALESCE(opened_at, now())
      WHERE code = ${code}
    `

    return NextResponse.json({ crossing: rows[0] })
  } catch (error) {
    console.error('System Switch bridge read error:', error)
    return NextResponse.json({ error: 'Crossing unavailable' }, { status: 500 })
  }
}
