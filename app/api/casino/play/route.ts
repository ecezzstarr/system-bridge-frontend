import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { sql, getPool } from '@/lib/db'
import { creditBridgerActivityCommission } from '@/lib/bridger-commission-router'

// Platform wallet ID (company wallet for casino operations)
const PLATFORM_WALLET_USER_ID = 'be4f0618-d666-4e13-ae8f-13c986784ff7'
const PUSH_RETURN_PERCENT = 50 // on a push, player gets this % of their stake back

function rollDice(): [number, number] {
  // crypto.randomInt uses the OS CSPRNG (not predictable like Math.random)
  const die1 = randomInt(1, 7) // inclusive-exclusive: 1..6
  const die2 = randomInt(1, 7)
  return [die1, die2]
}

function calculateResult(die1: number, die2: number): { outcome: 'win' | 'lose' | 'push'; multiplier: number } {
  const total = die1 + die2
  if (total === 7 || total === 11) {
    return { outcome: 'win', multiplier: 2 }
  }
  if (total === 2 || total === 3 || total === 12) {
    return { outcome: 'lose', multiplier: 0 }
  }
  return { outcome: 'push', multiplier: 0 }
}

export async function POST(request: NextRequest) {
  const pool = getPool()
  const client = await pool.connect()

  try {
    const { userId, betAmount, gameType = 'dice' } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const playerRes = await client.query(
      "SELECT id FROM users WHERE id = $1::uuid AND role = 'client' AND is_active = true LIMIT 1",
      [userId]
    )
    if (playerRes.rows.length === 0) {
      return NextResponse.json({ error: 'Casino participation is reserved for Client players' }, { status: 403 })
    }

    if (!betAmount || betAmount < 2) {
      return NextResponse.json({ error: 'Minimum bet is 2 TRX' }, { status: 400 })
    }

    if (betAmount > 1000) {
      return NextResponse.json({ error: 'Maximum bet is 1000 TRX' }, { status: 400 })
    }

    await client.query('BEGIN')

    try {
      let walletsRes = await client.query(
        'SELECT id, balance_trx FROM wallets WHERE user_id = $1::uuid FOR UPDATE',
        [userId]
      )

      if (walletsRes.rows.length === 0) {
        await client.query(
          `INSERT INTO wallets (id, user_id, balance_trx, balance_usdt, play_balance, is_primary, is_eight_engine_controlled, created_at, updated_at)
           VALUES (gen_random_uuid(), $1::uuid, 0, 0, 0, true, true, NOW(), NOW())`,
          [userId]
        )
        walletsRes = await client.query(
          'SELECT id, balance_trx FROM wallets WHERE user_id = $1::uuid FOR UPDATE',
          [userId]
        )
      }

      if (walletsRes.rows.length === 0) {
        throw new Error('WALLET_CREATE_FAILED')
      }

      const wallet = walletsRes.rows[0]
      const balance = Number(wallet.balance_trx) || 0

      if (balance < betAmount) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      const [die1, die2] = rollDice()
      const { outcome, multiplier } = calculateResult(die1, die2)

      // No platform fee. Win pays out on the full stake. Push returns a
      // fraction of the stake. Lose returns nothing.
      const payout =
        outcome === 'win' ? betAmount * multiplier :
        outcome === 'push' ? betAmount * (PUSH_RETURN_PERCENT / 100) :
        0

      // Player's balance: always loses the full bet, then gains payout if any.
      const netChange = payout - betAmount
      const newBalance = balance + netChange

      await client.query(
        'UPDATE wallets SET balance_trx = $1, updated_at = NOW() WHERE user_id = $2::uuid',
        [newBalance, userId]
      )

      // Platform wallet: receives the bet minus whatever was paid out.
      await client.query(
        'UPDATE wallets SET balance_trx = balance_trx + $1, updated_at = NOW() WHERE user_id = $2::uuid',
        [betAmount - payout, PLATFORM_WALLET_USER_ID]
      )

      try {
        const entryType = outcome === 'win' ? 'earning' : 'fee'
        await client.query(
          `INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, balance_before, balance_after, created_at)
           VALUES (gen_random_uuid(), $1::uuid, $2, $3, 'TRX', $4, $5, $6, NOW())`,
          [
            userId,
            entryType,
            netChange,
            `Casino dice (${outcome}): ${die1} + ${die2} = ${die1 + die2}`,
            balance,
            newBalance,
          ]
        )
      } catch (e) {
        console.log('Ledger entry failed:', e)
      }

      try {
        await client.query(
          `INSERT INTO casino_games (id, user_id, game_type, bet_amount, outcome, payout, dice_result, created_at)
           VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, NOW())`,
          [userId, gameType, betAmount, outcome, payout, JSON.stringify([die1, die2])]
        )
      } catch (e) {
        console.log('Casino games table not available')
      }

      await client.query('COMMIT')

      if (outcome === 'win') {
        creditBridgerActivityCommission({
          bridgerId: userId,
          activity: 'casino_win',
          baseAmount: payout,
          description: `30% commission: referred Bridger won ${payout.toFixed(2)} TRX at Casino`,
        }).catch(err => console.error('[casino play] commission error:', err))
      }

      return NextResponse.json({
        success: true,
        dice: [die1, die2],
        total: die1 + die2,
        outcome,
        betAmount,
        payout,
        netChange,
        newBalance,
        hostedBy: 'Platform',
        message: outcome === 'win'
          ? `You won ${payout.toFixed(6)} TRX!`
          : outcome === 'lose'
          ? `You lost ${betAmount} TRX to the platform`
          : `Push - ${PUSH_RETURN_PERCENT}% of your stake returned (${payout.toFixed(6)} TRX)`
      })
    } catch (innerError) {
      await client.query('ROLLBACK')
      throw innerError
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: 'Insufficient balance. Please deposit to play.' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'WALLET_CREATE_FAILED') {
      return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
    }
    console.error('Casino play error:', error)
    return NextResponse.json({
      error: 'Game error - please try again',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const history = await sql`
      SELECT id, entry_type as type, amount, description, created_at
      FROM ledger_entries
      WHERE user_id = ${userId}::uuid
        AND entry_type IN ('casino_win', 'casino_loss', 'casino_push')
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    const wallets = await sql`
      SELECT balance_trx FROM wallets WHERE user_id = ${userId}::uuid
    `

    const balance = wallets.length > 0 ? Number(wallets[0].balance_trx) : 0

    return NextResponse.json({
      history,
      balance,
      playBalance: balance,
      coreBalance: balance
    })

  } catch (error) {
    console.error('Casino history error:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
