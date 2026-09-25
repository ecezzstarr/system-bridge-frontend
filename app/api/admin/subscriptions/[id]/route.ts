import { NextRequest, NextResponse } from 'next/server'
import { approveContinuancePayment, rejectContinuancePayment } from '@/lib/bridger-subscription'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  const { id } = await params
  const { action } = await request.json()

  if (action === 'approve') {
    const ok = await approveContinuancePayment(id)
    return NextResponse.json({ success: ok })
  }
  if (action === 'reject') {
    await rejectContinuancePayment(id)
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
