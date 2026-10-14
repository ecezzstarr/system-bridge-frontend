import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { POST as submitFileFolderPurchase } from '@/app/api/bridge/file-folder/purchase/route'

const sql = neon(process.env.DATABASE_URL!)

function tokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function ensurePublicPurchaseAccessSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS public_file_folder_purchase_access (
      purchase_id uuid PRIMARY KEY,
      token_hash varchar(64) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_public_file_folder_purchase_access_token
    ON public_file_folder_purchase_access(token_hash)
  `
}

export async function POST(request: NextRequest) {
  try {
    await ensurePublicPurchaseAccessSchema()

    // Keep one File Folder ledger and one Administration verification movement.
    // This public route delegates the actual purchase record to the existing
    // Bridge File Folder purchase endpoint, then adds only a private return key.
    const purchaseResponse = await submitFileFolderPurchase(request)
    const purchaseBody = await purchaseResponse.json()

    if (!purchaseResponse.ok || !purchaseBody?.success || !purchaseBody?.purchase?.id) {
      return NextResponse.json(purchaseBody, { status: purchaseResponse.status })
    }

    const accessToken = crypto.randomBytes(32).toString('base64url')
    const accessHash = tokenHash(accessToken)
    const purchaseId = String(purchaseBody.purchase.id)

    await sql`
      INSERT INTO public_file_folder_purchase_access (purchase_id, token_hash)
      VALUES (${purchaseId}::uuid, ${accessHash})
      ON CONFLICT (purchase_id) DO UPDATE SET
        token_hash=EXCLUDED.token_hash,
        created_at=NOW()
    `

    return NextResponse.json({
      ...purchaseBody,
      accessToken,
      publicCrossing: {
        purchaseId,
        statusUrl: `/api/public/file-folder/purchase?purchaseId=${encodeURIComponent(purchaseId)}&accessToken=${encodeURIComponent(accessToken)}`,
      },
    }, { status: purchaseResponse.status })
  } catch (error: any) {
    console.error('[public file-folder purchase POST]', error)
    return NextResponse.json({ error: error?.message || 'Unable to open public File Folder purchase' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensurePublicPurchaseAccessSchema()
    const { searchParams } = new URL(request.url)
    const purchaseId = searchParams.get('purchaseId')?.trim() || ''
    const accessToken = searchParams.get('accessToken')?.trim() || ''

    if (!purchaseId || !accessToken) {
      return NextResponse.json({ error: 'purchaseId and accessToken are required' }, { status: 400 })
    }

    const [access] = await sql`
      SELECT purchase_id
      FROM public_file_folder_purchase_access
      WHERE purchase_id=${purchaseId}::uuid
        AND token_hash=${tokenHash(accessToken)}
      LIMIT 1
    `
    if (!access) return NextResponse.json({ error: 'Purchase access denied' }, { status: 403 })

    const [purchase] = await sql`
      SELECT id,file_number,amount_trx,status,created_at,confirmed_at
      FROM file_folder_purchases
      WHERE id=${purchaseId}::uuid
      LIMIT 1
    `
    if (!purchase) return NextResponse.json({ error: 'File Folder purchase not found' }, { status: 404 })

    const confirmed = purchase.status === 'confirmed' && Boolean(purchase.file_number)
    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase.id,
        status: purchase.status,
        fileNumber: purchase.file_number || null,
        amountFlameCoin: Number(purchase.amount_trx || 0),
        confirmedAt: purchase.confirmed_at || null,
      },
      crossing: confirmed ? {
        ready: true,
        registerUrl: `/client/register?fileNumber=${encodeURIComponent(purchase.file_number)}`,
        systemSwitchUrl: '/client/system-switch',
      } : { ready: false },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error: any) {
    console.error('[public file-folder purchase GET]', error)
    return NextResponse.json({ error: error?.message || 'Unable to read public File Folder purchase' }, { status: 500 })
  }
}
