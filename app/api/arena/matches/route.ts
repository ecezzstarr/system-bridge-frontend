import { NextRequest, NextResponse } from 'next/server'
import { query as dbQuery, getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

const WINNER_PERCENTAGE = 0.70

// GET /api/arena/matches - List matches. Match metadata is not account-private.
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

    queryString += ' ORDER BY m.scheduled_at ASC LIMIT 50'
    const matches = await dbQuery(queryString, params)

    return NextResponse.json({
      matches: matches.map((m: any) => {
        let outcomes: any[] = []
        if (m.category === 'football_curated' || m.category === 'football') {
          try { outcomes = JSON.parse(m.description || '[]') } catch {}
        }
        return {
          id: m.id,
          title: m.title,
          description: m.description,
          outcomes,
          host: { id: m.host_id, displayName: m.host_name, avatar: m.host_avatar },
          entryFee: Number(m.entry_fee) || 0,
          prizePool: Number(m.prize_pool) || 0,
          maxParticipants: m.max_participants,
          participantCount: Number(m.participant_count) || 0,
          category: m.category,
          status: m.status,
          scheduledAt: m.scheduled_at,
          startedAt: m.started_at,
          endedAt: m.ended_at,
        }
      }),
    })
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json({ error: 'Failed to fetch matches', matches: [] }, { status: 500 })
  }
}

// POST /api/arena/matches - Create a match. Host identity always comes from the session.
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pool = getPool()
  const client = await pool.connect()
  try {
    const body = await request.json()
    const title = String(body.title || '').trim()
    const description = typeof body.description === 'string' ? body.description : ''
    const fee = Number(body.entryFee || 0)
    const maxParticipants = Math.min(1000, Math.max(2, Number(body.maxParticipants || 10)))
    const category = String(body.category || 'general')
    const startsAt = body.startsAt

    if (!title || !startsAt) {
      return NextResponse.json({ error: 'Title and start time are required' }, { status: 400 })
    }
    if (!Number.isFinite(fee) || fee < 0) {
      return NextResponse.json({ error: 'Entry fee must be zero or greater' }, { status: 400 })
    }
    if (Number.isNaN(new Date(startsAt).getTime())) {
      return NextResponse.json({ error: 'Invalid start time' }, { status: 400 })
    }

    await client.query('BEGIN')

    if (fee > 0) {
      const wallet = await client.query(
        'SELECT balance_trx FROM wallets WHERE user_id = $1::uuid AND is_primary = true FOR UPDATE',
        [authUser.id]
      )
      const balance = Number(wallet.rows[0]?.balance_trx || 0)
      if (balance < fee) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Insufficient Flame Coin balance', required: fee, available: balance }, { status: 400 })
      }
    }

    const id = `match_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    await client.query(
      `INSERT INTO arena_matches
        (id, title, description, host_id, entry_fee, prize_pool, max_participants, category, scheduled_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'upcoming')`,
      [id, title, description, authUser.id, fee, fee, maxParticipants, category, startsAt]
    )
    await client.query(
      'INSERT INTO arena_participants (id, match_id, user_id) VALUES ($1,$2,$3)',
      [`part_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, id, authUser.id]
    )

    if (fee > 0) {
      const before = await client.query(
        'SELECT balance_trx FROM wallets WHERE user_id = $1::uuid AND is_primary = true FOR UPDATE',
        [authUser.id]
      )
      const balanceBefore = Number(before.rows[0]?.balance_trx || 0)
      const balanceAfter = balanceBefore - fee
      await client.query(
        'UPDATE wallets SET balance_trx=$1, updated_at=NOW() WHERE user_id=$2::uuid AND is_primary=true',
        [balanceAfter, authUser.id]
      )
      await client.query(
        `INSERT INTO ledger_entries
          (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at)
         VALUES (gen_random_uuid(),$1::uuid,'arena_entry_fee',$2,'Flame Coin',$3,$4,$5,NOW())`,
        [authUser.id, -fee, `Arena entry fee (host): ${title}`, balanceBefore, balanceAfter]
      )
    }

    await client.query('COMMIT')
    return NextResponse.json({
      success: true,
      match: {
        id,
        title,
        status: 'upcoming',
        prizePool: fee,
        entryFee: fee,
        potentialWinnings: fee * WINNER_PERCENTAGE,
      },
    })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('Error creating match:', error)
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  } finally {
    client.release()
  }
}
