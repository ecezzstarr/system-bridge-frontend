import { NextResponse } from 'next/server'

/** Prevent legacy receipt edits from overwriting Paystack references or reopening deposits. */
export async function POST() {
  return NextResponse.json({
    error: 'Manual OPay receipt submission is retired. Use the authenticated Paystack checkout instead.',
    code: 'manual_deposit_receipt_retired',
  }, { status: 410, headers: { 'Cache-Control': 'no-store' } })
}
