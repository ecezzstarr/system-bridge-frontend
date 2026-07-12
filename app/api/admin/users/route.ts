import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'
import { withDbErrorHandling } from '@/lib/db-utils'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireWorkshopAuthorization(request)
    if (!auth.authorized) return auth.response

    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get('filter') || 'unassigned'

    const sql = getDb()
    
    const result = await withDbErrorHandling(
      async () => {
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
            LIMIT 100
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
            LIMIT 100
          `
        }
        return users
      },
      'Admin users fetch'
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 503 }
      )
    }

    return NextResponse.json({
      users: (result.data || []).map(u => ({
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
    console.error('[admin users] Get users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users. Service temporarily unavailable.' },
      { status: 503 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireWorkshopAuthorization(request)
    if (!auth.authorized) return auth.response

    const body = await request.json()
    const { userId, departmental_code } = body

    if (!userId || !departmental_code) {
      return NextResponse.json(
        { error: 'Missing userId or departmental_code' },
        { status: 400 }
      )
    }

    const sql = getDb()
    
    const result = await withDbErrorHandling(
      async () => {
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
        return { success: true, message: 'User department assigned successfully' }
      },
      'Admin assign department'
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 503 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('[admin users] Assign department error:', error)
    return NextResponse.json(
      { error: 'Failed to assign department. Service temporarily unavailable.' },
      { status: 503 }
    )
  }
}
