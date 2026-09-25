import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

const WINNER_PERCENTAGE = 0.70

// POST /api/arena/matches/[id]/join - Join using the authenticated account only.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const prediction = typeof body.prediction === 'string' ? body.prediction.slice(0, 120) : null
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const matchResult = await client.query('SELECT * FROM arena_matches WHERE id=$1 FOR UPDATE', [id])
    const match = matchResult.rows[0]
    if (!match) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }
    if (match.status !== 'upcoming') {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Match is not open for joining' }, { status: 400 })
    }

    const existing = await client.query(
      'SELECT id FROM arena_participants WHERE match_id=$1 AND user_id=$2',
      [id, user.id]
    )
    if (existing.rows.length) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Already joined this match' }, { status: 400 })
    }

    const count = await client.query('SELECT COUNT(*)::int AS count FROM arena_participants WHERE match_id=$1', [id])
    if (Number(count.rows[0]?.count || 0) >= Number(match.max_participants || 0)) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Match is full' }, { status: 400 })
    }

    const entryFee = Number(match.entry_fee) || 0
    let balanceBefore = 0
    let balanceAfter = 0

    if (entryFee > 0) {
      const wallet = await client.query(
        'SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE',
        [user.id]
      )
      balanceBefore = Number(wallet.rows[0]?.balance_trx || 0)
      if (balanceBefore < entryFee) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Insufficient Flame Coin balance', required: entryFee, available: balanceBefore }, { status: 400 })
      }
      balanceAfter = balanceBefore - entryFee
      await client.query(
        'UPDATE wallets SET balance_trx=$1,updated_at=NOW() WHERE user_id=$2::uuid AND is_primary=true',
        [balanceAfter, user.id]
      )
      await client.query(
        `INSERT INTO ledger_entries
          (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at)
         VALUES (gen_random_uuid(),$1::uuid,'arena_entry_fee',$2,'Flame Coin',$3,$4,$5,NOW())`,
        [user.id, -entryFee, `Arena entry fee: ${match.title}`, balanceBefore, balanceAfter]
      )
    }

    await client.query(
      'INSERT INTO arena_participants (id,match_id,user_id,prediction) VALUES ($1,$2,$3,$4)',
      [`part_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, id, user.id, prediction]
    )
    if (entryFee > 0) {
      await client.query('UPDATE arena_matches SET prize_pool=prize_pool+$1 WHERE id=$2', [entryFee, id])
    }
    const updated = await client.query('SELECT prize_pool FROM arena_matches WHERE id=$1', [id])
    const prizePool = Number(updated.rows[0]?.prize_pool || 0)
    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      message: 'Successfully joined match',
      entryFee,
      prizePool,
      potentialWinnings: prizePool * WINNER_PERCENTAGE,
    })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('Error joining match:', error)
    return NextResponse.json({ error: 'Failed to join match' }, { status: 500 })
  } finally {
    client.release()
  }
}
