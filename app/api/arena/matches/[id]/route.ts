import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

const PLATFORM_WALLET_USER_ID = 'be4f0618-d666-4e13-ae8f-13c986784ff7'
const WINNER_PERCENTAGE = 0.70
const PLATFORM_PERCENTAGE = 0.30

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const pool = getPool()
  const client = await pool.connect()
  try {
    const matchResult = await client.query(
      `SELECT m.*,u.name AS host_name,u.username AS host_username,u.avatar_url AS host_avatar
       FROM arena_matches m LEFT JOIN users u ON m.host_id=u.id::text WHERE m.id=$1`,
      [id]
    )
    const match = matchResult.rows[0]
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    const participants = await client.query(
      `SELECT p.*,u.name,u.username,u.avatar_url
       FROM arena_participants p LEFT JOIN users u ON p.user_id=u.id::text
       WHERE p.match_id=$1 ORDER BY p.joined_at ASC`,
      [id]
    )

    return NextResponse.json({
      match: {
        id: match.id,
        title: match.title,
        description: match.description,
        host: { id: match.host_id, displayName: match.host_name, avatar: match.host_avatar },
        entryFee: Number(match.entry_fee) || 0,
        prizePool: Number(match.prize_pool) || 0,
        maxParticipants: match.max_participants,
        category: match.category,
        status: match.status,
        scheduledAt: match.scheduled_at,
        startedAt: match.started_at,
        endedAt: match.ended_at,
        winnerId: match.winner_id,
        participants: participants.rows.map((p: any) => ({
          id: p.user_id,
          displayName: p.name,
          username: p.username,
          avatar: p.avatar_url,
          joinedAt: p.joined_at,
          placement: p.placement,
          payout: p.payout,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching match:', error)
    return NextResponse.json({ error: 'Failed to fetch match' }, { status: 500 })
  } finally {
    client.release()
  }
}

// One authoritative mutation path for start, settlement, and cancellation.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const action = body.action
  const winnerId = typeof body.winnerId === 'string' ? body.winnerId : ''
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

    const canControl = user.role === 'admin' || String(match.host_id) === String(user.id)
    if (!canControl) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Only the host or Administration can control this match' }, { status: 403 })
    }

    if (action === 'start') {
      if (match.status !== 'upcoming') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Match cannot be started' }, { status: 400 })
      }
      await client.query("UPDATE arena_matches SET status='live',started_at=NOW() WHERE id=$1", [id])
      await client.query('COMMIT')
      return NextResponse.json({ success: true, status: 'live' })
    }

    if (action === 'cancel') {
      if (match.status === 'completed' || match.status === 'cancelled') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Match can no longer be cancelled' }, { status: 400 })
      }
      const participants = await client.query('SELECT user_id FROM arena_participants WHERE match_id=$1', [id])
      const entryFee = Number(match.entry_fee) || 0
      if (entryFee > 0) {
        for (const participant of participants.rows) {
          const wallet = await client.query(
            'SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE',
            [participant.user_id]
          )
          const before = Number(wallet.rows[0]?.balance_trx || 0)
          const after = before + entryFee
          await client.query(
            'UPDATE wallets SET balance_trx=$1,updated_at=NOW() WHERE user_id=$2::uuid AND is_primary=true',
            [after, participant.user_id]
          )
          await client.query(
            `INSERT INTO ledger_entries
              (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at)
             VALUES (gen_random_uuid(),$1::uuid,'arena_refund',$2,'Flame Coin',$3,$4,$5,NOW())`,
            [participant.user_id, entryFee, `Arena cancellation refund: ${match.title}`, before, after]
          )
        }
      }
      await client.query("UPDATE arena_matches SET status='cancelled',ended_at=NOW(),prize_pool=0 WHERE id=$1", [id])
      await client.query('COMMIT')
      return NextResponse.json({ success: true, status: 'cancelled' })
    }

    if (action === 'end') {
      if (match.status !== 'live') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Match is not live' }, { status: 400 })
      }
      if (!winnerId) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Winner is required' }, { status: 400 })
      }

      const winner = await client.query(
        'SELECT user_id FROM arena_participants WHERE match_id=$1 AND user_id=$2 LIMIT 1',
        [id, winnerId]
      )
      if (!winner.rows.length) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Winner must be a participant' }, { status: 400 })
      }

      const prizePool = Number(match.prize_pool) || 0
      const winnerPayout = Math.round(prizePool * WINNER_PERCENTAGE * 1e8) / 1e8
      const platformFee = Math.round((prizePool - winnerPayout) * 1e8) / 1e8

      if (winnerPayout > 0) {
        const wallet = await client.query(
          'SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE',
          [winnerId]
        )
        const before = Number(wallet.rows[0]?.balance_trx || 0)
        const after = before + winnerPayout
        await client.query(
          'UPDATE wallets SET balance_trx=$1,updated_at=NOW() WHERE user_id=$2::uuid AND is_primary=true',
          [after, winnerId]
        )
        await client.query(
          `INSERT INTO ledger_entries
            (id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at)
           VALUES (gen_random_uuid(),$1::uuid,'arena_win',$2,'Flame Coin',$3,$4,$5,NOW())`,
          [winnerId, winnerPayout, `Arena match win: ${match.title} (70% of prize pool)`, before, after]
        )
      }

      if (platformFee > 0) {
        await client.query(
          'UPDATE wallets SET balance_trx=balance_trx+$1,updated_at=NOW() WHERE user_id=$2::uuid AND is_primary=true',
          [platformFee, PLATFORM_WALLET_USER_ID]
        )
        await client.query(
          `INSERT INTO ledger_entries
            (id,user_id,entry_type,amount,currency,description,created_at)
           VALUES (gen_random_uuid(),$1::uuid,'arena_platform_fee',$2,'Flame Coin',$3,NOW())`,
          [PLATFORM_WALLET_USER_ID, platformFee, `Arena platform share: ${match.title} (30% of prize pool)`]
        )
      }

      await client.query(
        "UPDATE arena_participants SET placement=CASE WHEN user_id=$1 THEN 1 ELSE placement END,payout=CASE WHEN user_id=$1 THEN $2 ELSE COALESCE(payout,0) END WHERE match_id=$3",
        [winnerId, winnerPayout, id]
      )
      await client.query(
        "UPDATE arena_matches SET status='completed',winner_id=$1,ended_at=NOW() WHERE id=$2",
        [winnerId, id]
      )
      await client.query('COMMIT')
      return NextResponse.json({
        success: true,
        status: 'completed',
        winnerId,
        prizePool,
        winnerPayout,
        platformFee,
        winnerPercentage: WINNER_PERCENTAGE,
        platformPercentage: PLATFORM_PERCENTAGE,
      })
    }

    await client.query('ROLLBACK')
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('Error updating match:', error)
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
  } finally {
    client.release()
  }
}
