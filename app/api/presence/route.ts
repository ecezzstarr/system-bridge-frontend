import { getAuthUser } from '@/lib/auth-api'
import { recordPresenceHeartbeat } from '@/lib/presence-accounting'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Record presence heartbeat - called periodically while user is in field
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({error:'Unauthorized'}, {status:401})
    const body = await request.json().catch(() => ({}))
    if (body.userId && body.userId !== user.id) return NextResponse.json({error:'Forbidden'}, {status:403})
    const totalMinutes = await recordPresenceHeartbeat(user.id)

    return NextResponse.json({
      success: true,
      totalMinutes,
      hoursInField: Math.floor(totalMinutes / 60),
      // Presence value: 1 System Switch per 60 minutes (accrues, paid monthly)
      accruedValue: (totalMinutes / 60).toFixed(2)
    })

  } catch (error) {
    console.error('Presence tracking error:', error)
    return NextResponse.json({ error: 'Failed to record presence' }, { status: 500 })
  }
}

// Get user's presence stats
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({error:'Unauthorized'}, {status:401})
    const requestedUserId = request.nextUrl.searchParams.get('userId')
    if (requestedUserId && requestedUserId !== user.id) return NextResponse.json({error:'Forbidden'}, {status:403})
    const userId = user.id

    const users = await sql`
      SELECT field_presence_minutes, created_at FROM users WHERE id = ${userId}::uuid
    `

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const totalMinutes = Number(users[0].field_presence_minutes) || 0
    const memberSince = users[0].created_at

    // Calculate presence value (1 System Switch per hour in field)
    const accruedValue = totalMinutes / 60

    return NextResponse.json({
      totalMinutes,
      hoursInField: Math.floor(totalMinutes / 60),
      accruedValue: accruedValue.toFixed(2),
      memberSince,
      // Next payout is first of next month
      nextPayout: getNextPayoutDate()
    })

  } catch (error) {
    console.error('Presence stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch presence stats' }, { status: 500 })
  }
}

function getNextPayoutDate(): string {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return nextMonth.toISOString().split('T')[0]
}
