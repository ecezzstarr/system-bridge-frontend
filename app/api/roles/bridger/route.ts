import { NextResponse } from 'next/server'
import { getSession } from 'next-auth/react'
import { getSql } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const session = await getSession({ req: request })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sql = getSql()
    
    // Get bridger profile or create if doesn't exist
    let bridger = await sql`
      SELECT * FROM bridger_profiles WHERE user_id = ${session.user.id}::uuid
    `
    
    if (bridger.length === 0) {
      const result = await sql`
        INSERT INTO bridger_profiles (user_id, commission_rate, referrals, total_earnings)
        VALUES (${session.user.id}::uuid, 0.1, 0, 0)
        RETURNING *
      `
      bridger = result
    }

    return NextResponse.json({ success: true, data: bridger[0] })
  } catch (error) {
    console.error('[v0] Bridger profile error:', error)
    return NextResponse.json({ error: 'Failed to fetch bridger profile' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession({ req: request })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commission_rate } = await request.json()
    const sql = getSql()

    const result = await sql`
      UPDATE bridger_profiles 
      SET commission_rate = ${commission_rate}, updated_at = NOW()
      WHERE user_id = ${session.user.id}::uuid
      RETURNING *
    `

    return NextResponse.json({ success: true, data: result[0] })
  } catch (error) {
    console.error('[v0] Update bridger error:', error)
    return NextResponse.json({ error: 'Failed to update bridger profile' }, { status: 500 })
  }
}
