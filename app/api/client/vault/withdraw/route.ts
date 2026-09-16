import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken, ensureClientVaultSchema } from '@/lib/client-vault'
import { ensureClientVaultLedgerSchema } from '@/lib/client-vault-ledger'

export async function POST(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })
  const body = await request.json()
  const amount = Number(body.amount)
  const destination = String(body.destination || '').trim()
  if (!Number.isFinite(amount) || amount <= 0 || !destination) return NextResponse.json({ error: 'Amount and destination are required' }, { status: 400 })
  await ensureClientVaultSchema(sql); await ensureClientVaultLedgerSchema(sql)
  const [vault] = await sql`SELECT balance,currency FROM client_vaults WHERE client_id=${clientId}::uuid LIMIT 1`
  if (!vault || Number(vault.balance) < amount) return NextResponse.json({ error: 'Insufficient available value' }, { status: 409 })
  const [requestRow] = await sql`INSERT INTO client_vault_withdrawals (client_id,amount,currency,destination,status) VALUES (${clientId}::uuid,${amount},${vault.currency},${destination},'pending_approval') RETURNING id,amount,currency,destination,status,created_at`
  return NextResponse.json({ success: true, withdrawal: requestRow })
}
