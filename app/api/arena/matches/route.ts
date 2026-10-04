import { NextRequest, NextResponse } from 'next/server'
import { query as dbQuery, getPool } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import { ensureAceAccount, ensureWeaveLifestyleSchema, requireLifestyleAccess } from '@/lib/weave-lifestyle'

export async function GET(request: NextRequest) {
  try {
    await ensureWeaveLifestyleSchema()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    let queryString = `
      SELECT
        m.*,
        u.name as host_name,
        u.username as host_username,
        u.avatar_url as host_avatar,
        COALESCE(a.ace_name,u.name,u.username,'Ace') as ace_name,
        (SELECT COUNT(*) FROM arena_live_predictions WHERE match_id=m.id) as prediction_count,
        (SELECT COUNT(*) FROM arena_live_predictions WHERE match_id=m.id AND prediction='ACE_WIN') as ace_win_predictions,
        (SELECT COUNT(*) FROM arena_live_predictions WHERE match_id=m.id AND prediction='ACE_LOSE') as ace_lose_predictions
      FROM arena_matches m
      LEFT JOIN users u ON m.host_id = u.id::text
      LEFT JOIN arena_ace_accounts a ON a.user_id::text = m.host_id
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

    queryString += ' ORDER BY m.scheduled_at DESC NULLS LAST LIMIT 50'
    const matches = await dbQuery(queryString, params)

    return NextResponse.json({
      matches: matches.map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        host: { id: m.host_id, displayName: m.host_name, avatar: m.host_avatar },
        aceName: m.ace_name,
        category: m.category,
        gameKey: m.game_key || m.category,
        streamUrl: m.stream_url || null,
        status: m.status,
        aceResult: m.ace_result || null,
        settlementStatus: m.settlement_status || 'open',
        settlementAvailableAt: m.settlement_available_at || null,
        settlementReason: m.settlement_reason || null,
        predictionCount: Number(m.prediction_count) || 0,
        aceWinPredictions: Number(m.ace_win_predictions) || 0,
        aceLosePredictions: Number(m.ace_lose_predictions) || 0,
        scheduledAt: m.scheduled_at,
        startedAt: m.started_at,
        endedAt: m.ended_at,
      })),
    })
  } catch (error) {
    console.error('Error fetching Arena streams:', error)
    return NextResponse.json({ error: 'Failed to fetch Arena streams', matches: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await requireLifestyleAccess(authUser.id)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 403 })
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    const body = await request.json()
    const title = String(body.title || '').trim()
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 1000) : ''
    const category = String(body.category || 'online-game').slice(0, 80)
    const gameKey = String(body.gameKey || category).slice(0, 80)
    const streamUrl = typeof body.streamUrl === 'string' ? body.streamUrl.trim().slice(0, 2000) : ''
    const startsAt = body.startsAt

    if (!title || !description || !startsAt) {
      return NextResponse.json({ error: 'Game title, stream purpose and start time are required' }, { status: 400 })
    }
    if (Number.isNaN(new Date(startsAt).getTime())) {
      return NextResponse.json({ error: 'Invalid start time' }, { status: 400 })
    }

    await ensureWeaveLifestyleSchema()
    await ensureAceAccount(authUser.id, authUser.name || authUser.username || 'Ace')

    const id = `match_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    await client.query(
      `INSERT INTO arena_matches
        (id,title,description,host_id,entry_fee,prize_pool,max_participants,category,game_key,stream_url,scheduled_at,status,settlement_status)
       VALUES ($1,$2,$3,$4,0,0,100000,$5,$6,$7,$8,'upcoming','open')`,
      [id, title, description, authUser.id, category, gameKey, streamUrl || null, startsAt]
    )

    return NextResponse.json({
      success: true,
      match: { id, title, description, status: 'upcoming', gameKey, streamUrl: streamUrl || null },
    })
  } catch (error) {
    console.error('Error creating Arena stream:', error)
    return NextResponse.json({ error: 'Failed to create Arena stream' }, { status: 500 })
  } finally {
    client.release()
  }
}
