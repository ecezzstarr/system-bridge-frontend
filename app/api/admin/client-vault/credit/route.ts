import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { ensureClientVaultSchema } from '@/lib/client-vault'
import { ensureClientVaultLedgerSchema } from '@/lib/client-vault-ledger'

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  const sql = neon(process.env.DATABASE_URL!)
  const body = await request.json()
  const clientId = String(body.client_id || '')
  const amount = Number(body.amount)
  const currency = String(body.currency || 'TRX')
  if (!clientId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Valid client and amount are required' }, { status: 400 })
  await ensureClientVaultSchema(sql)
  await ensureClientVaultLedgerSchema(sql)
  const [vault] = await sql`INSERT INTO client_vaults (client_id,balance,currency) VALUES (${clientId}::uuid,${amount},${currency}) ON CONFLICT (client_id) DO UPDATE SET balance=client_vaults.balance+${amount},currency=${currency} RETURNING balance,currency`
  const [entry] = await sql`INSERT INTO client_vault_ledger (client_id,entry_type,amount,currency,balance_after,source,reference,reason,actor_id) VALUES (${clientId}::uuid,'admin_credit',${amount},${currency},${vault.balance},'Administration',${body.reference || null},${body.note || 'Administration credit'},${auth.session.user.id}::uuid) RETURNING *`
  return NextResponse.json({ success: true, balance: Number(vault.balance), currency: vault.currency, entry })
}
