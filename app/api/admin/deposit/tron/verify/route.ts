import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { creditAgentCommission } from '@/lib/agent-commission'

// Resolves the Bridger for a client, checking both the legacy users(role='client')
// path and the dedicated clients table — matches app/api/client/bridger/route.ts.
async function resolveBridgerForClient(clientId: string): Promise<string | null> {
  const users = await sql`
    SELECT referred_by FROM users WHERE id = ${clientId}::uuid AND role = 'client'
  `
  if (users.length > 0 && users[0].referred_by) return users[0].referred_by

  const clients = await sql`
    SELECT referred_by, assigned_bridger_id FROM clients WHERE id = ${clientId}::uuid
  `
  if (clients.length > 0) {
    return clients[0].assigned_bridger_id || clients[0].referred_by || null
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthUser(request)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { depositId, status } = await request.json()

    if (!depositId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'depositId and a valid status (approved|rejected) are required' },
        { status: 400 }
      )
    }

    const deposit = await sql`
      SELECT * FROM deposits
      WHERE id = ${depositId}::uuid AND method = 'tron' AND status = 'pending'
    `

    if (!deposit[0]) {
      return NextResponse.json({ error: 'Deposit not found or already processed' }, { status: 404 })
    }

    if (status === 'rejected') {
      await sql`
        UPDATE deposits
        SET status = 'rejected', verifier_id = ${admin.id}::uuid, verified_at = NOW(), updated_at = NOW()
        WHERE id = ${depositId}::uuid
      `
      return NextResponse.json({ success: true, message: 'TRON deposit rejected' })
    }

    const trxAmount = Number(deposit[0].amount_trx)
    const clientId = deposit[0].user_id

    await sql`
      UPDATE wallets
      SET balance_trx = balance_trx + ${trxAmount}, updated_at = NOW()
      WHERE user_id = ${clientId}::uuid AND is_primary = true
    `

    await sql`
      UPDATE deposits
      SET status = 'approved', verifier_id = ${admin.id}::uuid, verified_at = NOW(), updated_at = NOW()
      WHERE id = ${depositId}::uuid
    `

    await sql`
      INSERT INTO ledger_entries (user_id, entry_type, amount, currency, description, metadata)
      VALUES (
        ${clientId}::uuid,
        'deposit',
        ${trxAmount},
        'TRX',
        'TRON Deposit Approved',
        ${JSON.stringify({ deposit_id: depositId, approved_by: admin.id })}
      )
    `

    const bridgerId = await resolveBridgerForClient(clientId)
    if (bridgerId) {
      creditAgentCommission({
        bridgerId,
        activity: 'client_deposit',
        baseAmount: trxAmount,
        description: `2% commission (5% of Weave's 40%): referred Bridger's client deposited ${trxAmount.toFixed(2)} TRX`,
      }).catch(err => console.error('[tron verify] commission error:', err))
    }

    return NextResponse.json({ success: true, message: 'TRX credited successfully', bridgerId })
  } catch (error: any) {
    console.error('TRON verify error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
