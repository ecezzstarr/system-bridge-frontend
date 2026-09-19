import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Real per-bridger stats: client count + total deposit volume from their clients.
// Deposit volume is raw activity (sum of ledger_entries where entry_type = 'deposit'),
// NOT a commission/earnings figure — no live commission calculation exists yet.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bridgerId = searchParams.get('bridgerId')
    if (!bridgerId) {
      return NextResponse.json({ success: false, error: 'bridgerId required' }, { status: 400 })
    }

    const clientCountRows = await sql`
      SELECT COUNT(*) as count FROM clients WHERE assigned_bridger_id = ${bridgerId}::uuid
    `
    const clientCount = parseInt(clientCountRows[0]?.count) || 0

    const depositRows = await sql`
      SELECT le.currency, SUM(le.amount) as total
      FROM ledger_entries le
      JOIN clients c ON c.id = le.user_id
      WHERE c.assigned_bridger_id = ${bridgerId}::uuid
      AND le.entry_type = 'deposit'
      GROUP BY le.currency
    `
    const depositsByCurrency: Record<string, number> = {}
    for (const row of depositRows) {
      depositsByCurrency[row.currency] = parseFloat(row.total) || 0
    }

    return NextResponse.json({ success: true, clientCount, depositsByCurrency })
  } catch (error) {
    console.error('Error fetching bridger stats:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
