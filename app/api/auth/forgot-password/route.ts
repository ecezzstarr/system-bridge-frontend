import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists
    const users = await sql`SELECT id, name FROM users WHERE email = ${email} AND is_active = true`
    
    if (users.length === 0) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' })
    }

    const user = users[0]
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 hour from now

    // Ensure columns exist (Migration-on-the-fly)
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)`
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`
    } catch (e) {
      console.error('Migration failed or columns already exist', e)
    }

    // Store token
    await sql`
      UPDATE users 
      SET reset_token = ${token}, reset_token_expires = ${expires}
      WHERE id = ${user.id}
    `

    // In a real app, you'd send an email here.
    // For this prototype, we'll log it to the console (visible in Cloud Run logs)
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`
    console.log(`[PASSWORD RESET] Link for ${email}: ${resetLink}`)

    return NextResponse.json({ 
      success: true, 
      message: 'If an account exists, a reset link has been sent.',
      // For development/demo purposes only, we return the link if not in production
      link: process.env.NODE_ENV !== 'production' ? resetLink : undefined
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
