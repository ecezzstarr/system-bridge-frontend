import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

function getClientId(request: NextRequest) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const match = decoded.match(/^([0-9a-fA-F-]{36})_\d+$/)
    return match?.[1] || null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const clientId = getClientId(request)
    if (!clientId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const sql = getDb()
    const rows = await sql`
      SELECT id, name, email, business_name, file_number
      FROM clients
      WHERE id = ${clientId}::uuid
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const client = rows[0]
    const verified = Boolean(client.file_number)

    return NextResponse.json({
      success: true,
      verified,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        business_name: client.business_name || '',
        file_number: client.file_number || null,
      },
    })
  } catch (error) {
    console.error('Client System Switch status error:', error)
    return NextResponse.json({ error: 'Unable to load System Switch status' }, { status: 500 })
  }
}
