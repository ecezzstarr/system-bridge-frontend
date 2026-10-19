import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'
import { sql } from '@/lib/db'
import { FLAME_EVENT } from '@/lib/weave-event'
import { getFlameEvent } from '@/lib/weave-event-store'
import {
  ensureFlameFrontierSchema, getPublicFlameFrontier,
  isFrontierPhase, isFrontierSector, isFrontierState,
} from '@/lib/flame-frontier'

export const dynamic = 'force-dynamic'
const POSITIONS = new Set(['admin', 'agent', 'bridger', 'client'])

export async function GET() {
  try {
    const snapshot = await getPublicFlameFrontier()
    return NextResponse.json({ success: true, ...snapshot }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Flame frontier read failed:', error)
    return NextResponse.json({ success: false, error: 'Frontier data unavailable' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request)
    if (!user || !POSITIONS.has(user.role)) {
      return NextResponse.json({ success: false, error: 'Signed-in WEAVE position required' }, { status: 401 })
    }
    const event = await getFlameEvent()
    if (event.effectiveStatus !== 'active') {
      return NextResponse.json({ success: false, error: 'Flame Event is not open for new movement' }, { status: 409 })
    }
    const body = await request.json()
    const stateCode = String(body.stateCode || '').trim().toUpperCase()
    const sector = body.sector
    const phase = body.phase
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const summary = typeof body.summary === 'string' ? body.summary.trim() : ''
    const evidenceNote = typeof body.evidenceNote === 'string' ? body.evidenceNote.trim() : ''
    if (!isFrontierState(stateCode) || !isFrontierSector(sector) || !isFrontierPhase(phase)) {
      return NextResponse.json({ success: false, error: 'Select a valid state, sector and movement stage' }, { status: 400 })
    }
    if (title.length < 8 || title.length > 120 || summary.length < 25 || summary.length > 500 || evidenceNote.length < 20 || evidenceNote.length > 4000) {
      return NextResponse.json({ success: false, error: 'Title (8–120), summary (25–500) and private evidence note (20–4000) are required' }, { status: 400 })
    }
    await ensureFlameFrontierSchema()
    const [rate] = await sql`
      SELECT COUNT(*)::int AS total FROM weave_flame_frontier
      WHERE submitted_by = ${user.id}::uuid AND created_at > NOW() - INTERVAL '1 hour'
    `
    if (Number(rate?.total || 0) >= 10) {
      return NextResponse.json({ success: false, error: 'Hourly submission limit reached' }, { status: 429 })
    }
    const [record] = await sql`
      INSERT INTO weave_flame_frontier (
        event_key, state_code, sector, phase, title, public_summary,
        evidence_note, public_opt_in, submitted_by, submitted_role
      ) VALUES (
        ${FLAME_EVENT.key}, ${stateCode}, ${sector}, ${phase}, ${title}, ${summary},
        ${evidenceNote}, ${body.sharePublicly === true}, ${user.id}::uuid, ${user.role}
      )
      RETURNING id, status, created_at
    `
    return NextResponse.json({ success: true, record, message: 'Movement submitted for Administration verification; not yet public.' }, { status: 201 })
  } catch (error) {
    console.error('Flame frontier submission failed:', error)
    return NextResponse.json({ success: false, error: 'Unable to submit movement' }, { status: 500 })
  }
}
