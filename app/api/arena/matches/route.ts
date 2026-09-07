import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { neon } from '@/lib/pg-neon'

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const sql = getDb()
    let query = `SELECT m.*, u.name AS host_name, u.username AS host_username, u.avatar AS host_avatar, (SELECT COUNT(*) FROM arena_participants WHERE match_id = m.id) AS participant_count FROM arena_matches m LEFT JOIN users u ON m.host_id = u.id WHERE 1=1`
    const params: any[] = []
    let i = 1
    if (status) { query += ` AND m.status = $${i++}`; params.push(status) }
    if (category) { query += ` AND m.category = $${i++}`; params.push(category) }
    query += ' ORDER BY m.scheduled_at ASC LIMIT 50'
    const matches = await sql(query, params)
    return NextResponse.json({ matches: matches.map((m: any) => ({
      id: m.id, title: m.title, description: m.description,
      host: { id: m.host_id, displayName: m.host_name, avatar: m.host_avatar },
      entryFee: Number(m.entry_fee) || 0, prizePool: Number(m.prize_pool) || 0,
      maxParticipants: m.max_participants, participantCount: Number(m.participant_count) || 0,
      category: m.category, status: m.status, scheduledAt: m.scheduled_at, startedAt: m.started_at, endedAt: m.ended_at,
    })) })
  } catch (error) {
    console.error('Error fetching matches:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Failed to fetch matches', matches: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.slice(0, 2000) : ''
    const startsAt = typeof body.startsAt === 'string' ? body.startsAt : ''
    const category = typeof body.category === 'string' ? body.category.slice(0, 64) : 'general'
    const fee = Number(body.entryFee)
    const maxParticipants = Math.min(Math.max(Number(body.maxParticipants) || 10, 2), 100)
    if (!title || !startsAt || !Number.isFinite(fee) || fee < 0) return NextResponse.json({ error: 'Valid title, start time and entry fee required' }, { status: 400 })

    const sql = getDb()
    if (fee > 0) {
      const wallets = await sql`SELECT balance_trx FROM wallets WHERE user_id = ${user.id}::uuid AND is_primary = true LIMIT 1`
      const balance = wallets.length ? Number(wallets[0].balance_trx) || 0 : 0
      if (balance < fee) return NextResponse.json({ error: 'Insufficient balance for entry fee', required: fee, available: balance }, { status: 400 })
    }

    const id = crypto.randomUUID()
    await sql`
      INSERT INTO arena_matches (id, title, description, host_id, entry_fee, prize_pool, max_participants, category, scheduled_at, status)
      VALUES (${id}, ${title}, ${description}, ${user.id}::uuid, ${fee}, ${fee}, ${maxParticipants}, ${category}, ${startsAt}, 'upcoming')
    `
    await sql`INSERT INTO arena_participants (id, match_id, user_id) VALUES (${crypto.randomUUID()}, ${id}, ${user.id}::uuid)`

    if (fee > 0) {
      const updated = await sql`UPDATE wallets SET balance_trx = balance_trx - ${fee}, updated_at = NOW() WHERE user_id = ${user.id}::uuid AND is_primary = true AND balance_trx >= ${fee} RETURNING balance_trx`
      if (!updated.length) return NextResponse.json({ error: 'Balance changed; match not funded' }, { status: 409 })
      await sql`INSERT INTO ledger_entries (id, user_id, entry_type, amount, currency, description, created_at) VALUES (gen_random_uuid(), ${user.id}::uuid, 'arena_entry_fee', ${-fee}, 'TRX', ${'Arena entry fee (host): ' + title}, NOW())`
    }

    return NextResponse.json({ success: true, match: { id, title, status: 'upcoming', prizePool: fee, entryFee: fee, potentialWinnings: fee * 0.70 } })
  } catch (error) {
    console.error('Error creating match:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }
}
