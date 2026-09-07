import { NextRequest, NextResponse } from 'next/server'
import { requireWorkshopAuthorization } from '@/lib/workshop-auth'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { neon } from '@/lib/pg-neon'

const sql = neon(process.env.DATABASE_URL!)

async function ensurePurchaseSchema() {
  await sql`CREATE TABLE IF NOT EXISTS file_folder_purchases (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),file_number varchar(120),client_id uuid,buyer_name varchar(255),buyer_email varchar(255),buyer_phone varchar(80),amount_trx numeric(30,8) NOT NULL,payment_method varchar(40) NOT NULL,payment_reference varchar(255) NOT NULL,status varchar(40) NOT NULL DEFAULT 'pending_admin_confirmation',created_at timestamptz NOT NULL DEFAULT NOW(),confirmed_at timestamptz,confirmed_by uuid)`
  await sql`ALTER TABLE file_folder_purchases ALTER COLUMN file_number DROP NOT NULL`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS client_id uuid`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS buyer_name varchar(255)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS buyer_email varchar(255)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS buyer_phone varchar(80)`
  await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS confirmed_by uuid`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_file_folder_purchases_payment_reference ON file_folder_purchases(payment_reference)`
}

function makeFileNumber(sequence: number) {
  const now = new Date()
  const y = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  return `WEAVE-${y}-${mm}${dd}-${String(sequence).padStart(4, '0')}`
}

export async function GET(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    await ensurePurchaseSchema()
    const purchases = await sql`SELECT * FROM file_folder_purchases ORDER BY created_at DESC LIMIT 100`
    return NextResponse.json({ success: true, purchases })
  } catch (error: any) { return NextResponse.json({ success: false, error: error.message }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  const auth = await requireWorkshopAuthorization(request)
  if (!auth.authorized) return auth.response
  try {
    await ensureClientFileFolderSchema(sql); await ensurePurchaseSchema()
    const body = await request.json()
    const purchaseId = typeof body.purchaseId === 'string' ? body.purchaseId : ''
    if (!purchaseId) return NextResponse.json({ error: 'purchaseId is required' }, { status: 400 })
    const [purchase] = await sql`SELECT * FROM file_folder_purchases WHERE id=${purchaseId}::uuid LIMIT 1`
    if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    if (['confirmed','folder_issued'].includes(purchase.status)) return NextResponse.json({ error: 'Purchase already issued' }, { status: 409 })

    const [countRow] = await sql`SELECT COUNT(*)::int AS count FROM client_file_folders`
    let sequence = Number(countRow?.count || 0) + 1
    let fileNumber = typeof body.fileNumber === 'string' && body.fileNumber.trim() ? body.fileNumber.trim().toUpperCase() : makeFileNumber(sequence)
    while ((await sql`SELECT id FROM client_file_folders WHERE file_number=${fileNumber} LIMIT 1`).length) {
      sequence += 1; fileNumber = makeFileNumber(sequence)
    }

    const [folder] = await sql`
      INSERT INTO client_file_folders (file_number,client_name,workshop_type,status)
      VALUES (${fileNumber},${purchase.buyer_name || 'File Folder Client'},'formation','waiting_for_login') RETURNING *
    `
    const [updated] = await sql`
      UPDATE file_folder_purchases SET file_number=${fileNumber},status='folder_issued',confirmed_at=NOW(),confirmed_by=${auth.session.user.id}::uuid WHERE id=${purchaseId}::uuid RETURNING *
    `
    return NextResponse.json({ success: true, folder, purchase: updated })
  } catch (error: any) { return NextResponse.json({ success: false, error: error.message }, { status: 500 }) }
}
