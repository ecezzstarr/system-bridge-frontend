import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { requireApiUser } from '@/lib/api-auth'

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const minutes = Number(body.minutes ?? 1)
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 10) {
      return NextResponse.json({ error: 'Invalid presence interval' }, { status: 400 })
    }

    const sql = getDb()
    await sql`
      UPDATE users
      SET field_presence_minutes = COALESCE(field_presence_minutes, 0) + ${minutes}, updated_at = NOW()
      WHERE id = ${user.id}::uuid AND is_active = true
    `
    const rows = await sql`SELECT field_presence_minutes FROM users WHERE id = ${user.id}::uuid`
    const totalMinutes = rows.length ? Number(rows[0].field_presence_minutes) || 0 : 0

    return NextResponse.json({
      success: true,
      totalMinutes,
      hoursInField: Math.floor(totalMinutes / 60),
      accruedValue: (totalMinutes / 60).toFixed(2),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Presence tracking error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Failed to record presence' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sql = getDb()
    const rows = await sql`
      SELECT field_presence_minutes, created_at FROM users WHERE id = ${user.id}::uuid AND is_active = true
    `
    if (!rows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const totalMinutes = Number(rows[0].field_presence_minutes) || 0
    const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    return NextResponse.json({
      totalMinutes,
      hoursInField: Math.floor(totalMinutes / 60),
      accruedValue: (totalMinutes / 60).toFixed(2),
      memberSince: rows[0].created_at,
      nextPayout: nextMonth.toISOString().split('T')[0],
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Presence stats error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Failed to fetch presence stats' }, { status: 500 })
  }
}
