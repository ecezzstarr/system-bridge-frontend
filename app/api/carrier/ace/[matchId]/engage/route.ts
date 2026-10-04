import { NextRequest, NextResponse } from 'next/server'
import { ensureCarrierSchema } from '@/lib/carrier'
import { getPool } from '@/lib/db'

const VISITOR_PATTERN = /^[A-Za-z0-9._:-]{8,120}$/
const CHANNEL_PATTERN = /^[A-Za-z0-9_-]{1,40}$/

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  try {
    await ensureCarrierSchema()
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '').toLowerCase()
    const visitorKey = String(body.visitorKey || '').trim().slice(0, 120)
    const rawChannel = String(body.channel || 'share').trim().toLowerCase().slice(0, 40)
    const channel = CHANNEL_PATTERN.test(rawChannel) ? rawChannel : 'share'

    if (!['view', 'support', 'share'].includes(action)) {
      return NextResponse.json({ error: 'Carrier movement is not recognized' }, { status: 400 })
    }
    if (!VISITOR_PATTERN.test(visitorKey)) {
      return NextResponse.json({ error: 'Carrier visitor key is required' }, { status: 400 })
    }

    const pool = getPool()
    const publication = await pool.query(
      `SELECT match_id FROM carrier_ace_publications WHERE match_id=$1 AND status='published' LIMIT 1`,
      [matchId]
    )
    if (!publication.rows.length) {
      return NextResponse.json({ error: 'This Carrier is not open' }, { status: 404 })
    }

    if (action === 'view') {
      await pool.query(
        `INSERT INTO carrier_ace_visitors (match_id,visitor_key,first_seen_at,last_seen_at)
         VALUES ($1,$2,NOW(),NOW())
         ON CONFLICT (match_id,visitor_key) DO UPDATE SET last_seen_at=NOW()`,
        [matchId, visitorKey]
      )
    }

    if (action === 'support') {
      await pool.query(
        `INSERT INTO carrier_ace_visitors (match_id,visitor_key,first_seen_at,last_seen_at,supported_at)
         VALUES ($1,$2,NOW(),NOW(),NOW())
         ON CONFLICT (match_id,visitor_key) DO UPDATE SET
           last_seen_at=NOW(),
           supported_at=COALESCE(carrier_ace_visitors.supported_at,NOW())`,
        [matchId, visitorKey]
      )
    }

    if (action === 'share') {
      await pool.query(
        `INSERT INTO carrier_ace_visitors (match_id,visitor_key,first_seen_at,last_seen_at)
         VALUES ($1,$2,NOW(),NOW())
         ON CONFLICT (match_id,visitor_key) DO UPDATE SET last_seen_at=NOW()`,
        [matchId, visitorKey]
      )
      await pool.query(
        `INSERT INTO carrier_ace_shares (match_id,visitor_key,channel) VALUES ($1,$2,$3)`,
        [matchId, visitorKey, channel]
      )
    }

    const metrics = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM carrier_ace_visitors WHERE match_id=$1) AS unique_views,
         (SELECT COUNT(*) FROM carrier_ace_visitors WHERE match_id=$1 AND supported_at IS NOT NULL) AS supports,
         (SELECT COUNT(*) FROM carrier_ace_shares WHERE match_id=$1) AS shares`,
      [matchId]
    )
    const row = metrics.rows[0] || {}
    return NextResponse.json({
      success: true,
      metrics: {
        uniqueViews: Number(row.unique_views) || 0,
        supports: Number(row.supports) || 0,
        shares: Number(row.shares) || 0,
      },
    })
  } catch (error) {
    console.error('Carrier engagement failed:', error)
    return NextResponse.json({ error: 'Carrier movement failed' }, { status: 500 })
  }
}
