import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { validateFileNumber } from '@/lib/fne'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'

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

    // A Client login does not create a File Folder by itself.
    // It may only claim a File Folder that the Bridge/company movement already provisioned.
    await ensureClientFileFolderSchema(sql)
    await sql`
      UPDATE client_file_folders
      SET
        client_id = ${user.id}::uuid,
        client_name = ${name},
        status = 'active',
        claimed_at = COALESCE(claimed_at, NOW()),
        updated_at = NOW()
      WHERE file_number = ${fileNumber}
        AND client_id IS NULL
    `

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
