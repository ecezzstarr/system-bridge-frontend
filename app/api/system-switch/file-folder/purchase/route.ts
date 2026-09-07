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
  await sql`
    CREATE TABLE IF NOT EXISTS file_folder_purchases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      file_number varchar(120) NOT NULL,
      amount_trx numeric(30,8) NOT NULL,
      payment_method varchar(40) NOT NULL,
      payment_reference varchar(255) NOT NULL,
      status varchar(40) NOT NULL DEFAULT 'pending_admin_confirmation',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      confirmed_at timestamptz,
      confirmed_by uuid
    )
  `
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_file_folder_purchases_payment_reference ON file_folder_purchases(payment_reference)`
  await sql`CREATE INDEX IF NOT EXISTS idx_file_folder_purchases_file_number ON file_folder_purchases(file_number)`
}

export async function POST(request: NextRequest) {
  try {
    await ensureClientFileFolderSchema(sql)
    await ensurePurchaseSchema()
    const body = await request.json()
    const fileNumber = typeof body.fileNumber === 'string' ? body.fileNumber.trim().toUpperCase() : ''
    const amountTrx = body.amountTrx == null || body.amountTrx === '' ? STANDARD_PRICE_TRX : Number(body.amountTrx)
    const paymentMethod = body.paymentMethod === 'flutterwave' ? 'flutterwave' : 'trx'
    const paymentReference = typeof body.paymentReference === 'string' ? body.paymentReference.trim() : ''

    if (!fileNumber) return NextResponse.json({ error: 'File Number is required' }, { status: 400 })
    if (!validPrice(amountTrx)) return NextResponse.json({ error: `File Folder value must be at least ${MINIMUM_PRICE_TRX.toLocaleString()} TRX.` }, { status: 400 })
    if (!paymentReference) return NextResponse.json({ error: 'Payment reference is required before a File Folder can be issued.' }, { status: 400 })

    const [folder] = await sql`SELECT * FROM client_file_folders WHERE file_number=${fileNumber} LIMIT 1`
    if (!folder) return NextResponse.json({ error: 'File Folder not found' }, { status: 404 })
    if (folder.client_id) return NextResponse.json({ error: 'File Folder is already active', folder }, { status: 409 })

    const [existing] = await sql`SELECT id FROM file_folder_purchases WHERE payment_reference=${paymentReference} LIMIT 1`
    if (existing) return NextResponse.json({ error: 'Payment reference already recorded' }, { status: 409 })

    const [record] = await sql`
      INSERT INTO file_folder_purchases (file_number,amount_trx,payment_method,payment_reference)
      VALUES (${fileNumber},${amountTrx},${paymentMethod},${paymentReference})
      RETURNING *
    `

    return NextResponse.json({ success: true, purchase: record, message: 'Payment recorded. Administration must confirm the payment before the File Folder is activated.' }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to record File Folder purchase' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response

  try {
    await ensureClientFileFolderSchema(sql)
    await ensurePurchaseSchema()
    const body = await request.json()
    const fileNumber = typeof body.fileNumber === 'string' ? body.fileNumber.trim().toUpperCase() : ''
    const purchaseId = typeof body.purchaseId === 'string' ? body.purchaseId : ''
    const clientId = typeof body.clientId === 'string' ? body.clientId : ''
    const clientName = typeof body.clientName === 'string' ? body.clientName : ''

    if (!fileNumber || !purchaseId || !clientId || !clientName) return NextResponse.json({ error: 'fileNumber, purchaseId, clientId and clientName are required' }, { status: 400 })

    const [purchase] = await sql`SELECT * FROM file_folder_purchases WHERE id=${purchaseId}::uuid AND file_number=${fileNumber} LIMIT 1`
    if (!purchase) return NextResponse.json({ error: 'Purchase record not found' }, { status: 404 })
    if (purchase.status === 'confirmed') return NextResponse.json({ error: 'Purchase is already confirmed' }, { status: 409 })

    const [folder] = await sql`
      UPDATE client_file_folders
      SET client_id=${clientId}::uuid,status='active',claimed_at=COALESCE(claimed_at,NOW()),updated_at=NOW(),client_name=${clientName}
      WHERE file_number=${fileNumber} AND client_id IS NULL
      RETURNING *
    `
    if (!folder) return NextResponse.json({ error: 'File Folder could not be claimed' }, { status: 409 })

    const [confirmed] = await sql`
      UPDATE file_folder_purchases SET status='confirmed',confirmed_at=NOW(),confirmed_by=${auth.session.user.id}::uuid WHERE id=${purchaseId}::uuid RETURNING *
    `

    return NextResponse.json({ success: true, folder, purchase: confirmed })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unable to confirm File Folder purchase' }, { status: 500 })
  }
}
