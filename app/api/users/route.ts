import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// GET - Fetch all users for private messaging
export async function GET() {
  try {
    const sql = getDb()
    const users = await sql`
      SELECT 
        id, 
        name, 
        username, 
        email,
        role,
        created_at
      FROM users
      WHERE name IS NOT NULL
      ORDER BY name ASC
    `

    return NextResponse.json({ 
      success: true,
      users: users.map(u => ({
        id: u.id,
        name: u.name || u.username || 'User',
        username: u.username || u.email?.split('@')[0] || 'user',
        avatar: '👤',
        role: u.role,
      }))
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ 
      success: false, 
      users: [],
      error: String(error)
    })
  }
}
