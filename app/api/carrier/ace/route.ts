import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { requireCarrierAccess } from '@/lib/carrier-access'
import {
  buildAceCarrierShareText,
  ensureCarrierSchema,
  getAceCarrierPath,
  getAceCarrierUrl,
} from '@/lib/carrier'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { access } = await requireCarrierAccess(user)
    await ensureCarrierSchema()
    const pool = getPool()
    const result = await pool.query(
      `SELECT
         m.id,
         m.title,
         m.category,
         COALESCE(m.game_key,m.category,'online-game') AS game_key,
         m.stream_url,
         m.status AS match_status,
         m.scheduled_at,
         m.started_at,
         m.ended_at,
         COALESCE(a.ace_name,u.name,u.username,'Ace') AS ace_name,
         p.headline,
         p.message,
         p.status AS publication_status,
         p.published_at,
         p.updated_at,
         (SELECT COUNT(*) FROM carrier_ace_visitors v WHERE v.match_id=m.id) AS unique_views,
         (SELECT COUNT(*) FROM carrier_ace_visitors v WHERE v.match_id=m.id AND v.supported_at IS NOT NULL) AS supports,
         (SELECT COUNT(*) FROM carrier_ace_shares s WHERE s.match_id=m.id) AS shares
       FROM arena_matches m
       LEFT JOIN users u ON u.id::text=m.host_id
       LEFT JOIN arena_ace_accounts a ON a.user_id::text=m.host_id
       LEFT JOIN carrier_ace_publications p ON p.match_id=m.id
       WHERE m.host_id=$1
       ORDER BY m.scheduled_at DESC NULLS LAST
       LIMIT 100`,
      [String(user.id)]
    )

    return NextResponse.json({
      success: true,
      access,
      identityInsideCarrier: 'Ace',
      games: result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        gameKey: row.game_key,
        streamUrl: row.stream_url || null,
        matchStatus: row.match_status,
        scheduledAt: row.scheduled_at,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        aceName: row.ace_name,
        carrier: row.publication_status ? {
          headline: row.headline,
          message: row.message || '',
          status: row.publication_status,
          publicPath: getAceCarrierPath(row.id),
          publicUrl: getAceCarrierUrl(row.id),
          publishedAt: row.published_at,
          updatedAt: row.updated_at,
          uniqueViews: Number(row.unique_views) || 0,
          supports: Number(row.supports) || 0,
          shares: Number(row.shares) || 0,
        } : null,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Carrier could not open',
      access: error.carrierAccess || null,
    }, { status: error.status || 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { ace } = await requireCarrierAccess(user)
    await ensureCarrierSchema()
    const body = await request.json().catch(() => ({}))
    const matchId = String(body.matchId || '').trim()
    if (!matchId) return NextResponse.json({ error: 'Game is required' }, { status: 400 })

    const pool = getPool()
    const matchResult = await pool.query(
      `SELECT id,title,host_id FROM arena_matches WHERE id=$1 LIMIT 1`,
      [matchId]
    )
    const match = matchResult.rows[0]
    if (!match) return NextResponse.json({ error: 'Arena game not found' }, { status: 404 })
    if (String(match.host_id) !== String(user.id)) {
      return NextResponse.json({ error: 'Only the Ace playing this game can publish its Carrier' }, { status: 403 })
    }

    const aceName = String(ace?.ace_name || user.name || user.username || 'Ace')
    const headline = String(body.headline || `${aceName} · ${match.title}`).trim().slice(0, 180)
    const message = String(body.message || `${aceName} is playing ${match.title} in Weave Arena.`).trim().slice(0, 1200)

    await pool.query(
      `INSERT INTO carrier_ace_publications
         (match_id,ace_user_id,headline,message,status,published_at,updated_at)
       VALUES ($1,$2::uuid,$3,$4,'published',NOW(),NOW())
       ON CONFLICT (match_id) DO UPDATE SET
         headline=EXCLUDED.headline,
         message=EXCLUDED.message,
         status='published',
         updated_at=NOW()`,
      [matchId, user.id, headline, message]
    )

    const publicPath = getAceCarrierPath(matchId)
    const publicUrl = getAceCarrierUrl(matchId)
    return NextResponse.json({
      success: true,
      publication: {
        matchId,
        headline,
        message,
        status: 'published',
        publicPath,
        publicUrl,
        shareText: buildAceCarrierShareText({ aceName, title: match.title, url: publicUrl, message }),
      },
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Carrier could not publish',
      access: error.carrierAccess || null,
    }, { status: error.status || 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await requireCarrierAccess(user)
    await ensureCarrierSchema()
    const body = await request.json().catch(() => ({}))
    const matchId = String(body.matchId || '').trim()
    const action = String(body.action || '').toLowerCase()
    if (!matchId || !['pause','publish'].includes(action)) {
      return NextResponse.json({ error: 'Game and Carrier action are required' }, { status: 400 })
    }

    const pool = getPool()
    const owner = await pool.query('SELECT host_id FROM arena_matches WHERE id=$1 LIMIT 1', [matchId])
    if (!owner.rows[0]) return NextResponse.json({ error: 'Arena game not found' }, { status: 404 })
    if (String(owner.rows[0].host_id) !== String(user.id)) {
      return NextResponse.json({ error: 'Only the Ace playing this game can change its Carrier' }, { status: 403 })
    }

    const status = action === 'pause' ? 'paused' : 'published'
    const changed = await pool.query(
      `UPDATE carrier_ace_publications SET status=$1,updated_at=NOW() WHERE match_id=$2 RETURNING match_id`,
      [status, matchId]
    )
    if (!changed.rows.length) {
      return NextResponse.json({ error: 'Publish this game to Carrier first' }, { status: 404 })
    }
    return NextResponse.json({ success: true, matchId, status })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Carrier could not change',
      access: error.carrierAccess || null,
    }, { status: error.status || 500 })
  }
}
