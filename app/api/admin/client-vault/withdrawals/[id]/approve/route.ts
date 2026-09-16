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
  await ensureClientVaultSchema(sql)
  await ensureClientVaultLedgerSchema(sql)

  const [result] = await sql`
    WITH pending AS (
      SELECT id,client_id,amount,currency
      FROM client_vault_withdrawals
      WHERE id=${id}::uuid AND status='pending_approval'
      FOR UPDATE
    ), debited AS (
      UPDATE client_vaults v
      SET balance=v.balance-p.amount
      FROM pending p
      WHERE v.client_id=p.client_id::uuid AND v.balance>=p.amount
      RETURNING v.client_id,v.balance,v.currency
    ), approved AS (
      UPDATE client_vault_withdrawals w
      SET status='approved',approved_by=${auth.session.user.id}::uuid,approved_at=NOW()
      FROM pending p,debited d
      WHERE w.id=p.id AND w.status='pending_approval'
      RETURNING w.*,d.balance AS remaining_balance,d.currency AS vault_currency
    ), ledger AS (
      INSERT INTO client_vault_ledger (client_id,type,amount,currency,status,reference,note,created_by)
      SELECT client_id,'withdrawal',-amount,currency,'posted',id,'Administration-approved withdrawal',${auth.session.user.id}::uuid
      FROM approved
      RETURNING id
    )
    SELECT a.*,a.remaining_balance,a.vault_currency
    FROM approved a
    JOIN ledger l ON true
  `

  if (!result) return NextResponse.json({ error: 'Withdrawal could not be approved; check the pending request and available balance' }, { status: 409 })
  return NextResponse.json({ success: true, withdrawal: result, vault: { balance: Number(result.remaining_balance), currency: result.vault_currency } })
}
