import { NextRequest, NextResponse } from 'next/server'
import { sql, query as dbQuery } from '@/lib/db'

// GET /api/arena/matches - List all matches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    let queryString = `
      SELECT 
        m.*,
        u.name as host_name,
        u.username as host_username,
        u.avatar_url as host_avatar,
        (SELECT COUNT(*) FROM arena_participants WHERE match_id = m.id) as participant_count
      FROM arena_matches m
      LEFT JOIN users u ON m.host_id = u.id::text
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      queryString += ` AND m.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (category) {
      queryString += ` AND m.category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    queryString += ` ORDER BY m.scheduled_at ASC LIMIT 50`

    const matches = await dbQuery(queryString, params)

    // Transform for frontend
    const transformed = matches.map((m: any) => {
      let outcomes = []
      if (m.category === 'football_curated' || m.category === 'football') {
        try {
          outcomes = JSON.parse(m.description || '[]')
        } catch (e) {
          console.error('Failed to parse outcomes for match:', m.id)
        }
      }

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        outcomes,
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
      }
    })

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

    const fee = parseFloat(entryFee) || 0

    const hosts = await sql`
      SELECT id, role FROM users
      WHERE id = ${hostId}::uuid AND is_active = true
      LIMIT 1
    `
    if (hosts.length === 0) {
      return NextResponse.json({ error: 'Host not found' }, { status: 404 })
    }

    const hostRole = hosts[0].role
    const hostIsPlayer = hostRole === 'client'
    const hostIsSupport = hostRole === 'admin'
    if (!hostIsPlayer && !hostIsSupport) {
      return NextResponse.json({ error: 'Only a Client player or Administration support may open an Arena match' }, { status: 403 })
    }

    // A Client host is a player and may stake the entry fee. Administration can
    // curate a match as support without being inserted into arena_participants.
    if (hostIsPlayer && fee > 0) {
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
    const prizePool = hostIsPlayer ? fee : 0

    await sql`
      INSERT INTO arena_matches (id, title, description, host_id, entry_fee, prize_pool, max_participants, category, scheduled_at, status)
      VALUES (${id}, ${title}, ${description || ''}, ${hostId}, ${fee}, ${prizePool}, ${maxParticipants || 10}, ${category || 'general'}, ${startsAt}, 'upcoming')
    `

    if (hostIsPlayer) {
      await sql`
        INSERT INTO arena_participants (id, match_id, user_id)
        VALUES (${`part_${Date.now()}`}, ${id}, ${hostId})
      `

      if (fee > 0) {
        await sql`
          UPDATE wallets SET balance_trx = balance_trx - ${fee}, updated_at = NOW()
          WHERE user_id = ${hostId}::uuid
        `

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
    }

    return NextResponse.json({ 
      success: true, 
      match: { 
        id, 
        title, 
        status: 'upcoming', 
        prizePool,
        entryFee: fee,
        potentialWinnings: prizePool * 0.70,
        hostMode: hostIsPlayer ? 'player' : 'support'
      } 
    })
  } catch (error) {
    console.error('Error creating match:', error)
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }
}
