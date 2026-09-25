import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const amount = Number(body.amount)
  const direction = body.direction
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  }
  if (!['to_play', 'to_core'].includes(direction)) {
    return NextResponse.json({ error: 'Direction must be "to_play" or "to_core"' }, { status: 400 })
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const walletResult = await client.query(
      'SELECT id,balance_trx,play_balance FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE',
      [user.id]
    )
    const wallet = walletResult.rows[0]
    if (!wallet) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const coreBalance = Number(wallet.balance_trx) || 0
    const playBalance = Number(wallet.play_balance) || 0
    const sourceBalance = direction === 'to_play' ? coreBalance : playBalance
    if (sourceBalance < amount) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Insufficient balance', available: sourceBalance, requested: amount }, { status: 400 })
    }

    const newCore = direction === 'to_play' ? coreBalance - amount : coreBalance + amount
    const newPlay = direction === 'to_play' ? playBalance + amount : playBalance - amount
    await client.query(
      'UPDATE wallets SET balance_trx=$1,play_balance=$2,updated_at=NOW() WHERE user_id=$3::uuid AND is_primary=true',
      [newCore, newPlay, user.id]
    )
    await client.query(
      `INSERT INTO ledger_entries
        (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at)
       VALUES (gen_random_uuid(),$1::uuid,$2,$3,'Flame Coin',$4,$5,$6,NOW())`,
      [
        user.id,
        direction === 'to_play' ? 'transfer_to_play' : 'transfer_to_core',
        amount,
        direction === 'to_play' ? 'Transfer to play balance' : 'Transfer from play balance',
        sourceBalance,
        direction === 'to_play' ? newCore : newPlay,
      ]
    )
    await client.query('COMMIT')
    return NextResponse.json({ success: true, coreBalance: newCore, playBalance: newPlay })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('Transfer error:', error)
    return NextResponse.json({ error: 'Transfer failed' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pool = getPool()
  const client = await pool.connect()
  try {
    const result = await client.query(
      'SELECT balance_trx,balance_usdt,play_balance FROM wallets WHERE user_id=$1::uuid AND is_primary=true',
      [user.id]
    )
    const wallet = result.rows[0]
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    const coreBalance = Number(wallet.balance_trx) || 0
    const playBalance = Number(wallet.play_balance) || 0
    return NextResponse.json({
      coreBalance,
      usdtBalance: Number(wallet.balance_usdt) || 0,
      playBalance,
      totalFlameCoin: coreBalance + playBalance,
    })
  } catch (error) {
    console.error('Wallet fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 })
  } finally {
    client.release()
  }
}
