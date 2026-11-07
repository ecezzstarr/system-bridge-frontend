import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'

/** Compatibility response: Paystack deposits belong to the verified queue. */
export async function GET(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Administrations only' }, { status: 403 })
  }
  return NextResponse.json([], { headers: { 'Cache-Control': 'private, no-store' } })
}
