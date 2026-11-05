import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'

/** Manual OPay approvals must not credit Paystack or other wallet deposits. */
export async function POST(request: NextRequest) {
  const admin = await getAuthUser(request)
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Administration only' }, { status: 403 })
  }
  return NextResponse.json({
    error: 'Manual OPay wallet deposit approval is retired. Paystack payments must be verified directly with Paystack, then settled atomically.',
    code: 'manual_deposit_approval_retired',
  }, { status: 410, headers: { 'Cache-Control': 'no-store' } })
}
