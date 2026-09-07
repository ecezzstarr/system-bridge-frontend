import { NextRequest, NextResponse } from 'next/server'

/**
 * Deposits must be verified by a payment provider before the persistent wallet
 * is credited. This legacy endpoint previously allowed a caller to credit an
 * arbitrary user balance and is intentionally disabled.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Direct wallet credits are disabled. Use the verified deposit flow.',
  }, { status: 410 })
}
