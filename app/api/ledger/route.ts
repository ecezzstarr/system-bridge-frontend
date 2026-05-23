import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserLedger, getUserEscrow, getUserTotalBalance } from '@/lib/ledger'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const userId = session.user.id
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
