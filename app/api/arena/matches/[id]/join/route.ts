import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// POST /api/arena/matches/[id]/join - Join a match
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const sql = getDb()

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

    // Check wallet balance
    const wallets = await sql`SELECT balance FROM wallets WHERE user_id = ${userId}`
    const balance = wallets.length > 0 ? parseFloat(wallets[0].balance) : 0

    if (balance < parseFloat(match.entry_fee)) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    // Join match
    const partId = `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await sql`
      INSERT INTO arena_participants (id, match_id, user_id)
      VALUES (${partId}, ${id}, ${userId})
    `

    // Deduct entry fee
    if (parseFloat(match.entry_fee) > 0) {
      await sql`
        UPDATE wallets SET balance = balance - ${match.entry_fee} WHERE user_id = ${userId}
      `
      // Add to prize pool
      await sql`
        UPDATE arena_matches SET prize_pool = prize_pool + ${match.entry_fee} WHERE id = ${id}
      `
    }

    return NextResponse.json({ success: true, message: 'Successfully joined match' })
  } catch (error) {
    console.error('Error joining match:', error)
    return NextResponse.json({ error: 'Failed to join match' }, { status: 500 })
  }
}
