import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { neon } from '@/lib/pg-neon'

const getDb = () => neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const amount = Number(body.amount)
    const direction = body.direction
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    if (!['to_play', 'to_core'].includes(direction)) return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })

    const sql = getDb()
    const wallets = await sql`SELECT id, balance_trx, play_balance FROM wallets WHERE user_id = ${user.id}::uuid AND is_primary = true LIMIT 1`
    if (!wallets.length) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    const wallet = wallets[0]
    const core = Number(wallet.balance_trx) || 0
    const play = Number(wallet.play_balance) || 0

    if (direction === 'to_play') {
      if (core < amount) return NextResponse.json({ error: 'Insufficient core balance' }, { status: 400 })
      const updated = await sql`UPDATE wallets SET balance_trx = balance_trx - ${amount}, play_balance = play_balance + ${amount}, updated_at = NOW() WHERE id = ${wallet.id} AND user_id = ${user.id}::uuid AND balance_trx >= ${amount} RETURNING balance_trx, play_balance`
      if (!updated.length) return NextResponse.json({ error: 'Balance changed; please retry' }, { status: 409 })
      await sql`INSERT INTO ledger_entries (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at) VALUES (gen_random_uuid(),${user.id}::uuid,'transfer_to_play',${amount},'TRX','Transfer to arena play balance',${core},${updated[0].balance_trx},NOW())`
      return NextResponse.json({ success: true, coreBalance: Number(updated[0].balance_trx), playBalance: Number(updated[0].play_balance) })
    }

    if (play < amount) return NextResponse.json({ error: 'Insufficient play balance' }, { status: 400 })
    const updated = await sql`UPDATE wallets SET balance_trx = balance_trx + ${amount}, play_balance = play_balance - ${amount}, updated_at = NOW() WHERE id = ${wallet.id} AND user_id = ${user.id}::uuid AND play_balance >= ${amount} RETURNING balance_trx, play_balance`
    if (!updated.length) return NextResponse.json({ error: 'Balance changed; please retry' }, { status: 409 })
    await sql`INSERT INTO ledger_entries (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at) VALUES (gen_random_uuid(),${user.id}::uuid,'transfer_to_core',${amount},'TRX','Transfer from arena to core wallet',${play},${updated[0].play_balance},NOW())`
    return NextResponse.json({ success: true, coreBalance: Number(updated[0].balance_trx), playBalance: Number(updated[0].play_balance) })
  } catch (error) {
    console.error('Transfer error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Transfer failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const sql = getDb()
    const wallets = await sql`SELECT balance_trx, balance_usdt, play_balance FROM wallets WHERE user_id = ${user.id}::uuid AND is_primary = true LIMIT 1`
    if (!wallets.length) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    const w = wallets[0]
    return NextResponse.json({ coreBalance: Number(w.balance_trx) || 0, usdtBalance: Number(w.balance_usdt) || 0, playBalance: Number(w.play_balance) || 0, totalTRX: (Number(w.balance_trx) || 0) + (Number(w.play_balance) || 0) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Wallet fetch error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 })
  }
}
