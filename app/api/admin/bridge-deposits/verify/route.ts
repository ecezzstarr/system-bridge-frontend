import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { generateFileNumber } from '@/lib/fne'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { creditBridgerActivityCommission } from '@/lib/bridger-commission-router'
import { getFileFolderTier } from '@/lib/file-folder-pricing'
import { notifyUser } from '@/lib/deposit-notifications'
import { ensureFlameSchema } from '@/lib/flame-schema'
import { accrueAiProviderAllocation } from '@/lib/ai-provider-settlement'
import { recordSystemEvent } from '@/lib/system-events'

async function provisionPersistentFolder(fileNumber: string, clientName: string) {
  await ensureClientFileFolderSchema(sql)
  await sql`
    INSERT INTO client_file_folders (
      file_number,
      client_name,
      workshop_type,
      status
    )
    VALUES (
      ${fileNumber},
      ${clientName},
      'pending_personalization',
      'waiting_for_login'
    )
    ON CONFLICT (file_number) DO UPDATE SET
      client_name = COALESCE(client_file_folders.client_name, EXCLUDED.client_name),
      workshop_type = CASE
        WHEN client_file_folders.client_id IS NULL
             AND client_file_folders.workshop_type = 'formation'
          THEN 'pending_personalization'
        ELSE client_file_folders.workshop_type
      END,
      updated_at = NOW()
  `
}

