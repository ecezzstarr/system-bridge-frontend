import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { WORLD_RULES } from '@/lib/world/constants'

const PLATFORM_WALLET_USER_ID = 'be4f0618-d666-4e13-ae8f-13c986784ff7'
const PUSH_RETURN_PERCENT = 50

function rollDice(): [number, number] {
  return [randomInt(1, 7), randomInt(1, 7)]
}

function calculateResult(die1: number, die2: number): { outcome: 'win' | 'lose' | 'push'; multiplier: number } {
  const total = die1 + die2
  if (total === 7 || total === 11) return { outcome: 'win', multiplier: 2 }
  if (total === 2 || total === 3 || total === 12) return { outcome: 'lose', multiplier: 0 }
  return { outcome: 'push', multiplier: 0 }
}

async function ensureLossReturnSchema(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS casino_loss_returns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      week_start DATE NOT NULL,
      qualifying_losses NUMERIC(30,8) NOT NULL,
      return_amount NUMERIC(30,8) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'paid',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, week_start)
    )
  `)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pool = getPool()
  const client = await pool.connect()
  try {
    const body = await request.json()
    const betAmount = Number(body.betAmount)
    const gameType = typeof body.gameType === 'string' ? body.gameType : 'dice'

    if (!Number.isFinite(betAmount) || betAmount < 2) {
      return NextResponse.json({ error: 'Minimum bet is 2 Flame Coin' }, { status: 400 })
    }
    if (betAmount > 1000) {
      return NextResponse.json({ error: 'Maximum bet is 1000 Flame Coin' }, { status: 400 })
    }

    await client.query('BEGIN')
    await ensureLossReturnSchema(client)

    let walletResult = await client.query(
      'SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE',
      [user.id]
    )
    if (!walletResult.rows.length) {
      await client.query(
        `INSERT INTO wallets
          (id,user_id,balance_trx,balance_usdt,play_balance,is_primary,is_eight_engine_controlled,created_at,updated_at)
         VALUES (gen_random_uuid(),$1::uuid,0,0,0,true,true,NOW(),NOW())`,
        [user.id]
      )
      walletResult = await client.query(
        'SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE',
        [user.id]
      )
    }

    const balance = Number(walletResult.rows[0]?.balance_trx || 0)
    if (balance < betAmount) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Insufficient balance. Please deposit to play.' }, { status: 400 })
    }

    const [die1, die2] = rollDice()
    const { outcome, multiplier } = calculateResult(die1, die2)
    const payout =
      outcome === 'win' ? betAmount * multiplier :
      outcome === 'push' ? betAmount * (PUSH_RETURN_PERCENT / 100) :
      0

    const netChange = payout - betAmount
    let newBalance = balance + netChange

    await client.query(
      'UPDATE wallets SET balance_trx=$1,updated_at=NOW() WHERE user_id=$2::uuid AND is_primary=true',
      [newBalance, user.id]
    )
    await client.query(
      'UPDATE wallets SET balance_trx=balance_trx+$1,updated_at=NOW() WHERE user_id=$2::uuid AND is_primary=true',
      [betAmount - payout, PLATFORM_WALLET_USER_ID]
    )

    await client.query(
      `INSERT INTO ledger_entries
        (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at)
       VALUES (gen_random_uuid(),$1::uuid,$2,$3,'Flame Coin',$4,$5,$6,NOW())`,
      [
        user.id,
        outcome === 'win' ? 'casino_win' : outcome === 'push' ? 'casino_push' : 'casino_loss',
        netChange,
        `Casino dice (${outcome}): ${die1} + ${die2} = ${die1 + die2}`,
        balance,
        newBalance,
      ]
    )

    await client.query(
      `INSERT INTO casino_games
        (id,user_id,game_type,bet_amount,outcome,payout,dice_result,created_at)
       VALUES (gen_random_uuid(),$1::uuid,$2,$3,$4,$5,$6,NOW())`,
      [user.id, gameType, betAmount, outcome, payout, JSON.stringify([die1, die2])]
    ).catch(() => null)

    const week = await client.query(
      `SELECT date_trunc('week', NOW())::date AS week_start,
              COALESCE(SUM(GREATEST(bet_amount-payout,0)),0)::numeric AS losses
       FROM casino_games
       WHERE user_id=$1::uuid
         AND created_at>=date_trunc('week',NOW())
         AND created_at<date_trunc('week',NOW())+interval '7 days'`,
      [user.id]
    )

    const weekStart = week.rows[0]?.week_start
    const weeklyLosses = Number(week.rows[0]?.losses || 0)
    let lossReturn = 0

    if (weekStart && weeklyLosses >= WORLD_RULES.CASINO_WEEKLY_LOSS_THRESHOLD_FLAME_COIN) {
      const existing = await client.query(
        'SELECT id FROM casino_loss_returns WHERE user_id=$1::uuid AND week_start=$2::date LIMIT 1',
        [user.id, weekStart]
      )
      if (!existing.rows.length) {
        lossReturn = Math.round(weeklyLosses * WORLD_RULES.CASINO_LOSS_RETURN_RATE * 1e8) / 1e8
        if (lossReturn > 0) {
          await client.query(
            'UPDATE wallets SET balance_trx=balance_trx-$1,updated_at=NOW() WHERE user_id=$2::uuid AND is_primary=true',
            [lossReturn, PLATFORM_WALLET_USER_ID]
          )
          await client.query(
            'UPDATE wallets SET balance_trx=balance_trx+$1,updated_at=NOW() WHERE user_id=$2::uuid AND is_primary=true',
            [lossReturn, user.id]
          )
          newBalance += lossReturn
          await client.query(
            `INSERT INTO casino_loss_returns (user_id,week_start,qualifying_losses,return_amount,status)
             VALUES ($1::uuid,$2::date,$3,$4,'paid')`,
            [user.id, weekStart, weeklyLosses, lossReturn]
          )
          await client.query(
            `INSERT INTO ledger_entries
              (id,user_id,entry_type,amount,currency,description,balance_after,created_at)
             VALUES (gen_random_uuid(),$1::uuid,'casino_loss_return',$2,'Flame Coin',$3,$4,NOW())`,
            [user.id, lossReturn, '30% weekly Casino loss return after threshold', newBalance]
          )
        }
      }
    }

    await client.query('COMMIT')
    return NextResponse.json({
      success: true,
      dice: [die1, die2],
      total: die1 + die2,
      outcome,
      betAmount,
      payout,
      netChange,
      newBalance,
      weeklyLosses,
      weeklyLossThreshold: WORLD_RULES.CASINO_WEEKLY_LOSS_THRESHOLD_FLAME_COIN,
      lossReturn,
      hostedBy: 'Platform',
      message: lossReturn > 0
        ? `Weekly loss threshold reached. ${lossReturn.toFixed(2)} Flame Coin returned.`
        : outcome === 'win'
          ? `You won ${payout.toFixed(6)} Flame Coin.`
          : outcome === 'lose'
            ? `You lost ${betAmount} Flame Coin to the platform.`
            : `Push - ${PUSH_RETURN_PERCENT}% of your stake returned (${payout.toFixed(6)} Flame Coin).`
    })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('Casino play error:', error)
    return NextResponse.json({ error: 'Game error - please try again' }, { status: 500 })
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
    const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 10)))
    const history = await client.query(
      `SELECT id,entry_type AS type,amount,description,created_at
       FROM ledger_entries
       WHERE user_id=$1::uuid
         AND entry_type IN ('casino_win','casino_loss','casino_push','casino_loss_return')
       ORDER BY created_at DESC LIMIT $2`,
      [user.id, limit]
    )
    const wallet = await client.query(
      'SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true',
      [user.id]
    )
    const balance = Number(wallet.rows[0]?.balance_trx || 0)
    return NextResponse.json({ history: history.rows, balance, playBalance: balance, coreBalance: balance })
  } catch (error) {
    console.error('Casino history error:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  } finally {
    client.release()
  }
}
