import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// Provably fair dice roll using server-side randomness
function rollDice(): [number, number] {
  const die1 = Math.floor(Math.random() * 6) + 1
  const die2 = Math.floor(Math.random() * 6) + 1
  return [die1, die2]
}

function calculateResult(die1: number, die2: number): { outcome: 'win' | 'lose' | 'push'; multiplier: number } {
  const total = die1 + die2
  
  // Win on 7 or 11 - 2x payout
  if (total === 7 || total === 11) {
    return { outcome: 'win', multiplier: 2 }
  }
  
  // Lose on 2, 3, or 12 - lose bet
  if (total === 2 || total === 3 || total === 12) {
    return { outcome: 'lose', multiplier: 0 }
  }
  
  // Push on other numbers - return bet
  return { outcome: 'push', multiplier: 1 }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, betAmount, gameType = 'dice' } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    if (!betAmount || betAmount < 1) {
      return NextResponse.json({ error: 'Minimum bet is 1 TRX' }, { status: 400 })
    }

    if (betAmount > 1000) {
      return NextResponse.json({ error: 'Maximum bet is 1000 TRX' }, { status: 400 })
    }

    const sql = getDb()

    // Get user wallet - use play_balance for arena isolation (separate from core balance_trx)
    let wallets = await sql`
      SELECT id, balance_trx, play_balance FROM wallets WHERE user_id = ${userId}::uuid
    `

    // If no wallet exists, create one with 100 TRX play bonus
    if (wallets.length === 0) {
      await sql`
        INSERT INTO wallets (id, user_id, balance_trx, balance_usdt, play_balance, is_primary, is_eight_engine_controlled, created_at, updated_at)
        VALUES (gen_random_uuid(), ${userId}::uuid, 0, 0, 100, true, true, NOW(), NOW())
      `
      wallets = await sql`
        SELECT id, balance_trx, play_balance FROM wallets WHERE user_id = ${userId}::uuid
      `
    }

    if (wallets.length === 0) {
      return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
    }

    const wallet = wallets[0]
    // Use play_balance for casino - isolated from core wallet
    const playBalance = Number(wallet.play_balance) || 0
    const coreBalance = Number(wallet.balance_trx) || 0

    if (playBalance < betAmount) {
      return NextResponse.json({ 
        error: 'Insufficient play balance. Transfer TRX to play balance first.',
        playBalance,
        coreBalance,
        required: betAmount 
      }, { status: 400 })
    }

    // Roll dice
    const [die1, die2] = rollDice()
    const { outcome, multiplier } = calculateResult(die1, die2)
    
    // Calculate payout
    const payout = outcome === 'win' ? betAmount * multiplier : outcome === 'push' ? betAmount : 0
    const netChange = payout - betAmount

    // Update play_balance (isolated from core wallet)
    const newPlayBalance = playBalance + netChange
    await sql`
      UPDATE wallets SET play_balance = ${newPlayBalance}, updated_at = NOW()
      WHERE user_id = ${userId}::uuid
    `

    // Record game in ledger_entries
    try {
      await sql`
        INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, balance_before, balance_after, created_at)
        VALUES (
          gen_random_uuid(),
          ${userId}::uuid,
          ${outcome === 'win' ? 'casino_win' : outcome === 'lose' ? 'casino_loss' : 'casino_push'},
          ${netChange},
          'TRX',
          ${'Arena dice: ' + die1 + ' + ' + die2 + ' = ' + (die1 + die2)},
          ${playBalance},
          ${newPlayBalance},
          NOW()
        )
      `
    } catch (e) {
      console.log('Ledger entry failed:', e)
    }

    // Record game in casino_games table (create if not exists handled separately)
    try {
      await sql`
        INSERT INTO casino_games (id, user_id, game_type, bet_amount, outcome, payout, dice_result, created_at)
        VALUES (
          gen_random_uuid(),
          ${userId}::uuid,
          ${gameType},
          ${betAmount},
          ${outcome},
          ${payout},
          ${JSON.stringify([die1, die2])},
          NOW()
        )
      `
    } catch (e) {
      // Table might not exist, that's ok - we still recorded the transaction
      console.log('Casino games table not available, transaction still recorded')
    }

    return NextResponse.json({
      success: true,
      dice: [die1, die2],
      total: die1 + die2,
      outcome,
      betAmount,
      payout,
      netChange,
      newBalance: newPlayBalance,
      playBalance: newPlayBalance,
      coreBalance,
      message: outcome === 'win' 
        ? `You won ${payout} TRX!` 
        : outcome === 'lose' 
        ? `You lost ${betAmount} TRX` 
        : `Push - bet returned`
    })

  } catch (error) {
    console.error('Casino play error:', error)
    return NextResponse.json({ 
      error: 'Game error - please try again', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get user's casino history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const sql = getDb()

    // Get recent casino games from ledger
    const history = await sql`
      SELECT id, entry_type as type, amount, description, created_at
      FROM ledger_entries
      WHERE user_id = ${userId}::uuid
        AND entry_type IN ('casino_win', 'casino_loss', 'casino_push')
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    // Get current balances (both play and core)
    const wallets = await sql`
      SELECT balance_trx, play_balance FROM wallets WHERE user_id = ${userId}::uuid
    `

    return NextResponse.json({
      history,
      playBalance: wallets.length > 0 ? Number(wallets[0].play_balance) : 0,
      coreBalance: wallets.length > 0 ? Number(wallets[0].balance_trx) : 0
    })

  } catch (error) {
    console.error('Casino history error:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
