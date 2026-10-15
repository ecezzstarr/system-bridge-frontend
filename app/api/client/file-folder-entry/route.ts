import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb, ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import { ensureClientMoneyEnvironment } from '@/lib/client-money-environment'
import { activatePurchasedFileFolderForClient } from '@/lib/file-folder-purchase-activation'

type GateStage =
  | 'bridge_file_folder'
  | 'forensics'
  | 'administration'
  | 'personalization'
  | 'active'

function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(request: NextRequest) {
  try {
    const sql = getFileFolderDb()
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
    const clientId = await resolveClientToken(token, sql)
    if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })

    await ensureClientFileFolderSchema(sql)
    await ensureClientWorkshopSchema(sql)

    const [client] = await sql`
      SELECT
        id,
        name,
        email,
        whatsapp_number AS phone,
        business_name,
        file_number,
        COALESCE(referred_by, referred_by_bridger_id) AS bridger_id
      FROM users
      WHERE id = ${clientId}::uuid
        AND role = 'client'
      LIMIT 1
    `

    if (!client) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

    const money = await ensureClientMoneyEnvironment(sql, client.id)

    const [{ purchase_table }] = await sql`
      SELECT to_regclass('public.file_folder_purchases')::text AS purchase_table
    `

    // Recovery for the old homepage bug: a logged-in Client purchase could be
    // recorded without client_id, Administration would issue a File Number,
    // and the account would remain stranded at the File Folder Gate. Prefer an
    // explicit owned purchase; otherwise recover only one unambiguous confirmed
    // purchase matching this Client's email or normalized phone.
    if (!client.file_number && purchase_table) {
      let [recoverablePurchase] = await sql`
        SELECT *
        FROM file_folder_purchases
        WHERE client_id=${client.id}::uuid
          AND status='confirmed'
          AND file_number IS NOT NULL
        ORDER BY confirmed_at DESC NULLS LAST, created_at DESC
        LIMIT 1
      `

      if (!recoverablePurchase && client.email) {
        const candidates = await sql`
          SELECT *
          FROM file_folder_purchases
          WHERE client_id IS NULL
            AND status='confirmed'
            AND file_number IS NOT NULL
            AND buyer_email IS NOT NULL
            AND lower(buyer_email)=lower(${client.email})
          ORDER BY confirmed_at DESC NULLS LAST, created_at DESC
          LIMIT 2
        `
        if (candidates.length === 1) recoverablePurchase = candidates[0]
      }

      if (!recoverablePurchase) {
        const clientPhone = String(client.phone || '').replace(/\D/g, '')
        if (clientPhone.length >= 7) {
          const candidates = await sql`
            SELECT *
            FROM file_folder_purchases
            WHERE client_id IS NULL
              AND status='confirmed'
              AND file_number IS NOT NULL
              AND regexp_replace(COALESCE(buyer_phone,''), '[^0-9]', '', 'g')=${clientPhone}
            ORDER BY confirmed_at DESC NULLS LAST, created_at DESC
            LIMIT 2
          `
          if (candidates.length === 1) recoverablePurchase = candidates[0]
        }
      }

      if (recoverablePurchase?.file_number) {
        await activatePurchasedFileFolderForClient({
          sql,
          clientId: String(client.id),
          fileNumber: String(recoverablePurchase.file_number),
          clientName: client.name || recoverablePurchase.buyer_name || 'Client',
          purchaseId: String(recoverablePurchase.id),
        })
        client.file_number = recoverablePurchase.file_number
      }
    }

    const [bridger] = client.bridger_id
      ? await sql`
          SELECT id, name, username
          FROM users
          WHERE id = ${client.bridger_id}::uuid
            AND role = 'bridger'
            AND COALESCE(is_active, true) = true
          LIMIT 1
        `
      : []

    if (!client.file_number) {
      return NextResponse.json({
        success: true,
        active: false,
        gate: {
          stage: 'bridge_file_folder' as GateStage,
          title: 'File Folder Gate',
          detail: 'This Client account exists, but no verified File Folder is attached yet. Complete the File Folder purchase and Administration verification before System Switch can open.',
        },
        client: { id: client.id, name: client.name, file_number: null },
        bridger: bridger || null,
        money,
      }, { headers: { 'Cache-Control': 'private, no-store' } })
    }

    const [folder] = await sql`
      SELECT *
      FROM client_file_folders
      WHERE client_id = ${client.id}::uuid
         OR file_number = ${client.file_number}
      ORDER BY CASE WHEN client_id = ${client.id}::uuid THEN 0 ELSE 1 END
      LIMIT 1
    `

    const [workshop] = await sql`
      SELECT id, workshop_type, title, description
      FROM client_system_workshops
      WHERE client_id = ${client.id}::uuid
      LIMIT 1
    `

    const [fneFolder] = await sql`
      SELECT id, status, identity_data
      FROM file_folders
      WHERE file_number = ${client.file_number}
      LIMIT 1
    `

    const [purchase] = purchase_table
      ? await sql`
          SELECT id, status, amount_trx, payment_reference, bridge_code, created_at, confirmed_at
          FROM file_folder_purchases
          WHERE client_id = ${client.id}::uuid
             OR file_number = ${client.file_number}
             OR (
               client_id IS NULL
               AND buyer_email IS NOT NULL
               AND lower(buyer_email) = lower(${client.email})
             )
          ORDER BY created_at DESC
          LIMIT 1
        `
      : []

    const [{ deposit_table }] = await sql`
      SELECT to_regclass('public.bridge_deposits')::text AS deposit_table
    `
    const depositId = fneFolder?.identity_data?.depositId
    let bridgeDeposit: any = null

    if (deposit_table) {
      if (isUuid(depositId)) {
        const rows = await sql`
          SELECT id, status, file_number, tier_trx, tx_hash, verified_at
          FROM bridge_deposits
          WHERE id = ${depositId}::uuid
             OR file_number = ${client.file_number}
          ORDER BY created_at DESC
          LIMIT 1
        `
        bridgeDeposit = rows[0] || null
      } else {
        const rows = await sql`
          SELECT id, status, file_number, tier_trx, tx_hash, verified_at
          FROM bridge_deposits
          WHERE file_number = ${client.file_number}
          ORDER BY created_at DESC
          LIMIT 1
        `
        bridgeDeposit = rows[0] || null
      }
    }

    const purchasePending = Boolean(
      purchase && ['pending_admin_confirmation', 'pending_flutterwave', 'pending'].includes(String(purchase.status))
    )
    const bridgePending = bridgeDeposit?.status === 'pending'
    const paymentConfirmed = Boolean(
      purchase && ['confirmed', 'folder_issued', 'paid_pending_folder'].includes(String(purchase.status))
    ) || bridgeDeposit?.status === 'approved'

    let stage: GateStage = 'active'
    let title = 'File Folder'
    let detail = 'Your personalized File Folder is active.'

    if (purchasePending || bridgePending) {
      stage = 'forensics'
      title = 'Forensics Gate'
      detail = 'Your File Folder payment evidence has been submitted. Forensics must confirm that the movement is real before Administration can open System Switch.'
    } else if (!folder) {
      if (paymentConfirmed) {
        stage = 'administration'
        title = 'System Switch Gate'
        detail = 'Your File Folder payment is recognized, but the Client environment has not yet been opened. Administration must open System Switch.'
      } else {
        stage = 'bridge_file_folder'
        title = 'File Folder Gate'
        detail = 'This Client account exists outside the normal Bridge path. Return to the Bridge with your Bridger and establish the File Folder before System Switch.'
      }
    } else if (folder.status !== 'active') {
      stage = paymentConfirmed ? 'administration' : 'forensics'
      title = paymentConfirmed ? 'System Switch Gate' : 'Forensics Gate'
      detail = paymentConfirmed
        ? 'The File Folder exists and payment is recognized. Administration must open System Switch for this Client.'
        : 'The File Folder exists, but verification is not complete.'
    } else if (!workshop || folder.workshop_type === 'pending_personalization') {
      stage = 'personalization'
      title = 'Workshop Formation Gate'
      detail = 'Your crossing is recognized. Your first workshop is formed from your own interaction; WEAVE will not replace it with a generic workshop.'
    }

    return NextResponse.json({
      success: true,
      active: stage === 'active',
      gate: { stage, title, detail },
      client: {
        id: client.id,
        name: client.name,
        file_number: client.file_number,
        business_name: client.business_name,
      },
      bridger: bridger || null,
      file_folder: folder || null,
      workshop: workshop || null,
      money,
      evidence: {
        purchase: purchase || null,
        bridge_deposit: bridgeDeposit,
        file_number_status: fneFolder?.status || null,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[client/file-folder-entry] error:', error)
    return NextResponse.json({ error: 'Unable to resolve File Folder entry' }, { status: 500 })
  }
}
