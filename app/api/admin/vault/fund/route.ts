import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthUser(request)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { clientId, amountTrx } = await request.json()
    if (!clientId || !amountTrx || Number(amountTrx) <= 0) {
      return NextResponse.json({ error: 'clientId and a positive amountTrx are required' }, { status: 400 })
    }

    const clients = await sql`SELECT id, name, role FROM users WHERE id = ${clientId}::uuid AND role = 'client'`
    if (clients.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const existingWallet = await sql`SELECT id FROM wallets WHERE user_id = ${clientId}::uuid AND is_primary = true`
    if (existingWallet.length === 0) {
      await sql`
        INSERT INTO wallets (id, user_id, balance_trx, balance_usdt, play_balance, is_primary, is_eight_engine_controlled, created_at, updated_at)
        VALUES (gen_random_uuid(), ${clientId}::uuid, 0, 0, 0, true, true, NOW(), NOW())
      `
    }

    await sql`
      UPDATE wallets
      SET balance_trx = balance_trx + ${Number(amountTrx)}, updated_at = NOW()
      WHERE user_id = ${clientId}::uuid AND is_primary = true
    `

    await sql`
      INSERT INTO ledger_entries (user_id, entry_type, amount, currency, description, metadata)
      VALUES (
        ${clientId}::uuid,
        'deposit',
        ${Number(amountTrx)},
        'TRX',
        'Vault funded by Admin',
        ${JSON.stringify({ funded_by: admin.id, source: 'admin_vault_fund' })}
      )
    `

    return NextResponse.json({ success: true, message: `Vault funded with ${amountTrx} TRX` })
  } catch (error: any) {
    console.error('Vault fund error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
