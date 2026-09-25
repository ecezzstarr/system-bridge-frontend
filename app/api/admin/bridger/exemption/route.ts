import { NextRequest, NextResponse } from 'next/server'
import { setExemptStatus } from '@/lib/bridger-subscription'
import { logAudit } from '@/lib/db'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const { userId, isExempt } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    await setExemptStatus(String(userId), Boolean(isExempt))
    await logAudit(auth.session.user.id, 'TOGGLE_BRIDGER_EXEMPTION', {
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
