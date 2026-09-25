import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'client') {
      return NextResponse.json({ error: 'Client access required' }, { status: 403 })
    }

    const clientId = user.id
    let bridgerId: string | null = null

    const users = await sql`
      SELECT referred_by
      FROM users
      WHERE id = ${clientId}::uuid AND role = 'client'
      LIMIT 1
    `
    bridgerId = users[0]?.referred_by || null

    if (!bridgerId) {
      const clients = await sql`
        SELECT referred_by, assigned_bridger_id
        FROM clients
        WHERE id = ${clientId}::uuid
        LIMIT 1
      `
      bridgerId = clients[0]?.assigned_bridger_id || clients[0]?.referred_by || null
    }

    if (!bridgerId) {
      return NextResponse.json({ success: true, bridger: null })
    }

    const bridgers = await sql`
      SELECT id, name, email, whatsapp_number
      FROM users
      WHERE id = ${bridgerId}::uuid
        AND role = 'bridger'
        AND COALESCE(is_active, true) = true
      LIMIT 1
    `

    if (!bridgers[0]) {
      return NextResponse.json({ success: true, bridger: null })
    }

    return NextResponse.json({
      success: true,
      bridger: {
        id: bridgers[0].id,
        name: bridgers[0].name,
        whatsapp_number: bridgers[0].whatsapp_number,
      },
    })
  } catch (error) {
    console.error('Error fetching Client bridger:', error)
    return NextResponse.json({ success: false, bridger: null, error: 'Unable to load Bridger' }, { status: 500 })
  }
}
