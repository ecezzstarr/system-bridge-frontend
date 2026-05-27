import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// Platform wallet ID (company wallet)
const PLATFORM_WALLET_USER_ID = 'be4f0618-d666-4e13-ae8f-13c986784ff7'

// Arena split: Winner gets 70%, Platform gets 30%
const WINNER_PERCENTAGE = 0.70
const PLATFORM_PERCENTAGE = 0.30

// POST /api/arena/matches/[id]/complete - Complete a match and distribute prizes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { winnerId, adminId } = body

    if (!winnerId) {
      return NextResponse.json({ error: 'Winner ID required' }, { status: 400 })
    }

    const sql = getDb()

    // Get match
    const matches = await sql`SELECT * FROM arena_matches WHERE id = ${id}`
    if (matches.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const match = matches[0]

    if (match.status === 'completed') {
      return NextResponse.json({ error: 'Match already completed' }, { status: 400 })
    }

    // Verify winner is a participant
    const participants = await sql`
      SELECT user_id FROM arena_participants WHERE match_id = ${id}
    `
    const participantIds = participants.map((p: any) => p.user_id)
    
    if (!participantIds.includes(winnerId)) {
      return NextResponse.json({ error: 'Winner must be a match participant' }, { status: 400 })
    }

    const prizePool = parseFloat(match.prize_pool) || 0
    
    if (prizePool <= 0) {
      // No prize pool, just mark as completed
      await sql`
        UPDATE arena_matches 
        SET status = 'completed', winner_id = ${winnerId}, ended_at = NOW()
        WHERE id = ${id}
      `
      return NextResponse.json({ 
        success: true, 
        message: 'Match completed (no prize pool)',
        winnerPayout: 0,
        platformFee: 0
      })
    }

    // Calculate split: Winner 70%, Platform 30%
    const winnerPayout = prizePool * WINNER_PERCENTAGE
    const platformFee = prizePool * PLATFORM_PERCENTAGE

    // Credit winner's wallet
    await sql`
      UPDATE wallets 
      SET balance_trx = balance_trx + ${winnerPayout}, updated_at = NOW()
      WHERE user_id = ${winnerId}::uuid
    `

    // Credit platform wallet with 30%
    await sql`
      UPDATE wallets 
      SET balance_trx = balance_trx + ${platformFee}, updated_at = NOW()
      WHERE user_id = ${PLATFORM_WALLET_USER_ID}::uuid
    `

    // Update match status
    await sql`
      UPDATE arena_matches 
      SET status = 'completed', winner_id = ${winnerId}, ended_at = NOW()
      WHERE id = ${id}
    `

    // Record ledger entries
    try {
      // Winner entry
      await sql`
        INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, created_at)
        VALUES (
          gen_random_uuid(),
          ${winnerId}::uuid,
          'arena_win',
          ${winnerPayout},
          'TRX',
          ${'Arena match win: ' + match.title + ' (70% of ' + prizePool + ' TRX prize pool)'},
          NOW()
        )
      `
      
      // Platform fee entry
      await sql`
        INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, created_at)
        VALUES (
          gen_random_uuid(),
          ${PLATFORM_WALLET_USER_ID}::uuid,
          'arena_platform_fee',
          ${platformFee},
          'TRX',
          ${'Arena platform fee: ' + match.title + ' (30% of ' + prizePool + ' TRX prize pool)'},
          NOW()
        )
      `
    } catch (e) {
      console.log('Ledger entry failed:', e)
    }

    // Get winner info
    const winners = await sql`SELECT name, username FROM users WHERE id = ${winnerId}::uuid`
    const winnerName = winners.length > 0 ? (winners[0].name || winners[0].username) : 'Unknown'

    return NextResponse.json({
      success: true,
      matchId: id,
      winnerId,
      winnerName,
      prizePool,
      winnerPayout,
      platformFee,
      message: `Match completed! ${winnerName} wins ${winnerPayout.toFixed(2)} TRX (70%). Platform fee: ${platformFee.toFixed(2)} TRX (30%)`
    })

  } catch (error) {
    console.error('Error completing match:', error)
    return NextResponse.json({ error: 'Failed to complete match' }, { status: 500 })
  }
}
