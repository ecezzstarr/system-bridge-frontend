import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { ensureClientVaultLedgerSchema } from '@/lib/client-vault-ledger'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const settlementReference = String(body.reference || '').trim()
  const settlementNote = String(body.note || '').trim() || null
  if (!settlementReference) return NextResponse.json({ error: 'Settlement reference is required' }, { status: 400 })

  const sql = neon(process.env.DATABASE_URL!)
  await ensureClientVaultLedgerSchema(sql)
  const [withdrawal] = await sql`
    UPDATE client_vault_withdrawals
    SET status='sent',sent_by=${auth.session.user.id}::uuid,sent_at=NOW(),settlement_reference=${settlementReference},settlement_note=${settlementNote}
    WHERE id=${id}::uuid AND status='approved'
    RETURNING id,client_id,amount,currency,destination,status,approved_by,approved_at,sent_by,sent_at,settlement_reference,settlement_note,created_at
  `
  if (!withdrawal) return NextResponse.json({ error: 'Approved withdrawal not found' }, { status: 404 })
  return NextResponse.json({ success: true, withdrawal })
}
