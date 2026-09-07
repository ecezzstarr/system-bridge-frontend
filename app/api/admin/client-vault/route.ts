import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { ensureClientVaultSchema, getVaultDb } from '@/lib/client-vault'

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const sql = getVaultDb()
    await ensureClientVaultSchema(sql)
    const q = new URL(request.url).searchParams.get('q')?.trim()
    const clients = q
      ? await sql`
          SELECT c.id, c.name, c.email, c.business_name, c.phone, c.file_number,
                 COALESCE(v.balance, 0) AS vault_balance, COALESCE(v.currency, 'TRX') AS currency
          FROM clients c LEFT JOIN client_vaults v ON v.client_id = c.id
          WHERE c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'} OR c.file_number ILIKE ${'%' + q + '%'}
          ORDER BY c.name LIMIT 25
        `
      : await sql`
          SELECT c.id, c.name, c.email, c.business_name, c.phone, c.file_number,
                 COALESCE(v.balance, 0) AS vault_balance, COALESCE(v.currency, 'TRX') AS currency
          FROM clients c LEFT JOIN client_vaults v ON v.client_id = c.id
          ORDER BY c.created_at DESC LIMIT 50
        `
    const withdrawals = await sql`
      SELECT w.*, c.name AS client_name, c.email AS client_email, c.file_number
      FROM client_vault_withdrawals w JOIN clients c ON c.id = w.client_id
      ORDER BY w.requested_at DESC LIMIT 50
    `
    return NextResponse.json({ success: true, clients, withdrawals })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    const body = await request.json()
    const { action, clientId, amount, source = 'Admin', reference, reason, withdrawalId, note } = body
    const sql = getVaultDb()
    await ensureClientVaultSchema(sql)

    if (action === 'credit') {
      const value = Number(amount)
      if (!clientId || !Number.isFinite(value) || value <= 0) return NextResponse.json({ error: 'clientId and positive TRX amount required' }, { status: 400 })
      await sql`INSERT INTO client_vaults (client_id, currency) VALUES (${clientId}::uuid, 'TRX') ON CONFLICT (client_id) DO NOTHING`
      const [vault] = await sql`
        UPDATE client_vaults SET balance = balance + ${value}, currency = 'TRX', updated_at = NOW()
        WHERE client_id = ${clientId}::uuid RETURNING balance, currency
      `
      await sql`
        INSERT INTO client_vault_ledger (client_id, entry_type, amount, currency, balance_after, source, reference, reason, actor_id)
        VALUES (${clientId}::uuid, 'credit', ${value}, 'TRX', ${vault.balance}, ${source}, ${reference || null}, ${reason || null}, ${auth.session.user.id}::uuid)
      `
      return NextResponse.json({ success: true, balance: vault.balance, currency: 'TRX' })
    }

    if (action === 'review_withdrawal') {
      const decision = body.decision
      if (!withdrawalId || !['approved', 'rejected'].includes(decision)) return NextResponse.json({ error: 'Valid withdrawalId and decision required' }, { status: 400 })
      const [withdrawal] = await sql`SELECT * FROM client_vault_withdrawals WHERE id = ${withdrawalId}::uuid FOR UPDATE`
      if (!withdrawal || withdrawal.status !== 'pending') return NextResponse.json({ error: 'Withdrawal is not pending' }, { status: 409 })
      if (withdrawal.currency !== 'TRX') return NextResponse.json({ error: 'Client withdrawals are TRX-only' }, { status: 409 })
      if (decision === 'rejected') {
        await sql`UPDATE client_vault_withdrawals SET status='rejected', reviewed_at=NOW(), reviewed_by=${auth.session.user.id}::uuid, note=${note || null} WHERE id=${withdrawalId}::uuid`
        return NextResponse.json({ success: true, status: 'rejected' })
      }
      await sql`INSERT INTO client_vaults (client_id, currency) VALUES (${withdrawal.client_id}::uuid, 'TRX') ON CONFLICT (client_id) DO NOTHING`
      const [vault] = await sql`SELECT balance FROM client_vaults WHERE client_id=${withdrawal.client_id}::uuid`
      if (Number(vault.balance) < Number(withdrawal.amount)) return NextResponse.json({ error: 'Insufficient Client Vault TRX balance at approval' }, { status: 409 })
      const [updated] = await sql`
        UPDATE client_vaults SET balance = balance - ${withdrawal.amount}, currency='TRX', updated_at=NOW()
        WHERE client_id=${withdrawal.client_id}::uuid RETURNING balance
      `
      await sql`
        INSERT INTO client_vault_ledger (client_id, entry_type, amount, currency, balance_after, source, reference, reason, actor_id)
        VALUES (${withdrawal.client_id}::uuid, 'withdrawal', ${-Number(withdrawal.amount)}, 'TRX', ${updated.balance}, 'Client Vault Withdrawal', ${withdrawalId}, ${note || 'Admin approved TRX withdrawal'}, ${auth.session.user.id}::uuid)
      `
      await sql`UPDATE client_vault_withdrawals SET status='approved', reviewed_at=NOW(), processed_at=NOW(), reviewed_by=${auth.session.user.id}::uuid, note=${note || null} WHERE id=${withdrawalId}::uuid`
      return NextResponse.json({ success: true, status: 'approved', balance: updated.balance, currency: 'TRX' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
