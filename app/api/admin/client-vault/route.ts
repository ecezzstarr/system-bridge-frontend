import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { ensureClientVaultSchema } from '@/lib/client-vault'
import { ensureClientVaultLedgerSchema } from '@/lib/client-vault-ledger'

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  const sql = neon(process.env.DATABASE_URL!)
  await ensureClientVaultSchema(sql)
  await ensureClientVaultLedgerSchema(sql)
  const q = request.nextUrl.searchParams.get('q')?.trim() || ''
  const clients = q
    ? await sql`SELECT c.id,c.name,c.email,c.file_number,COALESCE(v.balance,0) AS vault_balance,COALESCE(v.currency,'TRX') AS currency FROM clients c LEFT JOIN client_vaults v ON v.client_id=c.id WHERE c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'} OR c.file_number ILIKE ${'%' + q + '%'} ORDER BY c.created_at DESC LIMIT 100`
    : await sql`SELECT c.id,c.name,c.email,c.file_number,COALESCE(v.balance,0) AS vault_balance,COALESCE(v.currency,'TRX') AS currency FROM clients c LEFT JOIN client_vaults v ON v.client_id=c.id ORDER BY c.created_at DESC LIMIT 100`
  const withdrawals = await sql`SELECT w.id,w.client_id,w.amount,w.currency,w.destination,w.status,w.requested_at,w.reviewed_at,w.processed_at,c.name AS client_name,c.file_number FROM client_vault_withdrawals w JOIN clients c ON c.id=w.client_id ORDER BY w.requested_at DESC LIMIT 100`
  return NextResponse.json({ clients, withdrawals }, { headers: { 'Cache-Control': 'private, no-store' } })
}
