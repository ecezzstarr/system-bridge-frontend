import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql, getPool } from '@/lib/db'

async function requireAdmin(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (authUser.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { userId: authUser.id }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get('filter') || 'unassigned'

    let users
    if (filter === 'unassigned') {
      users = await sql`
        SELECT id, email, username, name, role, departmental_code, assigned_agent_id, created_at
        FROM users 
        WHERE role != 'admin' AND (departmental_code IS NULL OR assigned_agent_id IS NULL)
        ORDER BY created_at DESC
      `
    } else {
      users = await sql`
        SELECT id, email, username, name, role, departmental_code, assigned_agent_id, created_at
        FROM users WHERE role != 'admin'
        ORDER BY created_at DESC
      `
    }

    return NextResponse.json({
      success: true,
      users: (users || []).map(u => ({
        id: u.id, email: u.email, username: u.username, name: u.name, role: u.role,
        departmental_code: u.departmental_code, platform_wallet_balance: 0, escrow_balance: 0,
        assigned_agent_id: u.assigned_agent_id, created_at: u.created_at,
      })),
    })
  } catch (error) {
    console.error('[Admin Users] Get error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch users', users: [] }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { userId, departmental_code } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    // departmental_code === null/empty means "remove role" - demote to plain user
    if (!departmental_code) {
      await sql`
        UPDATE users SET departmental_code = NULL, role = 'user', assigned_agent_id = NULL, updated_at = NOW()
        WHERE id = ${userId}::uuid
      `
      return NextResponse.json({ success: true, message: 'User demoted to plain user' })
    }

    const roleMap: Record<string, string> = { 'HOPE': 'bridger', 'STABILITY': 'agent', 'MOVEMENT': 'client' }
    const newRole = roleMap[departmental_code] || 'bridger'

    await sql`
      UPDATE users SET departmental_code = ${departmental_code}, role = ${newRole}, updated_at = NOW()
      WHERE id = ${userId}::uuid
    `

    return NextResponse.json({ success: true, message: 'User department assigned successfully' })
  } catch (error) {
    console.error('[Admin Users] Assign error:', error)
    return NextResponse.json({ success: false, error: 'Failed to assign department' }, { status: 500 })
  }
}

// Hard delete a user and all dependent rows
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Unlink dependents first, then delete owned rows, then the user
    await client.query(`UPDATE users SET assigned_agent_id = NULL WHERE assigned_agent_id = $1::uuid`, [userId])
    await client.query(`DELETE FROM ledger_entries WHERE user_id = $1::uuid`, [userId])
    await client.query(`DELETE FROM wallets WHERE user_id = $1::uuid`, [userId])
    await client.query(`DELETE FROM bridger_profiles WHERE user_id = $1::uuid`, [userId])
    await client.query(`DELETE FROM agent_profiles WHERE user_id = $1::uuid`, [userId])
    await client.query(`DELETE FROM sessions WHERE user_id = $1::uuid`, [userId])
    const result = await client.query(`DELETE FROM users WHERE id = $1::uuid RETURNING id, email`, [userId])

    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    await client.query('COMMIT')
    return NextResponse.json({ success: true, message: `Deleted ${result.rows[0].email}` })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[Admin Users] Delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 })
  } finally {
    client.release()
  }
}
