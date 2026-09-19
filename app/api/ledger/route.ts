import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getUserLedger, getUserEscrow, getUserTotalBalance } from '@/lib/ledger'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    
    if (!authUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const userId = authUser.id
    const ledger = await getUserLedger(userId, 100)
    const escrow = await getUserEscrow(userId)
    const balance = await getUserTotalBalance(userId)

    return NextResponse.json({
      success: true,
      data: {
        ledger,
        escrow,
        balance,
      },
    })
  } catch (error) {
    console.error('[v0] Ledger API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ledger' },
      { status: 500 }
    )
  }
}
