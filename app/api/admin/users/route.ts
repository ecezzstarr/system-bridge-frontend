import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get('filter') || 'unassigned'

    const sql = getDb()
    
    let users
    if (filter === 'unassigned') {
      users = await sql`
        SELECT 
          id, email, username, name, role, departmental_code,
          platform_wallet_balance, escrow_balance, assigned_agent_id,
          created_at
        FROM users 
        WHERE role != 'admin' 
        AND (departmental_code IS NULL OR assigned_agent_id IS NULL)
        ORDER BY created_at DESC
      `
    } else {
      users = await sql`
        SELECT 
          id, email, username, name, role, departmental_code,
          platform_wallet_balance, escrow_balance, assigned_agent_id,
          created_at
        FROM users 
        WHERE role != 'admin'
        ORDER BY created_at DESC
      `
    }

    return NextResponse.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        username: u.username,
        name: u.name,
        role: u.role,
        departmental_code: u.departmental_code,
        platform_wallet_balance: parseFloat(u.platform_wallet_balance) || 0,
        escrow_balance: parseFloat(u.escrow_balance) || 0,
        assigned_agent_id: u.assigned_agent_id,
        created_at: u.created_at,
      })),
    })
  } catch (error) {
    console.error('[v0] Get users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, departmental_code } = body

    if (!userId || !departmental_code) {
      return NextResponse.json(
        { error: 'Missing userId or departmental_code' },
        { status: 400 }
      )
    }

    const sql = getDb()
    
    // Map departmental code to role
    const roleMap: Record<string, string> = {
      'HOPE': 'bridger',
      'STABILITY': 'agent',
      'MOVEMENT': 'client'
    }
    const newRole = roleMap[departmental_code] || 'bridger'

    await sql`
      UPDATE users 
      SET departmental_code = ${departmental_code}, role = ${newRole}
      WHERE id = ${userId}::uuid
    `

    return NextResponse.json({
      success: true,
      message: 'User department assigned successfully',
    })
  } catch (error) {
    console.error('[v0] Assign department error:', error)
    return NextResponse.json(
      { error: 'Failed to assign department' },
      { status: 500 }
    )
  }
}
