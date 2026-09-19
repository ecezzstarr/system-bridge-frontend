import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is creator (only creator can access company wallet)
    const userResult = await sql`SELECT role FROM users WHERE id = ${session.user.id}::uuid`
    const user = userResult[0]
    if (user?.role !== 'creator') {
      return NextResponse.json({ error: 'Forbidden - Creator access required' }, { status: 403 })
    }

    // Get creator's personal wallet (company wallet)
    const companyWalletResult = await sql`
      SELECT w.* FROM wallets w
      JOIN users u ON w.user_id = u.id
      WHERE u.role = 'creator'
      LIMIT 1
    `

    // Get platform wallet (system wallet where all funds are stored)
    const platformWalletResult = await sql`
      SELECT w.* FROM wallets w
      JOIN users u ON w.user_id = u.id
      WHERE u.name = 'PLATFORM_WALLET'
      LIMIT 1
    `

    const companyWallet = companyWalletResult[0]
    const platformWallet = platformWalletResult[0]
    
    // Get locked funds in escrow (platform wallet funds)
    const escrowStats = await sql`
      SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_locked
      FROM escrow
      WHERE status = 'locked' AND currency = 'TRX'
    `

    // Get total transaction count
    const txStats = await sql`
      SELECT COUNT(*) as total_transactions
      FROM transactions
      WHERE currency = 'TRX' AND status = 'completed'
    `

    // Get recent sweeps from platform wallet to company wallet
    const recentSweeps = await sql`
      SELECT * FROM transactions
      WHERE type = 'sweep' AND currency = 'TRX' AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      companyWallet: {
        id: companyWallet?.id,
        address: companyWallet?.tron_address,
        trx: parseFloat(companyWallet?.balance_trx) || 0,
        usdt: parseFloat(companyWallet?.balance_usdt) || 0,
      },
      platformWallet: {
        id: platformWallet?.id,
        address: platformWallet?.tron_address,
        trx: parseFloat(platformWallet?.balance_trx) || 0,
        usdt: parseFloat(platformWallet?.balance_usdt) || 0,
      },
      stats: {
        totalLocked: parseFloat((escrowStats as any[])[0]?.total_locked || 0),
        totalTransactions: parseInt((txStats as any[])[0]?.total_transactions || 0),
        lastSweep: (recentSweeps as any[])[0]?.completed_at || null,
      },
      recentSweeps: (recentSweeps as any[]).map((tx: any) => ({
        id: tx.id,
        amount: tx.amount,
        from: tx.from_address,
        to: tx.to_address,
        completedAt: tx.completed_at,
      })),
    })
  } catch (error: unknown) {
    console.error('[v0] Fund wall error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
