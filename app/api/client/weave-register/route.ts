import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { validateFileNumber } from '@/lib/fne'

export async function POST(request: NextRequest) {
  try {
    const { fileNumber, email, password, businessName } = await request.json()

    if (!fileNumber || !email || !password) {
      return NextResponse.json(
        { error: 'File number, email, and password are required' },
        { status: 400 }
      )
    }

    const folder = await validateFileNumber(fileNumber)
    if (!folder) {
      return NextResponse.json(
        { error: 'Invalid or already registered file number' },
        { status: 400 }
      )
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const identityData = folder.identity_data as any
    const name = identityData?.name || 'Client'
    const phone = identityData?.phone || ''
    const bridgerId = folder.bridger_id || null

    const newUser = await sql`
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        file_number,
        whatsapp_number,
        business_name,
        referred_by
      )
      VALUES (
        ${name},
        ${email},
        ${hashedPassword},
        'client',
        ${fileNumber},
        ${phone},
        ${businessName || null},
        ${bridgerId}
      )
      RETURNING id, name, email, role, file_number, business_name, referred_by
    `

    const user = newUser[0]

    await sql`
      UPDATE file_folders
      SET status = 'registered', client_id = ${user.id}, registered_at = NOW()
      WHERE id = ${folder.id}
    `

    const token = `token_${user.id}_${Date.now()}`
    await sql`
      INSERT INTO sessions (id, user_id, token, created_at, expires_at)
      VALUES (gen_random_uuid(), ${user.id}::uuid, ${token}, NOW(), NOW() + INTERVAL '7 days')
    `

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.email?.split('@')[0] || 'client',
        role: user.role,
        file_number: user.file_number,
        business_name: user.business_name,
        referred_by: user.referred_by,
      },
    })
  } catch (error) {
    console.error('Weave register error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
