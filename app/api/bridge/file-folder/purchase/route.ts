import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { FILE_FOLDER_PRICING, getFileFolderTier, isValidFileFolderAmount } from '@/lib/file-folder-pricing'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { recordSystemEvent } from '@/lib/system-events'
import { requireApiUser } from '@/lib/api-auth'
import { accrueAiProviderAllocation } from '@/lib/ai-provider-settlement'
import { issueWeaveReceipt } from '@/lib/weave-receipts'

const sql = neon(process.env.DATABASE_URL!)
function validPrice(value: unknown) { const amount = Number(value); return isValidFileFolderAmount(amount) && amount <= 100000000 }
async function ensurePurchaseSchema() {
  await sql`CREATE TABLE IF NOT EXISTS file_folder_purchases (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),file_number varchar(120),client_id uuid,buyer_name varchar(255),buyer_email varchar(255),buyer_phone varchar(80),amount_trx numeric(30,8) NOT NULL,payment_method varchar(40) NOT NULL,payment_reference varchar(255) NOT NULL,status varchar(40) NOT NULL DEFAULT 'pending_admin_confirmation',created_at timestamptz NOT NULL DEFAULT NOW(),confirmed_at timestamptz,confirmed_by uuid)`
  await sql`ALTER TABLE file_folder_purchases ALTER COLUMN file_number DROP NOT NULL`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS client_id uuid`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS buyer_name varchar(255)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS buyer_email varchar(255)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS buyer_phone varchar(80)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS confirmed_by uuid`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS bridge_code varchar(32)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS provider_key varchar(120)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS provider_name varchar(255)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS flame_name varchar(120)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS flame_external_id varchar(255)`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_file_folder_purchases_payment_reference ON file_folder_purchases(payment_reference)`
  await sql`CREATE INDEX IF NOT EXISTS idx_file_folder_purchases_file_number ON file_folder_purchases(file_number)`
}

