import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { ensureClientVaultLedgerSchema } from '@/lib/client-vault-ledger'
import { ensureClientMoneyEnvironment } from '@/lib/client-money-environment'

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response

  const sql = neon(process.env.DATABASE_URL!)
  const body = await request.json()
  const clientId = String(body.client_id || '')
  const amount = Number(body.amount)

  if (!clientId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Valid client and amount are required' }, { status: 400 })
  }

  const [client] = await sql`
    SELECT id
    FROM users
    WHERE id=${clientId}::uuid
      AND role='client'
      AND COALESCE(is_active,true)=true
    LIMIT 1
  `
  if (!client) return NextResponse.json({ error: 'Active Client not found' }, { status: 404 })

  await ensureClientVaultLedgerSchema(sql)
  await ensureClientMoneyEnvironment(sql, clientId)

  // Administration credits the Client Vault in Flame Coin only.
  const currency = 'Flame Coin'
  const [vault] = await sql`
    UPDATE client_vaults
    SET
      balance=balance+${amount},
      currency='Flame Coin',
      updated_at=NOW()
    WHERE client_id=${clientId}::uuid
    RETURNING balance,currency
  `

  const [entry] = await sql`
    INSERT INTO client_vault_ledger (
      client_id,
      entry_type,
      amount,
      currency,
      balance_after,
      source,
      reference,
      reason,
      actor_id
    )
    VALUES (
      ${clientId}::uuid,
      'admin_credit',
      ${amount},
      ${currency},
      ${vault.balance},
      'Administration',
      ${body.reference || null},
      ${body.note || 'Administration Flame Coin credit'},
      ${auth.session.user.id}::uuid
    )
    RETURNING *
  `

  return NextResponse.json({
    success: true,
    balance: Number(vault.balance),
    currency: vault.currency,
    entry,
  })
}
