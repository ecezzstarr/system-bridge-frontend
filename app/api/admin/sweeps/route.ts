import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'

const db = () => neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '')

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const status = request.nextUrl.searchParams.get('status')
    const sql = db()
    const sweeps = status && status !== 'all'
      ? await sql`SELECT id,user_id,amount,status,created_at FROM fund_sweeps WHERE status=${status} ORDER BY created_at DESC LIMIT 100`
      : await sql`SELECT id,user_id,amount,status,created_at FROM fund_sweeps ORDER BY created_at DESC LIMIT 100`
    return NextResponse.json({ success: true, sweeps })
  } catch (error) {
    console.error('Get sweeps error', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, error: 'Failed to fetch sweeps' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const { sweepId, action } = await request.json()
    if (!sweepId || !action) return NextResponse.json({ success: false, error: 'Missing sweepId or action' }, { status: 400 })
    const sql = db()

    if (action === 'approve') {
      const [row] = await sql`UPDATE fund_sweeps SET status='approved' WHERE id=${sweepId} AND status='pending' RETURNING id,status`
      if (!row) return NextResponse.json({ success: false, error: 'Sweep not found or already reviewed' }, { status: 404 })
      return NextResponse.json({ success: true, sweep: row })
    }

    if (action === 'execute') {
      return NextResponse.json({ success: false, pending: true, error: 'Blockchain execution is not performed by the web API. Use the secured custody/signing process after approval.' }, { status: 202 })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Sweep action error', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, error: 'Failed to process sweep' }, { status: 500 })
  }
}
