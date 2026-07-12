import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// GET - Fetch all users for private messaging, with optional role filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    
    const sql = getDb()
    
    let users
    if (role === 'agent') {
      // For agents, also get their bridger count
      users = await sql`
        SELECT 
          u.id, 
          u.name, 
          u.username, 
          u.email,
          u.role,
          u.avatar,
          COALESCE(u.presence, 'offline') as status,
          u.created_at,
          (SELECT COUNT(*) FROM users WHERE assigned_agent_id = u.id) as bridger_count
        FROM users u
        WHERE u.role = 'agent' AND u.name IS NOT NULL
        ORDER BY u.name ASC
      `
    } else if (role) {
      users = await sql`
        SELECT 
          id, 
          name, 
          username, 
          email,
          role,
          avatar,
          COALESCE(presence, 'offline') as status,
          assigned_agent_id,
          created_at
        FROM users
        WHERE role = ${role} AND name IS NOT NULL
        ORDER BY name ASC
      `
    } else {
      users = await sql`
        SELECT 
          id, 
          name, 
          username, 
          email,
          role,
          avatar,
          COALESCE(presence, 'offline') as status,
          assigned_agent_id,
          created_at
        FROM users
        WHERE name IS NOT NULL
        ORDER BY name ASC
      `
    }

    return NextResponse.json({ 
      success: true,
      users: users.map(u => ({
        id: u.id,
        name: u.name || u.username || 'User',
        username: u.username || u.email?.split('@')[0] || 'user',
        email: u.email,
        role: u.role,
        avatar: u.avatar,
        status: u.status === 'online' ? 'online' : 'offline',
        assigned_agent_id: u.assigned_agent_id,
        bridger_count: u.bridger_count ? parseInt(u.bridger_count) : undefined,
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
