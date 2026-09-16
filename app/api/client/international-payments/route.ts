import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureClientInternationalPaymentProfile } from '@/lib/client-international-payments'

export async function GET(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })
  const profile = await ensureClientInternationalPaymentProfile(sql, clientId)
  return NextResponse.json({ profile }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function PUT(request: NextRequest) {
  const sql = getFileFolderDb()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const clientId = await resolveClientToken(token, sql)
  if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })

  const body = await request.json()
  const enabled = Boolean(body.enabled)
  const accountName = String(body.account_name || '').trim()
  const receivingIdentifier = String(body.receiving_identifier || '').trim()
  const paymentLink = String(body.payment_link || '').trim()
  const supportedCurrencies = String(body.supported_currencies || 'USD,EUR,GBP').trim()
  const instructions = String(body.instructions || '').trim()
  const fee = Number(body.service_fee_percent ?? 15)

  if (!Number.isFinite(fee) || fee < 15 || fee > 30) {
    return NextResponse.json({ error: 'Service fee must be between 15% and 30%.' }, { status: 400 })
  }

  await ensureClientInternationalPaymentProfile(sql, clientId)
  const [profile] = await sql`
    UPDATE client_international_payment_profiles
    SET enabled=${enabled}, account_name=${accountName || null}, receiving_identifier=${receivingIdentifier || null},
        payment_link=${paymentLink || null}, supported_currencies=${supportedCurrencies || 'USD,EUR,GBP'},
        service_fee_percent=${fee}, instructions=${instructions || null}, updated_at=NOW()
    WHERE client_id=${clientId}::uuid
    RETURNING *
  `
  return NextResponse.json({ success: true, profile })
}
