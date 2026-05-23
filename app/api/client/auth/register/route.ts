import { NextRequest, NextResponse } from 'next/server'
import { createClient, getClientByEmail } from '@/lib/mock-client-db'

export async function POST(request: NextRequest) {
  try {
    const { email, password, phone, name, business_name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Check if client already exists
    const existing = getClientByEmail(email)
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    const client = createClient({
      email,
      password,
      phone: phone || '',
      name,
      business_name: business_name || '',
    })

    const token = Buffer.from(`${client.id}_${Date.now()}`).toString('base64')

    return NextResponse.json({
      token,
      client: {
        id: client.id,
        email: client.email,
        phone: client.phone,
        name: client.name,
        business_name: client.business_name,
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
