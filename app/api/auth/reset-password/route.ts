import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    // Find user with valid token
    const users = await sql`
      SELECT id 
      FROM users 
      WHERE reset_token = ${token} 
      AND reset_token_expires > NOW()
    `

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    const user = users[0]
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update password and clear token
    await sql`
      UPDATE users 
      SET password_hash = ${hashedPassword}, 
          reset_token = NULL, 
          reset_token_expires = NULL,
          updated_at = NOW()
      WHERE id = ${user.id}
    `

    return NextResponse.json({ success: true, message: 'Password has been reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
