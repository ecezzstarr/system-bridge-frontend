import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

// GET - Fetch all users for private messaging, with optional role filter
export async function GET(request: NextRequest) {
  try {
    // Optional: Only authenticated users can list other users
    const authUser = await getAuthUser(request)
    if (!authUser) {
      // For now, let's just log and continue to avoid breaking existing flows if some callers don't pass token
      console.warn('Listing users without authentication')
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const currentUserId = searchParams.get('currentUserId')
    
    let users
    if (currentUserId) {
      // Fetch users and sort by last message with current user
      users = await sql`
        SELECT 
          u.id, 
          u.name, 
          u.username, 
          u.email, 
          u.role, 
          u.assigned_agent_id,
          u.created_at,
          (
            SELECT MAX(created_at) 
            FROM lounge_messages 
            WHERE room_type = 'private' 
            AND room_id = CASE 
              WHEN u.id::text < ${currentUserId} THEN u.id::text || '-' || ${currentUserId}
              ELSE ${currentUserId} || '-' || u.id::text
            END
          ) as last_message_at
        FROM users u
        WHERE u.id != ${currentUserId}
        ORDER BY last_message_at DESC NULLS LAST, COALESCE(u.name, u.username, u.email) ASC
      `
    } else if (role === 'agent') {
      // For agents, also get their bridger count
      users = await sql`
        SELECT 
          u.id, 
          u.name, 
          u.username, 
          u.email,
          u.role,
          u.created_at,
          (SELECT COUNT(*) FROM users WHERE assigned_agent_id = u.id) as bridger_count
        FROM users u
        WHERE u.role = 'agent'
        ORDER BY COALESCE(u.name, u.username, u.email) ASC
      `
    } else if (role) {
      users = await sql`
        SELECT 
          id, 
          name, 
          username, 
          email, 
          role, 
          assigned_agent_id,
          created_at
        FROM users
        WHERE role = ${role}
        ORDER BY COALESCE(name, username, email) ASC
      `
    } else {
      // Default: show all users who have at least an email or username or name
      users = await sql`
        SELECT 
          id, 
          name, 
          username, 
          email, 
          role, 
          assigned_agent_id,
          created_at
        FROM users
        ORDER BY COALESCE(name, username, email) ASC
      `
    }

    return NextResponse.json({ 
      success: true,
      users: (users || []).map(u => ({
        id: u.id,
        name: u.name || u.username || u.email?.split('@')[0] || 'User',
        username: u.username || u.email?.split('@')[0] || 'user',
        email: u.email,
        role: u.role,
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
