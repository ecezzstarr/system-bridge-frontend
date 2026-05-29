import { NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Lazy load neon to avoid build-time issues
    const { neon } = await import('@/lib/pg-neon')
    const sql = neon(process.env.DATABASE_URL || '')

    // Check if user is admin
    const userResult = await sql`SELECT role FROM users WHERE id = ${session.user.id}`
    const user = userResult[0]
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get platform stats
    const walletStats = await sql`
      SELECT 
        COALESCE(SUM(CAST(balance AS DECIMAL)), 0) as total_balance,
        COUNT(*) as total_users
      FROM wallets
      WHERE is_active = true
    `

    const escrowStats = await sql`
      SELECT 
        COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_locked
      FROM escrow
      WHERE status = 'locked'
    `

    const transactionStats = await sql`
      SELECT COUNT(*) as total_transactions
      FROM transactions
    `

    const inTransitStats = await sql`
      SELECT 
        COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_in_transit
      FROM transactions
      WHERE status = 'pending'
    `

    // Get top wallets
    const topWallets = await sql`
      SELECT 
        u.id as user_id,
        u.username,
        u.role,
        u.departmental_code as department,
        COALESCE(w.balance::DECIMAL, 0) as balance
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE u.is_active = true
      ORDER BY w.balance DESC
      LIMIT 10
    `

    // Get wallet tier distribution
    const tierDistribution = await sql`
      SELECT 
        CASE 
          WHEN CAST(balance AS DECIMAL) >= 25000 THEN 'diamond'
          WHEN CAST(balance AS DECIMAL) >= 10000 THEN 'platinum'
          WHEN CAST(balance AS DECIMAL) >= 5000 THEN 'gold'
          WHEN CAST(balance AS DECIMAL) >= 1000 THEN 'silver'
          ELSE 'bronze'
        END as tier,
        COUNT(*) as count
      FROM wallets
      WHERE is_active = true
      GROUP BY tier
    `

    // Get recent activity
    const recentActivity = await sql`
      SELECT 
        t.id,
        t.type,
        COALESCE(t.amount::DECIMAL, 0) as amount,
        u.username,
        t.created_at as timestamp
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 20
    `

    const tierMap: Record<string, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
    }

    tierDistribution.forEach((tier: Record<string, unknown>) => {
      tierMap[tier.tier as string] = tier.count as number
    })

    return NextResponse.json({
      platformStats: {
        totalBalance: walletStats[0]?.total_balance || 0,
        totalLockedInEscrow: escrowStats[0]?.total_locked || 0,
        totalInTransit: inTransitStats[0]?.total_in_transit || 0,
        totalUsers: walletStats[0]?.total_users || 0,
        totalTransactions: transactionStats[0]?.total_transactions || 0,
      },
      topWallets: topWallets || [],
      recentActivity: recentActivity || [],
      walletTiers: tierMap,
    })
  } catch (error) {
    console.error('[v0] Fund wall error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch fund wall data' },
      { status: 500 }
    )
  }
}
