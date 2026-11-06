import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql, getPool } from '@/lib/db'
import { getAdminUserDirectory } from '@/lib/admin-user-directory'

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

export const dynamic = 'force-dynamic'
const privateHeaders={'Cache-Control':'private, no-store, max-age=0',Vary:'Authorization'}

export async function GET(request: NextRequest) {
  const auth=await requireAdmin(request)
  if (auth.error) return auth.error

  const params=request.nextUrl.searchParams
  const filter=params.get('filter')||'all'
  const search=(params.get('q')||'').trim()
  const offset=Number(params.get('offset')||'0')
  if (!['all','unassigned'].includes(filter) ||
      search.length>120 ||
      !Number.isSafeInteger(offset) || offset<0 || offset>1000000) {
    return NextResponse.json({success:false,error:'Invalid directory filter, search or offset.'},
      {status:400,headers:privateHeaders})
  }
  try {
    const directory=await getAdminUserDirectory({
      filter:filter as 'all'|'unassigned',search,offset,limit:100,
    })
    return NextResponse.json({
      success:true,...directory,offset,limit:100,
    },{headers:privateHeaders})
  } catch(error) {
    console.error('[Admin users] Main directory query failed:',error)
    return NextResponse.json({
      success:false,
      error:'Registered accounts could not be retrieved. Retry or inspect the server database connection.',
    },{status:503,headers:privateHeaders})
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
