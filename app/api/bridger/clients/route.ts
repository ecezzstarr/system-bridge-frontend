import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// GET - Fetch all clients referred by this bridger
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bridgerId = searchParams.get('bridgerId')

    if (!bridgerId) {
      return NextResponse.json({ error: 'Bridger ID required' }, { status: 400 })
    }

    const sql = getDb()

    // Get all clients where referred_by or assigned_bridger_id matches this bridger
    const clients = await sql`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.business_name,
        c.created_at
      FROM clients c
      WHERE c.referred_by = ${bridgerId}::uuid 
         OR c.assigned_bridger_id = ${bridgerId}::uuid
      ORDER BY c.created_at DESC
    `

    return NextResponse.json({
      success: true,
      clients: clients.map(c => ({
        id: c.id,
        name: c.name || 'Unnamed Client',
        email: c.email,
        phone: c.phone,
        business_name: c.business_name,
        created_at: c.created_at,
      }))
    })
  } catch (error) {
    console.error('Error fetching bridger clients:', error)
    return NextResponse.json({ 
      success: false, 
      clients: [],
      error: String(error)
    })
  }
}
