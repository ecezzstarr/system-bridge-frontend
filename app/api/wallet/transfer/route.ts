import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// Transfer between core wallet (balance_trx) and play balance
export async function POST(request: NextRequest) {
  try {
    const { userId, amount, direction } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }

    if (!direction || !['to_play', 'to_core'].includes(direction)) {
      return NextResponse.json({ error: 'Direction must be "to_play" or "to_core"' }, { status: 400 })
    }

    const sql = getDb()

    // Get current balances
    const wallets = await sql`
      SELECT id, balance_trx, play_balance FROM wallets WHERE user_id = ${userId}::uuid
    `

    if (wallets.length === 0) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const wallet = wallets[0]
    const coreBalance = Number(wallet.balance_trx) || 0
    const playBalance = Number(wallet.play_balance) || 0

    if (direction === 'to_play') {
      // Transfer from core to play balance
      if (coreBalance < amount) {
        return NextResponse.json({ 
          error: 'Insufficient core balance',
          coreBalance,
          requested: amount
        }, { status: 400 })
      }

      const newCore = coreBalance - amount
      const newPlay = playBalance + amount

      await sql`
        UPDATE wallets 
        SET balance_trx = ${newCore}, play_balance = ${newPlay}, updated_at = NOW()
        WHERE user_id = ${userId}::uuid
      `

      // Record in ledger
      await sql`
        INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, balance_before, balance_after, created_at)
        VALUES (gen_random_uuid(), ${userId}::uuid, 'transfer_to_play', ${amount}, 'TRX', 'Transfer to arena play balance', ${coreBalance}, ${newCore}, NOW())
      `

      return NextResponse.json({
        success: true,
        message: `Transferred ${amount} TRX to play balance`,
        coreBalance: newCore,
        playBalance: newPlay
      })

    } else {
      // Transfer from play to core balance
      if (playBalance < amount) {
        return NextResponse.json({ 
          error: 'Insufficient play balance',
          playBalance,
          requested: amount
        }, { status: 400 })
      }

      const newPlay = playBalance - amount
      const newCore = coreBalance + amount

      await sql`
        UPDATE wallets 
        SET balance_trx = ${newCore}, play_balance = ${newPlay}, updated_at = NOW()
        WHERE user_id = ${userId}::uuid
      `

      // Record in ledger
      await sql`
        INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, balance_before, balance_after, created_at)
        VALUES (gen_random_uuid(), ${userId}::uuid, 'transfer_to_core', ${amount}, 'TRX', 'Transfer from arena to core wallet', ${playBalance}, ${newPlay}, NOW())
      `

      return NextResponse.json({
        success: true,
        message: `Transferred ${amount} TRX to core wallet`,
        coreBalance: newCore,
        playBalance: newPlay
      })
    }

  } catch (error) {
    console.error('Transfer error:', error)
    return NextResponse.json({ error: 'Transfer failed' }, { status: 500 })
  }
}

// Get wallet balances
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const sql = getDb()

    const wallets = await sql`
      SELECT balance_trx, balance_usdt, play_balance FROM wallets WHERE user_id = ${userId}::uuid
    `

    if (wallets.length === 0) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const wallet = wallets[0]

    return NextResponse.json({
      coreBalance: Number(wallet.balance_trx) || 0,
      usdtBalance: Number(wallet.balance_usdt) || 0,
      playBalance: Number(wallet.play_balance) || 0,
      totalTRX: (Number(wallet.balance_trx) || 0) + (Number(wallet.play_balance) || 0)
    })

  } catch (error) {
    console.error('Wallet fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 })
  }
}
