import { NextRequest, NextResponse } from 'next/server'
import { authenticateClient, getClientByEmail } from '@/lib/mock-client-db'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    const client = authenticateClient(email, password)

    if (!client) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate simple token
    const token = Buffer.from(`${client.id}_${Date.now()}`).toString('base64')

    return NextResponse.json({
      token,
      client: {
        id: client.id,
        email: client.email,
        phone: client.phone,
        name: client.name,
        business_name: client.business_name,
        role: client.role,
      },
    })
  } catch (error) {
    console.error('Client login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
