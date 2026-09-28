import { NextRequest, NextResponse } from 'next/server'
import { setExemptStatus } from '@/lib/bridger-subscription'
import { logAudit, sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

export async function POST(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const { userId, isExempt } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const target = await sql`
      SELECT id
      FROM users
      WHERE id = ${String(userId)}::uuid
        AND (role = 'bridger' OR departmental_code = 'HOPE')
      LIMIT 1
    `
    if (!target.length) return NextResponse.json({ error: 'Bridger not found' }, { status: 404 })

    await setExemptStatus(String(userId), Boolean(isExempt))
    await logAudit(admin.id, 'TOGGLE_BRIDGER_EXEMPTION', {
      targetUserId: userId,
      isExempt: Boolean(isExempt),
    })
    return NextResponse.json({
      success: true,
      message: `Continuance exemption ${isExempt ? 'granted' : 'removed'} successfully`,
    })
  } catch (error) {
    console.error('Exemption update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
