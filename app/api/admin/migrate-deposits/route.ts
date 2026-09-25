import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'

export async function GET() {
  return NextResponse.json({ error: 'Use an authenticated POST request for schema maintenance' }, { status: 405 })
}

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const sql = getSql()
    await sql`
      ALTER TABLE deposits
      ADD COLUMN IF NOT EXISTS receipt_text TEXT,
      ADD COLUMN IF NOT EXISTS receipt_url TEXT,
      ADD COLUMN IF NOT EXISTS verified_by UUID,
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ
    `
    return NextResponse.json({ success: true, message: 'Deposit receipt fields verified' })
  } catch (error) {
    console.error('Deposit migration error:', error)
    return NextResponse.json({ error: 'Schema maintenance failed' }, { status: 500 })
  }
}
