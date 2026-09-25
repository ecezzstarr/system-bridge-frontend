import { NextRequest, NextResponse } from 'next/server'
import { getPendingContinuancePayments } from '@/lib/bridger-subscription'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  const pending = await getPendingContinuancePayments()
  return NextResponse.json({ success: true, pending }, { headers: { 'Cache-Control': 'private, no-store' } })
}
