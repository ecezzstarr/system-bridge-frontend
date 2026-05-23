import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, phone, name, business_name, referredBy } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    const sql = getDb()

    // Check if client already exists
    const existing = await sql`SELECT id FROM clients WHERE email = ${email}`
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Find bridger if referred
    let bridgerId = null
    if (referredBy) {
      // referredBy is the first 8 chars of a bridger's user ID
      const bridgers = await sql`
        SELECT id FROM users 
        WHERE id::text LIKE ${referredBy + '%'} 
        AND (role = 'bridger' OR departmental_code = 'HOPE')
        LIMIT 1
      `
      if (bridgers.length > 0) {
        bridgerId = bridgers[0].id
      }
    }

    // Create client
    const newClient = await sql`
      INSERT INTO clients (name, email, phone, password_hash, business_name, assigned_bridger_id, referred_by)
      VALUES (${name}, ${email}, ${phone || ''}, ${hashedPassword}, ${business_name || ''}, ${bridgerId}, ${bridgerId})
      RETURNING id, name, email, phone, business_name, assigned_bridger_id
    `

    const client = newClient[0]
    const token = Buffer.from(`${client.id}_${Date.now()}`).toString('base64')

    return NextResponse.json({
      token,
      client: {
        id: client.id,
        email: client.email,
        phone: client.phone,
        name: client.name,
        business_name: client.business_name,
        assigned_bridger_id: client.assigned_bridger_id,
      },
    })
  } catch (error) {
    console.error('Client register error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
