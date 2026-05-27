import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// GET /api/arena/matches/[id] - Get single match with participants
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = getDb()

    const matches = await sql`
      SELECT 
        m.*,
        u.name as host_name,
        u.username as host_username,
        u.avatar as host_avatar
      FROM arena_matches m
      LEFT JOIN users u ON m.host_id = u.id
      WHERE m.id = ${id}
    `

    if (matches.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const match = matches[0]

    // Get participants
    const participants = await sql`
      SELECT 
        p.*,
        u.name,
        u.username,
        u.avatar
      FROM arena_participants p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.match_id = ${id}
      ORDER BY p.joined_at ASC
    `

    return NextResponse.json({
      match: {
        id: match.id,
        title: match.title,
        description: match.description,
        host: {
          id: match.host_id,
          displayName: match.host_name,
          avatar: match.host_avatar,
        },
        entryFee: parseFloat(match.entry_fee) || 0,
        prizePool: parseFloat(match.prize_pool) || 0,
        maxParticipants: match.max_participants,
        category: match.category,
        status: match.status,
        scheduledAt: match.scheduled_at,
        startedAt: match.started_at,
        endedAt: match.ended_at,
        participants: participants.map((p: any) => ({
          id: p.user_id,
          displayName: p.name,
          avatar: p.avatar,
          joinedAt: p.joined_at,
          placement: p.placement,
          payout: p.payout,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching match:', error)
    return NextResponse.json({ error: 'Failed to fetch match' }, { status: 500 })
  }
}

// PATCH /api/arena/matches/[id] - Update match (start/end/cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, winnerId, userId } = body
    const sql = getDb()

    // Verify match exists
    const matches = await sql`SELECT * FROM arena_matches WHERE id = ${id}`
    if (matches.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const match = matches[0]

    // Verify user is host
    if (userId && match.host_id !== userId) {
      return NextResponse.json({ error: 'Only host can modify match' }, { status: 403 })
    }

    if (action === 'start') {
      if (match.status !== 'upcoming') {
        return NextResponse.json({ error: 'Match cannot be started' }, { status: 400 })
      }
      await sql`
        UPDATE arena_matches 
        SET status = 'live', started_at = NOW() 
        WHERE id = ${id}
      `
      return NextResponse.json({ success: true, status: 'live' })
    }

    if (action === 'end') {
      if (match.status !== 'live') {
        return NextResponse.json({ error: 'Match is not live' }, { status: 400 })
      }

      await sql`
        UPDATE arena_matches 
        SET status = 'completed', ended_at = NOW(), winner_id = ${winnerId || null}
        WHERE id = ${id}
      `

      // Pay winner (90% of prize pool)
      if (winnerId) {
        const winnerPayout = parseFloat(match.prize_pool) * 0.9
        await sql`
          UPDATE wallets SET balance = balance + ${winnerPayout} WHERE user_id = ${winnerId}
        `
        await sql`
          UPDATE arena_participants SET placement = 1, payout = ${winnerPayout} 
          WHERE match_id = ${id} AND user_id = ${winnerId}
        `
      }

      return NextResponse.json({ success: true, status: 'completed' })
    }

    if (action === 'cancel') {
      if (match.status === 'completed') {
        return NextResponse.json({ error: 'Cannot cancel completed match' }, { status: 400 })
      }

      // Refund all participants
      const participants = await sql`SELECT user_id FROM arena_participants WHERE match_id = ${id}`
      for (const p of participants) {
        await sql`
          UPDATE wallets SET balance = balance + ${match.entry_fee} WHERE user_id = ${p.user_id}
        `
      }

      await sql`UPDATE arena_matches SET status = 'cancelled' WHERE id = ${id}`
      return NextResponse.json({ success: true, status: 'cancelled' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating match:', error)
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
  }
}
