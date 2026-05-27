import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'

// Lazy init to avoid build-time errors
const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  return neon(process.env.DATABASE_URL)
}

// GET /api/arena/matches - List all matches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    let query = `
      SELECT 
        m.*,
        u.name as host_name,
        u.username as host_username,
        u.avatar as host_avatar,
        (SELECT COUNT(*) FROM arena_participants WHERE match_id = m.id) as participant_count
      FROM arena_matches m
      LEFT JOIN users u ON m.host_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      query += ` AND m.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (category) {
      query += ` AND m.category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    query += ` ORDER BY m.scheduled_at ASC LIMIT 50`

    const sql = getDb()
    const matches = await sql(query, params)

    // Transform for frontend
    const transformed = matches.map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      host: {
        id: m.host_id,
        displayName: m.host_name,
        avatar: m.host_avatar,
      },
      entryFee: parseFloat(m.entry_fee) || 0,
      prizePool: parseFloat(m.prize_pool) || 0,
      maxParticipants: m.max_participants,
      participantCount: parseInt(m.participant_count) || 0,
      category: m.category,
      status: m.status,
      scheduledAt: m.scheduled_at,
      startedAt: m.started_at,
      endedAt: m.ended_at,
    }))

    return NextResponse.json({ matches: transformed })
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json({ error: 'Failed to fetch matches', matches: [] }, { status: 500 })
  }
}

// POST /api/arena/matches - Create new match
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, entryFee, maxParticipants, category, startsAt, hostId } = body

    if (!title || !startsAt || !hostId) {
      return NextResponse.json({ error: 'Title, start time and host required' }, { status: 400 })
    }

    const sql = getDb()
    const fee = parseFloat(entryFee) || 0

    // Check host has enough balance for entry fee
    if (fee > 0) {
      const wallets = await sql`SELECT balance_trx FROM wallets WHERE user_id = ${hostId}::uuid`
      const balance = wallets.length > 0 ? parseFloat(wallets[0].balance_trx) : 0
      
      if (balance < fee) {
        return NextResponse.json({ 
          error: 'Insufficient balance for entry fee',
          required: fee,
          available: balance
        }, { status: 400 })
      }
    }

    const id = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const prizePool = fee // Initial prize pool is host's entry fee

    await sql`
      INSERT INTO arena_matches (id, title, description, host_id, entry_fee, prize_pool, max_participants, category, scheduled_at, status)
      VALUES (${id}, ${title}, ${description || ''}, ${hostId}, ${fee}, ${prizePool}, ${maxParticipants || 10}, ${category || 'general'}, ${startsAt}, 'upcoming')
    `

    // Auto-join host as participant
    await sql`
      INSERT INTO arena_participants (id, match_id, user_id)
      VALUES (${`part_${Date.now()}`}, ${id}, ${hostId})
    `

    // Deduct entry fee from host wallet if applicable
    if (fee > 0) {
      await sql`
        UPDATE wallets SET balance_trx = balance_trx - ${fee}, updated_at = NOW()
        WHERE user_id = ${hostId}::uuid
      `

      // Record ledger entry
      try {
        await sql`
          INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, created_at)
          VALUES (
            gen_random_uuid(),
            ${hostId}::uuid,
            'arena_entry_fee',
            ${-fee},
            'TRX',
            ${'Arena entry fee (host): ' + title},
            NOW()
          )
        `
      } catch (e) {
        console.log('Ledger entry failed:', e)
      }
    }

    return NextResponse.json({ 
      success: true, 
      match: { 
        id, 
        title, 
        status: 'upcoming', 
        prizePool,
        entryFee: fee,
        potentialWinnings: prizePool * 0.70
      } 
    })
  } catch (error) {
    console.error('Error creating match:', error)
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }
}
