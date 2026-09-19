import { NextRequest, NextResponse } from 'next/server'
import { approveContinuancePayment, rejectContinuancePayment } from '@/lib/bridger-subscription'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { action } = await request.json() // 'approve' | 'reject'

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
