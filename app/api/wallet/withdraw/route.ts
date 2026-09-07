import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { neon } from '@/lib/pg-neon'

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const amount = Number(body.amount)
    const address = typeof body.address === 'string' ? body.address.trim() : ''
    if (!Number.isFinite(amount) || amount < 10 || !address) return NextResponse.json({ success: false, error: 'Invalid withdrawal request' }, { status: 400 })

    // Base58 TRON address shape check. The final on-chain validation must occur before payout.
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) return NextResponse.json({ success: false, error: 'Invalid TRON wallet address' }, { status: 400 })

    const sql = neon(process.env.DATABASE_URL!)
    const wallets = await sql`SELECT id, balance_trx FROM wallets WHERE user_id = ${user.id}::uuid AND is_primary = true LIMIT 1`
    if (!wallets.length) return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 })

    const balance = Number(wallets[0].balance_trx) || 0
    if (balance < amount) return NextResponse.json({ success: false, error: 'Insufficient balance' }, { status: 400 })

    const reference = `WD-${crypto.randomUUID()}`
    // Hold funds by deducting them before creating the pending request.
    const updated = await sql`
      UPDATE wallets
      SET balance_trx = balance_trx - ${amount}, updated_at = NOW()
      WHERE id = ${wallets[0].id} AND user_id = ${user.id}::uuid AND balance_trx >= ${amount}
      RETURNING balance_trx
    `
    if (!updated.length) return NextResponse.json({ success: false, error: 'Balance changed; please retry' }, { status: 409 })

    try {
      await sql`
        INSERT INTO withdrawal_requests (user_id, amount, address, reference, status, created_at)
        VALUES (${user.id}::uuid, ${amount}, ${address}, ${reference}, 'pending', NOW())
      `
    } catch {
      // Roll back the hold if the request could not be persisted.
      await sql`UPDATE wallets SET balance_trx = balance_trx + ${amount}, updated_at = NOW() WHERE id = ${wallets[0].id} AND user_id = ${user.id}::uuid`
      return NextResponse.json({ success: false, error: 'Withdrawal request could not be created' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Withdrawal request submitted', reference, newBalance: Number(updated[0].balance_trx) || 0 }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Withdrawal error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, error: 'Withdrawal failed' }, { status: 500 })
  }
}
