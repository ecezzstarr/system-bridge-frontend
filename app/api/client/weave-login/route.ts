import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

export async function POST(request: NextRequest) {
  try {
    const { fileNumber, password } = await request.json()

    if (!fileNumber || !password) {
      return NextResponse.json(
        { error: 'File number and password are required' },
        { status: 400 }
      )
    }

    const result = await sql`
      SELECT id, email, name, role, password_hash, file_number, business_name, referred_by
      FROM users
      WHERE file_number = ${fileNumber}
      AND is_active = true
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invalid file number or password' },
        { status: 401 }
      )
    }

    const user = result[0]

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid file number or password' },
        { status: 401 }
      )
    }

    const token = `ssb_${randomBytes(32).toString('base64url')}`
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
      }
    })
  } catch (error) {
    console.error('Weave login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
