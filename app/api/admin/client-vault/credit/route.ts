import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { ensureClientVaultSchema, resolveClientToken } from '@/lib/client-vault'
import { ensureClientVaultLedgerSchema } from '@/lib/client-vault-ledger'

export async function POST(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const adminId = await resolveClientToken(token, sql)
  if (!adminId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const [admin] = await sql`SELECT id,role FROM users WHERE id=${adminId}::uuid LIMIT 1`
  if (!admin || !['admin','administrator'].includes(String(admin.role).toLowerCase())) return NextResponse.json({ error: 'Administration access required' }, { status: 403 })
  const body = await request.json()
  const clientId = String(body.client_id || '')
  const amount = Number(body.amount)
  const currency = String(body.currency || 'TRX')
  if (!clientId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Valid client and amount are required' }, { status: 400 })
  await ensureClientVaultSchema(sql); await ensureClientVaultLedgerSchema(sql)
  await sql`INSERT INTO client_vaults (client_id,balance,currency) VALUES (${clientId}::uuid,${amount},${currency}) ON CONFLICT (client_id) DO UPDATE SET balance=client_vaults.balance+${amount},currency=${currency}`
  const [entry] = await sql`INSERT INTO client_vault_ledger (client_id,type,amount,currency,status,reference,note,created_by) VALUES (${clientId}::uuid,'admin_credit',${amount},${currency},'posted',${body.reference || null},${body.note || 'Administration credit'},${admin.id}::uuid) RETURNING *`
  return NextResponse.json({ success: true, entry })
}
