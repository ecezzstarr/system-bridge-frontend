import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { ensureClientVaultSchema, decodeClientToken } from '@/lib/client-vault'

function getClientId(request: NextRequest) {
  const token = request.cookies.get('client_token')?.value || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null
  return decodeClientToken(token)
}

export async function GET(request: NextRequest) {
  try {
    const clientId = getClientId(request)
    if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const sql = neon(process.env.DATABASE_URL || '')
    await ensureClientVaultSchema(sql)
    const [vault] = await sql`SELECT client_id, balance, currency, updated_at FROM client_vaults WHERE client_id = ${clientId}::uuid`
    const ledger = await sql`
      SELECT id, entry_type, amount, currency, balance_after, source, reference, reason, created_at
      FROM client_vault_ledger WHERE client_id = ${clientId}::uuid
      ORDER BY created_at DESC LIMIT 50
    `
    const withdrawals = await sql`
      SELECT id, amount, currency, destination, status, requested_at, reviewed_at, processed_at, note
      FROM client_vault_withdrawals WHERE client_id = ${clientId}::uuid
      ORDER BY requested_at DESC LIMIT 20
    `
    return NextResponse.json({ success: true, vault: vault || { client_id: clientId, balance: 0, currency: 'TRX' }, ledger, withdrawals })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to load Client Vault' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientId(request)
    if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { amount, destination } = await request.json()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return NextResponse.json({ error: 'A positive TRX withdrawal amount is required' }, { status: 400 })
    if (!destination || typeof destination !== 'string' || !destination.trim()) {
      return NextResponse.json({ error: 'A TRX withdrawal destination is required' }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL || '')
    await ensureClientVaultSchema(sql)
    const [vault] = await sql`SELECT balance, currency FROM client_vaults WHERE client_id = ${clientId}::uuid`
    const balance = Number(vault?.balance || 0)
    if (value > balance) return NextResponse.json({ error: 'Insufficient Client Vault TRX balance' }, { status: 400 })
    if (vault?.currency && vault.currency !== 'TRX') return NextResponse.json({ error: 'Client Vault is not configured for TRX settlement' }, { status: 409 })

    const [pending] = await sql`
      SELECT id FROM client_vault_withdrawals
      WHERE client_id = ${clientId}::uuid AND status = 'pending' LIMIT 1
    `
    if (pending) return NextResponse.json({ error: 'A withdrawal is already pending Admin review' }, { status: 409 })

    const [row] = await sql`
      INSERT INTO client_vault_withdrawals (client_id, amount, currency, destination, status)
      VALUES (${clientId}::uuid, ${value}, 'TRX', ${destination.trim()}, 'pending') RETURNING *
    `
    return NextResponse.json({ success: true, withdrawal: row, message: 'TRX withdrawal submitted for Admin review' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to request TRX withdrawal' }, { status: 500 })
  }
}
