import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { ensureClientVaultSchema } from '@/lib/client-vault'
import { ensureClientVaultLedgerSchema } from '@/lib/client-vault-ledger'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  const { id } = await params
  const sql = neon(process.env.DATABASE_URL!)
  await ensureClientVaultSchema(sql); await ensureClientVaultLedgerSchema(sql)
  const [withdrawal] = await sql`SELECT * FROM client_vault_withdrawals WHERE id=${id}::uuid AND status='pending_approval' LIMIT 1`
  if (!withdrawal) return NextResponse.json({ error: 'Pending withdrawal not found' }, { status: 404 })
  const [debited] = await sql`UPDATE client_vaults SET balance=balance-${withdrawal.amount} WHERE client_id=${withdrawal.client_id}::uuid AND balance>=${withdrawal.amount} RETURNING balance,currency`
  if (!debited) return NextResponse.json({ error: 'Insufficient client balance at approval time' }, { status: 409 })
  const [updated] = await sql`UPDATE client_vault_withdrawals SET status='approved',approved_by=${auth.session.user.id}::uuid,approved_at=NOW() WHERE id=${id}::uuid AND status='pending_approval' RETURNING *`
  if (!updated) return NextResponse.json({ error: 'Withdrawal approval could not be completed' }, { status: 409 })
  await sql`INSERT INTO client_vault_ledger (client_id,type,amount,currency,status,reference,note,created_by) VALUES (${withdrawal.client_id}::uuid,'withdrawal',-${withdrawal.amount},${withdrawal.currency},'posted',${withdrawal.id},'Administration-approved withdrawal',${auth.session.user.id}::uuid)`
  return NextResponse.json({ success: true, withdrawal: updated, vault: debited })
}
