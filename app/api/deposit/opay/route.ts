import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Manual OPay wallet funding is retired. Use the authenticated Paystack deposit checkout at /api/deposit/paystack.' },
    { status: 410 },
  )
}
