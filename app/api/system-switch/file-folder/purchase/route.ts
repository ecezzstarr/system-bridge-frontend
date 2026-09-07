import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'

const STANDARD_PRICE_TRX = 35800
const MINIMUM_PRICE_TRX = 1800
const sql = neon(process.env.DATABASE_URL!)

function validPrice(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= MINIMUM_PRICE_TRX && amount <= 100000000
}

async function ensurePurchaseSchema() {
  await sql`CREATE TABLE IF NOT EXISTS file_folder_purchases (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),file_number varchar(120),client_id uuid,buyer_name varchar(255),buyer_email varchar(255),buyer_phone varchar(80),amount_trx numeric(30,8) NOT NULL,payment_method varchar(40) NOT NULL,payment_reference varchar(255) NOT NULL,status varchar(40) NOT NULL DEFAULT 'pending_admin_confirmation',created_at timestamptz NOT NULL DEFAULT NOW(),confirmed_at timestamptz,confirmed_by uuid)`
  await sql`ALTER TABLE file_folder_purchases ALTER COLUMN file_number DROP NOT NULL`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS client_id uuid`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS buyer_name varchar(255)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS buyer_email varchar(255)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS buyer_phone varchar(80)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS confirmed_by uuid`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_file_folder_purchases_payment_reference ON file_folder_purchases(payment_reference)`
  await sql`CREATE INDEX IF NOT EXISTS idx_file_folder_purchases_file_number ON file_folder_purchases(file_number)`
}

export async function POST(request: NextRequest) {
  try {
    await ensureClientFileFolderSchema(sql); await ensurePurchaseSchema()
    const body = await request.json()
    const fileNumber = typeof body.fileNumber === 'string' && body.fileNumber.trim() ? body.fileNumber.trim().toUpperCase() : null
    const amountTrx = body.amountTrx == null || body.amountTrx === '' ? STANDARD_PRICE_TRX : Number(body.amountTrx)
    const paymentMethod = body.paymentMethod === 'flutterwave' ? 'flutterwave' : 'trx'
    const paymentReference = typeof body.paymentReference === 'string' ? body.paymentReference.trim() : ''
    const buyerName = typeof body.buyerName === 'string' ? body.buyerName.trim() : null
    const buyerEmail = typeof body.buyerEmail === 'string' ? body.buyerEmail.trim() : null
    const buyerPhone = typeof body.buyerPhone === 'string' ? body.buyerPhone.trim() : null
    const clientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : null
    if (!validPrice(amountTrx)) return NextResponse.json({ error: `File Folder value must be at least ${MINIMUM_PRICE_TRX.toLocaleString()} TRX.` }, { status: 400 })
    if (!paymentReference) return NextResponse.json({ error: 'Payment reference is required.' }, { status: 400 })
    if (fileNumber) {
      const [folder] = await sql`SELECT * FROM client_file_folders WHERE file_number=${fileNumber} LIMIT 1`
      if (!folder) return NextResponse.json({ error: 'File Folder not found' }, { status: 404 })
      if (folder.client_id) return NextResponse.json({ error: 'File Folder is already active' }, { status: 409 })
    }
    const [existing] = await sql`SELECT id FROM file_folder_purchases WHERE payment_reference=${paymentReference} LIMIT 1`
    if (existing) return NextResponse.json({ error: 'Payment reference already recorded' }, { status: 409 })
    const [record] = await sql`
      INSERT INTO file_folder_purchases (file_number,client_id,buyer_name,buyer_email,buyer_phone,amount_trx,payment_method,payment_reference)
      VALUES (${fileNumber},${clientId || null},${buyerName},${buyerEmail},${buyerPhone},${amountTrx},${paymentMethod},${paymentReference}) RETURNING *
    `
    return NextResponse.json({ success: true, purchase: record, message: 'Payment recorded. Administration must confirm the payment before the File Folder is activated.' }, { status: 201 })
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
    const [purchase] = await sql`SELECT * FROM file_folder_purchases WHERE id=${purchaseId}::uuid LIMIT 1`
    if (!purchase) return NextResponse.json({ error: 'Purchase record not found' }, { status: 404 })
    if (purchase.status === 'confirmed') return NextResponse.json({ error: 'Purchase is already confirmed' }, { status: 409 })
    const [folder] = await sql`SELECT * FROM client_file_folders WHERE file_number=${fileNumber} LIMIT 1`
    if (!folder) return NextResponse.json({ error: 'File Folder not found. Create/issue the File Number first.' }, { status: 404 })
    if (folder.client_id && folder.client_id !== clientId) return NextResponse.json({ error: 'File Folder is already assigned' }, { status: 409 })
    const [claimed] = await sql`UPDATE client_file_folders SET client_id=${clientId}::uuid,client_name=${clientName},status='active',claimed_at=COALESCE(claimed_at,NOW()),updated_at=NOW() WHERE file_number=${fileNumber} AND (client_id IS NULL OR client_id=${clientId}::uuid) RETURNING *`
    if (!claimed) return NextResponse.json({ error: 'File Folder could not be activated' }, { status: 409 })
    const [confirmed] = await sql`UPDATE file_folder_purchases SET file_number=${fileNumber},client_id=${clientId}::uuid,status='confirmed',confirmed_at=NOW(),confirmed_by=${auth.session.user.id}::uuid WHERE id=${purchaseId}::uuid RETURNING *`
    return NextResponse.json({ success: true, folder: claimed, purchase: confirmed })
  } catch (error: any) { return NextResponse.json({ error: error?.message || 'Unable to confirm File Folder purchase' }, { status: 500 }) }
}
