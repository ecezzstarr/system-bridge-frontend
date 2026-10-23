import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { POST as submitFileFolderPurchase } from '@/app/api/bridge/file-folder/purchase/route'
import { FILE_FOLDER_PRICING, getFileFolderTier } from '@/lib/file-folder-pricing'
import { requireApiUser } from '@/lib/api-auth'
import { activatePurchasedFileFolderForClient } from '@/lib/file-folder-purchase-activation'

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

async function verifyPurchaseAccess(purchaseId: string, accessToken: string) {
  const [access] = await sql`
    SELECT purchase_id
    FROM public_file_folder_purchase_access
    WHERE purchase_id=${purchaseId}::uuid
      AND token_hash=${tokenHash(accessToken)}
    LIMIT 1
  `
  return Boolean(access)
}

async function readPurchase(purchaseId: string) {
  const [purchase] = await sql`
    SELECT
      id,
      file_number,
      client_id,
      buyer_name,
      buyer_email,
      buyer_phone,
      amount_trx,
      file_folder_tier,
      status,
      created_at,
      confirmed_at
    FROM file_folder_purchases
    WHERE id=${purchaseId}::uuid
    LIMIT 1
  `
  return purchase || null
}

function purchaseResponse(purchase: any, clientOwnsPurchase = false) {
  const amountFlameCoin = Number(purchase.amount_trx || 0)
  const fileFolderTier = getFileFolderTier(amountFlameCoin, purchase.file_folder_tier) || getFileFolderTier(amountFlameCoin)
  const confirmed = purchase.status === 'confirmed' && Boolean(purchase.file_number)

  return {
    success: true,
    purchase: {
      id: purchase.id,
      status: purchase.status,
      fileNumber: purchase.file_number || null,
      amountFlameCoin: fileFolderTier === 'plus' ? FILE_FOLDER_PRICING.plusFlameCoin : amountFlameCoin,
      amountTrx: amountFlameCoin,
      usdtReference: fileFolderTier === 'plus' ? FILE_FOLDER_PRICING.plusUsdt : null,
      fileFolderTier,
      confirmedAt: purchase.confirmed_at || null,
    },
    crossing: confirmed
      ? clientOwnsPurchase
        ? {
            ready: true,
            clientActive: true,
            systemSwitchUrl: '/client/system-switch',
          }
        : {
            ready: true,
            clientActive: false,
            registerUrl: `/client/register?fileNumber=${encodeURIComponent(purchase.file_number)}`,
          }
      : { ready: false },
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensurePublicPurchaseAccessSchema()

    // Keep one File Folder ledger and one Administration verification movement.
    // This public route delegates the actual purchase record to the existing
    // Bridge File Folder purchase endpoint, then adds only a private return key.
    const purchaseResponseResult = await submitFileFolderPurchase(request)
    const purchaseBody = await purchaseResponseResult.json()

    if (!purchaseResponseResult.ok || !purchaseBody?.success || !purchaseBody?.purchase?.id) {
      return NextResponse.json(purchaseBody, { status: purchaseResponseResult.status })
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
    }, { status: purchaseResponseResult.status })
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

    if (!(await verifyPurchaseAccess(purchaseId, accessToken))) {
      return NextResponse.json({ error: 'Purchase access denied' }, { status: 403 })
    }

    const purchase = await readPurchase(purchaseId)
    if (!purchase) return NextResponse.json({ error: 'File Folder purchase not found' }, { status: 404 })

    const user = await requireApiUser(request)
    const clientOwnsPurchase = Boolean(
      user?.role === 'client' && purchase.client_id && String(purchase.client_id) === String(user.id)
    )

    return NextResponse.json(
      purchaseResponse(purchase, clientOwnsPurchase),
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error: any) {
    console.error('[public file-folder purchase GET]', error)
    return NextResponse.json({ error: error?.message || 'Unable to read public File Folder purchase' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensurePublicPurchaseAccessSchema()
    const body = await request.json()
    const purchaseId = typeof body.purchaseId === 'string' ? body.purchaseId.trim() : ''
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : ''

    if (!purchaseId || !accessToken) {
      return NextResponse.json({ error: 'purchaseId and accessToken are required' }, { status: 400 })
    }

    if (!(await verifyPurchaseAccess(purchaseId, accessToken))) {
      return NextResponse.json({ error: 'Purchase access denied' }, { status: 403 })
    }

    const user = await requireApiUser(request)
    if (!user || user.role !== 'client') {
      return NextResponse.json({ error: 'Client login required to attach this purchase' }, { status: 401 })
    }

    let purchase = await readPurchase(purchaseId)
    if (!purchase) return NextResponse.json({ error: 'File Folder purchase not found' }, { status: 404 })

    if (purchase.client_id && String(purchase.client_id) !== String(user.id)) {
      return NextResponse.json({ error: 'This File Folder purchase is already attached to another Client' }, { status: 409 })
    }

    if (!purchase.client_id) {
      const [claimed] = await sql`
        UPDATE file_folder_purchases
        SET client_id=${user.id}::uuid
        WHERE id=${purchaseId}::uuid
          AND client_id IS NULL
        RETURNING *
      `
      if (claimed) purchase = claimed
    }

    if (purchase.status === 'confirmed' && purchase.file_number) {
      await activatePurchasedFileFolderForClient({
        sql,
        clientId: String(user.id),
        fileNumber: String(purchase.file_number),
        clientName: user.name || purchase.buyer_name || 'Client',
        purchaseId,
      })
      purchase = await readPurchase(purchaseId)
    }

    return NextResponse.json(
      purchaseResponse(purchase, true),
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error: any) {
    console.error('[public file-folder purchase PATCH]', error)
    return NextResponse.json({ error: error?.message || 'Unable to attach File Folder purchase to Client' }, { status: 500 })
  }
}
