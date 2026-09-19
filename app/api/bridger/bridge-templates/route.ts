import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || (user.role !== 'bridger' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Bridger only' }, { status: 403 })
  }
  try {
    const templates = await sql`
      SELECT id, name, welcome_message, description
      FROM bridge_templates
      WHERE status = 'published'
      ORDER BY name ASC
    `
    return NextResponse.json({ success: true, templates })
  } catch (error: any) {
    console.error('[bridger bridge-templates GET] error:', error)
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 })
  }
}
