import { NextRequest, NextResponse } from 'next/server'
import { getUnassignedUsers, getAllUsers, assignUserDepartment } from '@/lib/mock-db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get('filter') || 'unassigned'

    let users = []
    if (filter === 'unassigned') {
      users = getUnassignedUsers()
    } else {
      users = getAllUsers().filter(u => u.role !== 'admin')
    }

    return NextResponse.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        username: u.username,
        name: u.name,
        role: u.role,
        departmental_code: u.departmental_code,
        platform_wallet_balance: u.platform_wallet_balance,
        escrow_balance: u.escrow_balance,
        assigned_by_admin: u.assigned_by_admin,
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

    const success = assignUserDepartment(userId, departmental_code)
    if (!success) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

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
