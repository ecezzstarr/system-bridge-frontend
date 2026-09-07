import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'

function db() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('Database not configured')
  return neon(url)
}

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const body = await request.json()
    const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress.trim() : ''
    const tokenType = body.tokenType === 'TRX' || body.tokenType === 'USDT' ? body.tokenType : 'ALL'
    if (!walletAddress) return NextResponse.json({ success: false, error: 'Wallet address required' }, { status: 400 })
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(walletAddress)) return NextResponse.json({ success: false, error: 'Invalid TRON wallet address' }, { status: 400 })

    // Private keys are never accepted from the browser. Execution belongs in a
    // separately secured custody/signing service. This endpoint only records intent.
    const sql = db()
    const [row] = await sql`
      INSERT INTO fund_sweeps (user_id, amount, status, created_at)
      VALUES (${auth.session?.user?.id}::uuid, 0, 'pending', NOW())
      RETURNING id, status, created_at
    `
    return NextResponse.json({ success: true, pending: true, sweep: row, walletAddress, tokenType, message: 'Sweep request recorded. No private key was accepted or stored.' })
  } catch (error) {
    console.error('Admin sweep request error', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, error: 'Unable to create sweep request' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const sql = db()
    const history = await sql`
      SELECT id, user_id, amount, status, created_at
      FROM fund_sweeps
      ORDER BY created_at DESC LIMIT 100
    `
    return NextResponse.json({ success: true, history })
  } catch (error) {
    console.error('Admin sweep history error', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, error: 'Unable to load sweep history' }, { status: 500 })
  }
}
