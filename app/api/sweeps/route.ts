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

    // Only creator can view pending sweeps
    const { neon } = await import('@/lib/pg-neon')
    const sql = neon(process.env.DATABASE_URL || '')
    
    const user = await sql`SELECT role FROM users WHERE id = ${session.user.id}`
    if (user[0]?.role !== 'creator') {
      return NextResponse.json({ error: 'Forbidden - Creator access required' }, { status: 403 })
    }

    // Get all pending sweeps
    const sweeps = await sql`
      SELECT 
        sa.id,
        sa.amount_trx,
        sa.status,
        sa.created_at,
        sa.approved_at,
        sa.executed_at,
        sa.transaction_hash,
        uw.name as created_by_name,
        auw.name as approved_by_name
      FROM sweeps_approval sa
      LEFT JOIN users uw ON sa.created_by = uw.id
      LEFT JOIN users auw ON sa.approved_by = auw.id
      ORDER BY sa.created_at DESC
    `

    return NextResponse.json({ sweeps })
  } catch (error) {
    console.error('[v0] Error fetching sweeps:', error)
    return NextResponse.json({ error: 'Failed to fetch sweeps' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount, action, sweepId } = await request.json()

    const { neon } = await import('@/lib/pg-neon')
    const sql = neon(process.env.DATABASE_URL || '')

    // Check if user is creator
    const user = await sql`SELECT id, role FROM users WHERE id = ${session.user.id}`
    if (user[0]?.role !== 'creator') {
      return NextResponse.json({ error: 'Forbidden - Creator access required' }, { status: 403 })
    }

    // Get wallet IDs
    const wallets = await sql`
      SELECT w.id, w.tron_address, w.is_eight_engine_controlled 
      FROM wallets w 
      JOIN users u ON w.user_id = u.id 
      WHERE u.name IN ('PLATFORM_WALLET', 'RAY')
      ORDER BY u.name ASC
    `

    const platformWallet = wallets.find((w: any) => w.tron_address === 'TNzNPekX1tbeFYRe3DPjnNV2dG6QfvHymte')
    const companyWallet = wallets.find((w: any) => w.tron_address === 'THGBvmPt3XEb8mbSRXViA93GkW3PpCanJk')

    if (!platformWallet || !companyWallet) {
      return NextResponse.json({ error: 'Wallets not configured' }, { status: 400 })
    }

    if (action === 'request') {
      // Create sweep request
      const result = await sql`
        INSERT INTO sweeps_approval (from_wallet_id, to_wallet_id, amount_trx, status, created_by)
        VALUES (${platformWallet.id}, ${companyWallet.id}, ${amount}, 'pending', ${session.user.id})
        RETURNING id, amount_trx, status, created_at
      `

      return NextResponse.json({
        success: true,
        message: `Sweep request created for ${amount} TRX`,
        sweep: result[0],
      })
    } else if (action === 'approve') {
      // Approve sweep
      const result = await sql`
        UPDATE sweeps_approval 
        SET status = 'approved', approved_by = ${session.user.id}, approved_at = NOW()
        WHERE id = ${sweepId}
        RETURNING id, status, approved_at
      `

      return NextResponse.json({
        success: true,
        message: 'Sweep approved. Eight Engine will execute the transfer.',
        sweep: result[0],
      })
    } else if (action === 'reject') {
      // Reject sweep
      const result = await sql`
        UPDATE sweeps_approval 
        SET status = 'rejected', approved_by = ${session.user.id}, approved_at = NOW()
        WHERE id = ${sweepId}
        RETURNING id, status
      `

      return NextResponse.json({
        success: true,
        message: 'Sweep rejected.',
        sweep: result[0],
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[v0] Error managing sweeps:', error)
    return NextResponse.json({ error: 'Failed to process sweep' }, { status: 500 })
  }
}
