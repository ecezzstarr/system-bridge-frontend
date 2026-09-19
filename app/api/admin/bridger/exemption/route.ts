import { NextRequest, NextResponse } from 'next/server'
import { setExemptStatus } from '@/lib/bridger-subscription'
import { logAudit } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { userId, isExempt, adminId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'UserId required' }, { status: 400 })
    }

    await setExemptStatus(userId, isExempt)

    if (adminId) {
      await logAudit(adminId, 'TOGGLE_BRIDGER_EXEMPTION', { targetUserId: userId, isExempt })
    }

    return NextResponse.json({
      success: true,
      message: `Continuance exemption ${isExempt ? 'granted' : 'removed'} successfully`
    })
  } catch (error) {
    console.error('Exemption update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
