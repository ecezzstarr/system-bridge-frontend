import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// GET - Get the bridger assigned to a client
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    const sql = getDb()

    // Get client's referred_by or assigned_bridger_id
    const clients = await sql`
      SELECT referred_by, assigned_bridger_id FROM clients WHERE id = ${clientId}::uuid
    `

    if (clients.length === 0) {
      return NextResponse.json({ bridger: null })
    }

    const bridgerId = clients[0].assigned_bridger_id || clients[0].referred_by

    if (!bridgerId) {
      return NextResponse.json({ bridger: null })
    }

    // Get bridger info
    const bridgers = await sql`
      SELECT id, name, email, whatsapp_number
      FROM users
      WHERE id = ${bridgerId}::uuid
    `

    if (bridgers.length === 0) {
      return NextResponse.json({ bridger: null })
    }

    return NextResponse.json({
      bridger: {
        id: bridgers[0].id,
        name: bridgers[0].name,
        whatsapp_number: bridgers[0].whatsapp_number,
      }
    })
  } catch (error) {
    console.error('Error fetching bridger:', error)
    return NextResponse.json({ bridger: null })
  }
}