async function verifyBridgeRadiancePurchase({
  admin,
  purchaseId,
  status,
}: {
  admin: any
  purchaseId: string
  status: 'approved' | 'rejected'
}) {
  await ensureFlameSchema()

  const [purchase] = await sql`
    SELECT *
    FROM file_folder_purchases
    WHERE id=${purchaseId}::uuid
      AND status='pending_admin_confirmation'
    LIMIT 1
  `

  if (!purchase) {
    return NextResponse.json({ error: 'Bridge Radiance File Folder purchase not found or already processed' }, { status: 404 })
  }

  const fileFolderTier = getFileFolderTier(Number(purchase.amount_trx))
  if (!fileFolderTier) {
    return NextResponse.json({ error: 'Stored File Folder amount is outside the current Standard/Premium pricing rules' }, { status: 409 })
  }

  if (status === 'rejected') {
    await sql`
      UPDATE file_folder_purchases
      SET status='rejected', confirmed_by=${admin.id}::uuid, confirmed_at=NOW()
      WHERE id=${purchaseId}::uuid
        AND status='pending_admin_confirmation'
    `
    return NextResponse.json({
      success: true,
      status: 'rejected',
      source: 'file_folder_purchase',
      message: 'Bridge Radiance File Folder payment rejected. No File Number was issued.',
    })
  }

  const prospectName = String(purchase.buyer_name || purchase.buyer_email || 'Bridge Radiance Prospect').trim().slice(0, 255)
  const prospectPhone = String(purchase.buyer_phone || '').trim().slice(0, 80)

  const fileFolder = await generateFileNumber(null, {
    name: prospectName,
    phone: prospectPhone,
    bridgeCode: purchase.bridge_code || null,
    purchaseId: purchase.id,
    txHash: purchase.payment_reference,
    amountTrx: Number(purchase.amount_trx),
    providerName: purchase.provider_name || null,
    flameName: purchase.flame_name || null,
  })
  const fileNumber = fileFolder.file_number

  await provisionPersistentFolder(fileNumber, prospectName)

  const [confirmed] = await sql`
    UPDATE file_folder_purchases
    SET
      file_number=${fileNumber},
      status='confirmed',
      confirmed_at=NOW(),
      confirmed_by=${admin.id}::uuid
    WHERE id=${purchaseId}::uuid
      AND status='pending_admin_confirmation'
    RETURNING *
  `

  if (!confirmed) {
    return NextResponse.json({ error: 'File Folder purchase changed before verification completed' }, { status: 409 })
  }

  if (confirmed.bridge_code) {
    await sql`
      UPDATE chatgpt_bridge_sessions
      SET crossing_state='file_number_issued'
      WHERE code=${confirmed.bridge_code}
    `
  }

  const allocation = await accrueAiProviderAllocation({
    sql,
    purchaseId: String(confirmed.id),
    fileNumber,
    grossAmount: Number(confirmed.amount_trx),
    bridgeCode: confirmed.bridge_code,
    providerKey: confirmed.provider_key,
    providerName: confirmed.provider_name,
    flameExternalId: confirmed.flame_external_id,
    flameName: confirmed.flame_name,
  })

  await recordSystemEvent({
    eventType: 'file_number_issued',
    actorId: admin.id,
    actorRole: 'admin',
    subjectType: 'client_file_folder',
    subjectId: fileNumber,
    source: 'bridge-radiance-file-folder',
    payload: {
      purchaseId,
      bridgeCode: confirmed.bridge_code || null,
      amountFlameCoin: Number(confirmed.amount_trx),
      fileFolderTier,
    },
  })

  return NextResponse.json({
    success: true,
    status: 'approved',
    source: 'file_folder_purchase',
    purchaseId,
    fileNumber,
    amount: Number(confirmed.amount_trx),
    fileFolderTier,
    currency: 'Flame Coin',
    registerUrl: `/client/register?fileNumber=${encodeURIComponent(fileNumber)}`,
    systemSwitchUrl: '/client/system-switch',
    aiProviderAllocation: allocation?.allocation || null,
    message: 'File Folder approved. File Number issued. Prospect can now register as Client and cross into System Switch.',
  })
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthUser(request)

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { depositId, status, source } = await request.json()

    if (!depositId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'depositId and status (approved|rejected) are required' },
        { status: 400 }
      )
    }

    if (source === 'file_folder_purchase') {
      return verifyBridgeRadiancePurchase({ admin, purchaseId: depositId, status })
    }

    const deposits = await sql`
      SELECT
        bd.id,
        bd.bridge_id,
        bd.session_id,
        bd.prospect_name,
        bd.prospect_phone,
        bd.tier_trx,
        bd.tx_hash,
        bd.status,
        bd.file_number,
        bd.verifier_id,
        bd.outreach_id,
        ba.bridger_id,
        ba.bridge_code
      FROM bridge_deposits bd
      INNER JOIN bridge_ais ba ON ba.id = bd.bridge_id
      WHERE bd.id = ${depositId}::uuid
        AND bd.status = 'pending'
      LIMIT 1
    `

    if (!deposits[0]) {
      // Older Admin clients did not send a source discriminator. Fall through
      // to the new Bridge Radiance purchase stream before returning 404.
      return verifyBridgeRadiancePurchase({ admin, purchaseId: depositId, status })
    }

    const deposit = deposits[0]
    const fileFolderTier = getFileFolderTier(Number(deposit.tier_trx))

    if (!fileFolderTier) {
      return NextResponse.json(
        { error: 'Stored File Folder amount is outside the current Standard/Premium pricing rules' },
        { status: 409 }
      )
    }

    if (status === 'rejected') {
      await sql`
        UPDATE bridge_deposits
        SET status = 'rejected', verifier_id = ${admin.id}::uuid, verified_at = NOW()
        WHERE id = ${depositId}::uuid AND status = 'pending'
      `

      if (deposit.bridger_id) {
        await notifyUser(deposit.bridger_id, {
          type: 'client_deposit_rejected',
          title: 'Client File Folder payment rejected',
          content: `Administration rejected ${deposit.prospect_name}'s ${Number(deposit.tier_trx).toLocaleString()} TRX File Folder payment. No File Number was issued.`,
          link: '/bridger/clients',
          fromUserId: admin.id,
          fromUserName: 'WEAVE Administration',
        })
      }

      return NextResponse.json({
        success: true,
        status: 'rejected',
        source: 'bridge_deposit',
        message: 'Bridge File Folder payment rejected'
      })
    }

    const fileFolder = await generateFileNumber(
      deposit.bridger_id,
      {
        name: deposit.prospect_name,
        phone: deposit.prospect_phone,
        bridgeId: deposit.bridge_id,
        bridgeCode: deposit.bridge_code,
        depositId: deposit.id,
        txHash: deposit.tx_hash,
        amountTrx: Number(deposit.tier_trx)
      }
    )

    const fileNumber = fileFolder.file_number

    await sql`
      UPDATE bridge_deposits
      SET
        status = 'approved',
        file_number = ${fileNumber},
        verifier_id = ${admin.id}::uuid,
        verified_at = NOW()
      WHERE id = ${depositId}::uuid
        AND status = 'pending'
    `

    await provisionPersistentFolder(fileNumber, deposit.prospect_name)

    if (deposit.outreach_id) {
      await sql`
        UPDATE market_prospect_outreach
        SET status = 'converted', last_activity_at = NOW()
        WHERE id = ${deposit.outreach_id}::uuid
      `

      await sql`
        UPDATE market_prospect_contacts
        SET status = 'converted'
        WHERE id = (SELECT contact_id FROM market_prospect_outreach WHERE id = ${deposit.outreach_id}::uuid)
      `
    }

    if (deposit.session_id) {
      await sql`
        UPDATE system_switch_state
        SET
          file_number = ${fileNumber},
          last_active_at = NOW(),
          updated_at = NOW()
        WHERE session_id = ${deposit.session_id}::uuid
      `
    }

    if (deposit.bridger_id) {
      await creditBridgerActivityCommission({
        bridgerId: deposit.bridger_id,
        activity: 'client_deposit',
        baseAmount: Number(deposit.tier_trx),
        sourceId: String(deposit.id),
        description: `${fileFolderTier === 'premium' ? 'Premium' : 'Standard'} File Folder purchase: ${fileNumber}`
      })

      await notifyUser(deposit.bridger_id, {
        type: 'client_deposit_approved',
        title: 'Client File Folder payment approved',
        content: `Administration approved ${deposit.prospect_name}'s ${Number(deposit.tier_trx).toLocaleString()} TRX ${fileFolderTier === 'premium' ? 'Premium' : 'Standard'} File Folder payment. File Number ${fileNumber} was issued.`,
        link: '/bridger/clients',
        fromUserId: admin.id,
        fromUserName: 'WEAVE Administration',
      })
    }

    return NextResponse.json({
      success: true,
      status: 'approved',
      source: 'bridge_deposit',
      depositId: deposit.id,
      fileNumber,
      bridgerId: deposit.bridger_id,
      bridgeCode: deposit.bridge_code,
      amount: Number(deposit.tier_trx),
      fileFolderTier,
      currency: 'Flame Coin',
      registerUrl: `/client/register?fileNumber=${encodeURIComponent(fileNumber)}`,
      systemSwitchUrl: '/client/system-switch',
      message: 'File Folder approved, persistent File Folder shell provisioned, and File Number issued.'
    })
  } catch (error: any) {
    console.error('[bridge deposit verification]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to verify Bridge File Folder payment' },
      { status: 500 }
    )
  }
}
