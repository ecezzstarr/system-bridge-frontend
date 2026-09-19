import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    // Find client by email
    const clients = await sql`SELECT * FROM clients WHERE email = ${email} LIMIT 1`
    
    if (clients.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const client = clients[0]

    // Verify password
    const isValid = await bcrypt.compare(password, client.password_hash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate token
    const token = Buffer.from(`${client.id}_${Date.now()}`).toString('base64')

    return NextResponse.json({
      token,
      client: {
        id: client.id,
        email: client.email,
        phone: client.phone || '',
        name: client.name,
        business_name: client.business_name || '',
        role: client.role || 'client',
        assigned_bridger_id: client.assigned_bridger_id,
      },
    })
  } catch (error: any) {
    console.error('Client login error:', error)
    return NextResponse.json(
      { error: 'Login failed', details: error.message },
      { status: 500 }
    )
  }
}
