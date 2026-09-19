import { NextResponse } from 'next/server'
import { getPendingContinuancePayments } from '@/lib/bridger-subscription'

export async function GET() {
  const pending = await getPendingContinuancePayments()
  return NextResponse.json({ success: true, pending })
}
