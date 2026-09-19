import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql, getPool } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthUser(request)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
    const { withdrawalId, status, rejectionNote } = await request.json()
    if (!withdrawalId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 })
    }
    const p = getPool()
    const client = await p.connect()
    try {
      await client.query('BEGIN')
      const wdResult = await client.query('SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE', [withdrawalId])
      const withdrawal = wdResult.rows[0]
      if (!withdrawal || withdrawal.status !== 'pending') {
        throw new Error('Withdrawal not found or not in pending status')
      }
      const amountTrx = parseFloat(withdrawal.amount_trx)
      if (status === 'approved') {
        const walletResult = await client.query('SELECT * FROM wallets WHERE user_id = $1::uuid FOR UPDATE', [withdrawal.user_id])
        const wallet = walletResult.rows[0]
        if (!wallet) {
          throw new Error('User wallet not found')
        }
        const currentBalance = parseFloat(wallet.balance_trx)
        if (currentBalance < amountTrx) {
          throw new Error('User balance is insufficient to complete this withdrawal')
        }
        const newBalance = currentBalance - amountTrx
        await client.query('UPDATE wallets SET balance_trx = $1, updated_at = NOW() WHERE id = $2', [newBalance, wallet.id])
      }
      const updated = await client.query(
        'UPDATE withdrawal_requests SET status = $1, admin_note = COALESCE($2, admin_note), updated_at = NOW() WHERE id = $3 RETURNING *',
        [status, rejectionNote || null, withdrawalId]
      )
      await client.query('COMMIT')
      return NextResponse.json({ success: true, withdrawal: updated.rows[0], message: 'Withdrawal ' + status + ' successfully.' })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Withdrawal verification error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