export async function POST(request: NextRequest) {
  try {
    await ensureClientFileFolderSchema(sql); await ensurePurchaseSchema()
    const body = await request.json()
    const fileNumber = typeof body.fileNumber === 'string' && body.fileNumber.trim() ? body.fileNumber.trim().toUpperCase() : null
    const rawAmount = body.amountFlameCoin ?? body.amountTrx // amountTrx kept only for legacy clients
    const amountFlameCoin = rawAmount == null || rawAmount === '' ? FILE_FOLDER_PRICING.standardMinimumFlameCoin : Number(rawAmount)
    const fileFolderTier = getFileFolderTier(amountFlameCoin)
    const paymentMethod = 'trx'
    const paymentReference = typeof body.paymentReference === 'string' ? body.paymentReference.trim() : ''
    const buyerName = typeof body.buyerName === 'string' ? body.buyerName.trim() : null
    const buyerEmail = typeof body.buyerEmail === 'string' ? body.buyerEmail.trim() : null
    const buyerPhone = typeof body.buyerPhone === 'string' ? body.buyerPhone.trim() : null
    const user = await requireApiUser(request)
    if (user && user.role !== 'client') {
      return NextResponse.json({
        error: 'File Folder ownership belongs to Clients. Support positions may support Client File Folders but cannot own one.',
      }, { status: 403 })
    }
    const clientId = user?.role === 'client' ? user.id : null
    const bridgeCode = typeof body.bridgeCode === 'string' ? body.bridgeCode.trim().slice(0,32) : null
    let providerKey: string | null = null
    let providerName: string | null = null
    let flameName: string | null = null
    let flameExternalId: string | null = null
    if (bridgeCode) {
      const [trustedCrossing] = await sql`SELECT provider_key,provider_name,flame_name,flame_external_id FROM chatgpt_bridge_sessions WHERE code=${bridgeCode} AND expires_at > NOW() LIMIT 1`
      if (!trustedCrossing) return NextResponse.json({ error: 'Bridge crossing not found or expired' }, { status: 400 })
      providerKey = trustedCrossing.provider_key || null
      providerName = trustedCrossing.provider_name || null
      flameName = trustedCrossing.flame_name || null
      flameExternalId = trustedCrossing.flame_external_id || null
    }
    if (!validPrice(amountFlameCoin) || !fileFolderTier) return NextResponse.json({ error: `Standard File Folder must be from ${FILE_FOLDER_PRICING.standardMinimumFlameCoin.toLocaleString()} Flame Coin up to anything below ${FILE_FOLDER_PRICING.premiumFlameCoin.toLocaleString()}, or choose Premium at exactly ${FILE_FOLDER_PRICING.premiumFlameCoin.toLocaleString()} Flame Coin.` }, { status: 400 })
    if (!paymentReference) return NextResponse.json({ error: 'TRX transaction hash is required.' }, { status: 400 })
    if (fileNumber) {
      const [folder] = await sql`SELECT * FROM client_file_folders WHERE file_number=${fileNumber} LIMIT 1`
      if (!folder) return NextResponse.json({ error: 'File Folder not found' }, { status: 404 })
      if (folder.client_id) return NextResponse.json({ error: 'File Folder is already active' }, { status: 409 })
    }
    const [existing] = await sql`SELECT id FROM file_folder_purchases WHERE payment_reference=${paymentReference} LIMIT 1`
    if (existing) return NextResponse.json({ error: 'Payment reference already recorded' }, { status: 409 })
    const [record] = await sql`INSERT INTO file_folder_purchases (file_number,client_id,buyer_name,buyer_email,buyer_phone,amount_trx,payment_method,payment_reference,bridge_code,provider_key,provider_name,flame_name,flame_external_id) VALUES (${fileNumber},${clientId || null},${buyerName},${buyerEmail},${buyerPhone},${amountFlameCoin},${paymentMethod},${paymentReference},${bridgeCode},${providerKey},${providerName},${flameName},${flameExternalId}) RETURNING *`
    await recordSystemEvent({ eventType: 'file_folder_purchased', actorId: clientId, subjectType: 'file_folder_purchase', subjectId: String(record.id), source: 'bridge-file-folder', payload: { fileNumber, amountFlameCoin, fileFolderTier, paymentMethod, paymentReference } })
    const receipt = clientId ? await issueWeaveReceipt({ userId: clientId, kind: 'purchase', source: 'file_folder', sourceId: String(record.id), amount: amountFlameCoin, currency: 'Flame Coin', status: 'pending', description: `${fileFolderTier === 'premium' ? 'Premium' : 'Standard'} File Folder purchase submitted`, metadata: { fileNumber, fileFolderTier, paymentMethod, paymentReference } }) : null
    return NextResponse.json({ success: true, purchase: { ...record, fileFolderTier }, receipt, fileFolderTier, message: `${fileFolderTier === 'premium' ? 'Premium' : 'Standard'} File Folder payment recorded. Administration must confirm the payment before the File Folder is activated.` }, { status: 201 })
  } catch (error: any) { return NextResponse.json({ error: error?.message || 'Unable to record File Folder purchase' }, { status: 500 }) }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    await ensureClientFileFolderSchema(sql); await ensurePurchaseSchema()
    const body = await request.json()
    const purchaseId = typeof body.purchaseId === 'string' ? body.purchaseId : ''
    const fileNumber = typeof body.fileNumber === 'string' && body.fileNumber.trim() ? body.fileNumber.trim().toUpperCase() : ''
    const clientId = typeof body.clientId === 'string' ? body.clientId : ''
    const clientName = typeof body.clientName === 'string' ? body.clientName : ''
    if (!purchaseId || !fileNumber || !clientId || !clientName) return NextResponse.json({ error: 'purchaseId, fileNumber, clientId and clientName are required' }, { status: 400 })
    const [targetClient] = await sql`SELECT id,role FROM users WHERE id=${clientId}::uuid AND role='client' LIMIT 1`
    if (!targetClient) return NextResponse.json({ error: 'File Folder can only be assigned to a Client account' }, { status: 400 })
    const [purchase] = await sql`SELECT * FROM file_folder_purchases WHERE id=${purchaseId}::uuid LIMIT 1`
    if (!purchase) return NextResponse.json({ error: 'Purchase record not found' }, { status: 404 })
    if (purchase.status === 'confirmed') return NextResponse.json({ error: 'Purchase is already confirmed' }, { status: 409 })
    const [folder] = await sql`SELECT * FROM client_file_folders WHERE file_number=${fileNumber} LIMIT 1`
    if (!folder) return NextResponse.json({ error: 'File Folder not found. Create/issue the File Number first.' }, { status: 404 })
    if (folder.client_id && String(folder.client_id) !== String(clientId)) return NextResponse.json({ error: 'File Folder is already assigned' }, { status: 409 })
    const [claimed] = await sql`UPDATE client_file_folders SET client_id=${clientId}::uuid,client_name=${clientName},status='active',claimed_at=COALESCE(claimed_at,NOW()),updated_at=NOW() WHERE file_number=${fileNumber} AND (client_id IS NULL OR client_id=${clientId}::uuid) RETURNING *`
    if (!claimed) return NextResponse.json({ error: 'File Folder could not be activated' }, { status: 409 })
    const [confirmed] = await sql`UPDATE file_folder_purchases SET file_number=${fileNumber},client_id=${clientId}::uuid,status='confirmed',confirmed_at=NOW(),confirmed_by=${auth.session.user.id}::uuid WHERE id=${purchaseId}::uuid RETURNING *`
    const allocation = await accrueAiProviderAllocation({ sql, purchaseId: String(confirmed.id), fileNumber, grossAmount: Number(confirmed.amount_trx), bridgeCode: confirmed.bridge_code, providerKey: confirmed.provider_key, providerName: confirmed.provider_name, flameExternalId: confirmed.flame_external_id, flameName: confirmed.flame_name })
    await recordSystemEvent({ eventType: 'file_number_issued', actorId: auth.session.user.id, actorRole: 'admin', subjectType: 'client_file_folder', subjectId: fileNumber, source: 'admin-file-folder', payload: { purchaseId, clientId } })
    await recordSystemEvent({ eventType: 'client_registered', actorId: clientId, actorRole: 'client', subjectType: 'client_file_folder', subjectId: fileNumber, source: 'bridge-file-folder', payload: { purchaseId } })
    return NextResponse.json({ success: true, folder: claimed, purchase: confirmed, aiProviderAllocation: allocation?.allocation || null })
  } catch (error: any) { return NextResponse.json({ error: error?.message || 'Unable to confirm File Folder purchase' }, { status: 500 }) }
}
