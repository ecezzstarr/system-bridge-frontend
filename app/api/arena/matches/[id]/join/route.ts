import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Platform wallet ID (company wallet for commission)
const PLATFORM_WALLET_USER_ID = 'be4f0618-d666-4e13-ae8f-13c986784ff7'

// POST /api/arena/matches/[id]/join - Join a match
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId, prediction } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get match
    const matches = await sql`SELECT * FROM arena_matches WHERE id = ${id}`
    if (matches.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const match = matches[0]

    if (match.status !== 'upcoming') {
      return NextResponse.json({ error: 'Match is not open for joining' }, { status: 400 })
    }

    // Check if already joined
    const existing = await sql`
      SELECT id FROM arena_participants WHERE match_id = ${id} AND user_id = ${userId}
    `
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Already joined this match' }, { status: 400 })
    }

    // Check participant count
    const countResult = await sql`
      SELECT COUNT(*) as count FROM arena_participants WHERE match_id = ${id}
    `
    if (parseInt(countResult[0].count) >= match.max_participants) {
      return NextResponse.json({ error: 'Match is full' }, { status: 400 })
    }

    const entryFee = parseFloat(match.entry_fee) || 0

    // Check wallet balance (use balance_trx for arena entry fees)
    const wallets = await sql`SELECT balance_trx FROM wallets WHERE user_id = ${userId}::uuid`
    const balance = wallets.length > 0 ? parseFloat(wallets[0].balance_trx) : 0

    if (balance < entryFee) {
      return NextResponse.json({ 
        error: 'Insufficient balance', 
        required: entryFee,
        available: balance
      }, { status: 400 })
    }

    // Join match
    const partId = `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await sql`
      INSERT INTO arena_participants (id, match_id, user_id, prediction)
      VALUES (${partId}, ${id}, ${userId}, ${prediction || null})
    `

    // Deduct entry fee from user and add to prize pool (with 10% commission)
    if (entryFee > 0) {
      const commission = entryFee * 0.10
      const netToPrizePool = entryFee - commission

      // Deduct from user's wallet
      await sql`
        UPDATE wallets SET balance_trx = balance_trx - ${entryFee}, updated_at = NOW()
        WHERE user_id = ${userId}::uuid
      `
      
      // Add commission to platform wallet
      await sql`
        UPDATE wallets SET balance_trx = balance_trx + ${commission}, updated_at = NOW()
        WHERE user_id = ${PLATFORM_WALLET_USER_ID}::uuid
      `

      // Add net amount to match prize pool
      await sql`
        UPDATE arena_matches SET prize_pool = prize_pool + ${netToPrizePool} WHERE id = ${id}
      `

      // Record ledger entry
      try {
        await sql`
          INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, created_at)
          VALUES (
            gen_random_uuid(),
            ${userId}::uuid,
            'arena_entry_fee',
            ${-entryFee},
            'TRX',
            ${'Arena entry fee: ' + match.title},
            NOW()
          )
        `
      } catch (e) {
        console.log('Ledger entry failed:', e)
      }
    }

    // Get updated prize pool
    const updatedMatch = await sql`SELECT prize_pool FROM arena_matches WHERE id = ${id}`
    const newPrizePool = updatedMatch.length > 0 ? parseFloat(updatedMatch[0].prize_pool) : 0

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully joined match',
      entryFee,
      prizePool: newPrizePool,
      potentialWinnings: newPrizePool * 0.70 // 70% to winner
    })
  } catch (error) {
    console.error('Error joining match:', error)
    return NextResponse.json({ error: 'Failed to join match' }, { status: 500 })
  }
}
