import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { neon } from '@/lib/pg-neon'
import { getAllOriginSystems } from '@/lib/core/originTruthLedger'

const db = () => neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '')

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const { command } = await request.json()
    if (!command || typeof command !== 'string') return NextResponse.json({ success: false, message: 'Command required' }, { status: 400 })
    const lower = command.toLowerCase()

    const sweep = lower.match(/sweep\s+(\d+(?:\.\d+)?)\s+(?:trx\s+)?to\s+company\s+wallet/i)
    if (sweep) {
      const amount = Number(sweep[1])
      if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ success: false, message: 'Invalid sweep amount' }, { status: 400 })
      return NextResponse.json({ success: false, pending: true, message: `Sweep of ${amount} TRX was not signed or broadcast. EIGHT now records sweep intent only; blockchain signing must occur in the separately secured custody/approval layer.` }, { status: 202 })
    }

    if (/status/i.test(lower)) {
      const systems = getAllOriginSystems()
      const sql = db()
      const [tx] = await sql`SELECT COUNT(*) AS count FROM transactions WHERE type='sweep'`
      return NextResponse.json({ success: true, message: `EIGHT status: ${systems.filter(s => s.status === 'active').length}/${systems.length} systems active. ${tx?.count || 0} sweep records.`, data: { systems, sweepTransactions: Number(tx?.count || 0) } })
    }

    if (/systems|network|connected/i.test(lower)) {
      const systems = getAllOriginSystems()
      return NextResponse.json({ success: true, message: 'EIGHT connected systems', data: systems.map(s => ({ id: s.id, name: s.name, status: s.status, domain: s.domain })) })
    }

    if (/help|what\s+can|capabilities/i.test(lower)) {
      return NextResponse.json({ success: true, message: 'EIGHT can report system status, inspect approved system state, and create bounded operational requests. Blockchain transfers require the secured approval/custody layer; EIGHT does not accept private keys or broadcast transfers.' })
    }

    return NextResponse.json({ success: true, message: 'Command acknowledged. EIGHT will only execute approved, bounded system functions.' })
  } catch (error) {
    console.error('EIGHT command error', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, message: 'EIGHT command failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const sql = db()
    const transactions = await sql`SELECT id,type,amount,currency,status,tx_hash,from_address,to_address,description,metadata,created_at,completed_at FROM transactions WHERE type='sweep' ORDER BY created_at DESC LIMIT 100`
    return NextResponse.json({ success: true, transactions })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Unable to load EIGHT transaction history' }, { status: 500 })
  }
}
