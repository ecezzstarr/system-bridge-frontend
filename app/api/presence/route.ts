import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// Record presence heartbeat - called periodically while user is in field
export async function POST(request: NextRequest) {
  try {
    const { userId, minutes = 1 } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const sql = getDb()

    // Update user's field presence minutes
    await sql`
      UPDATE users 
      SET field_presence_minutes = COALESCE(field_presence_minutes, 0) + ${minutes},
          updated_at = NOW()
      WHERE id = ${userId}::uuid
    `

    // Get updated presence stats
    const users = await sql`
      SELECT field_presence_minutes FROM users WHERE id = ${userId}::uuid
    `

    const totalMinutes = users.length > 0 ? Number(users[0].field_presence_minutes) : 0

    return NextResponse.json({
      success: true,
      totalMinutes,
      hoursInField: Math.floor(totalMinutes / 60),
      // Presence value: 1 TRX per 60 minutes (accrues, paid monthly)
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
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const sql = getDb()

    const users = await sql`
      SELECT field_presence_minutes, created_at FROM users WHERE id = ${userId}::uuid
    `

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const totalMinutes = Number(users[0].field_presence_minutes) || 0
    const memberSince = users[0].created_at

    // Calculate presence value (1 TRX per hour in field)
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
