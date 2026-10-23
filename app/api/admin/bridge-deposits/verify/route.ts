import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { generateFileNumber } from '@/lib/fne'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { creditBridgerActivityCommission } from '@/lib/bridger-commission-router'
import { FILE_FOLDER_PRICING, fileFolderTierLabel, getFileFolderTier } from '@/lib/file-folder-pricing'
import { notifyUser } from '@/lib/deposit-notifications'
import { ensureFlameSchema } from '@/lib/flame-schema'
import { accrueAiProviderAllocation } from '@/lib/ai-provider-settlement'
import { recordSystemEvent } from '@/lib/system-events'
import {
  activatePurchasedFileFolderForClient,
  resolveExistingClientForFileFolderPurchase,
} from '@/lib/file-folder-purchase-activation'

function bridgeSaleTier(amount: number) {
  if (amount === FILE_FOLDER_PRICING.plusTrx) return getFileFolderTier(amount, 'plus')
  if (amount === FILE_FOLDER_PRICING.premiumFlameCoin) return getFileFolderTier(amount, 'premium')
  if (amount >= FILE_FOLDER_PRICING.proNegotiatedMinimumFlameCoin && amount < FILE_FOLDER_PRICING.premiumFlameCoin) {
    return getFileFolderTier(amount, 'pro')
  }
  return getFileFolderTier(amount, 'standard')
}

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
    LIMIT 1
  `

  if (!purchase) {
    return NextResponse.json({ error: 'Bridge Radiance File Folder purchase not found' }, { status: 404 })
  }

  const purchaseAmount = Number(purchase.amount_trx)
  const fileFolderTier =
    getFileFolderTier(purchaseAmount, purchase.file_folder_tier) ||
    (purchase.bridge_code ? bridgeSaleTier(purchaseAmount) : getFileFolderTier(purchaseAmount))
  if (!fileFolderTier) {
    return NextResponse.json({ error: 'Stored File Folder amount is outside the current Standard, Pro, Premium and Plus pricing rules' }, { status: 409 })
  }
  const tierLabel = fileFolderTierLabel(fileFolderTier)

  if (purchase.status === 'confirmed') {
    if (status !== 'approved' || !purchase.file_number) {
      return NextResponse.json({ error: 'This File Folder approval is already complete' }, { status: 409 })
    }

    const existingClient = await resolveExistingClientForFileFolderPurchase(sql, purchase)
    let activation = null
    if (existingClient) {
      activation = await activatePurchasedFileFolderForClient({
        sql,
        clientId: String(existingClient.id),
        fileNumber: String(purchase.file_number),
        clientName: existingClient.name || purchase.buyer_name || 'Client',
        purchaseId: String(purchase.id),
      })
    }

    let commissionMovement = null
    if (purchase.bridger_id) {
      commissionMovement = await creditBridgerActivityCommission({
        bridgerId: String(purchase.bridger_id),
        activity: 'client_deposit',
        baseAmount: Number(purchase.amount_trx),
        sourceId: String(purchase.id),
        description: `${tierLabel} File Folder purchase: ${purchase.file_number}`,
      })
      if (!commissionMovement.bridgerShare || (commissionMovement.agentExpected && !commissionMovement.agentShare)) {
        return NextResponse.json({
          error: 'File Folder is approved, but one or more required role shares are not yet recoverable. Verify the Bridger and attached Agent primary wallets, then retry this approval.',
        }, { status: 503 })
      }
    }

    return NextResponse.json({
      success: true,
      status: 'approved',
      source: 'file_folder_purchase',
      replayed: true,
      purchaseId: purchase.id,
      fileNumber: purchase.file_number,
      clientId: existingClient?.id || null,
      clientActivated: Boolean(activation),
      bridgerId: purchase.bridger_id || null,
      amount: Number(purchase.amount_trx),
      fileFolderTier,
      currency: fileFolderTier === 'plus' ? 'TRX' : 'Flame Coin',
      plusFlameCoinValue: fileFolderTier === 'plus' ? FILE_FOLDER_PRICING.plusFlameCoin : null,
      plusUsdtReference: fileFolderTier === 'plus' ? FILE_FOLDER_PRICING.plusUsdt : null,
      commissionMovement,
      registerUrl: existingClient ? null : `/client/register?fileNumber=${encodeURIComponent(purchase.file_number)}`,
      systemSwitchUrl: existingClient ? '/client/system-switch' : null,
      message: existingClient
        ? 'Existing File Folder approval reconciled and the Client operating environment is active.'
        : 'Existing File Folder approval verified and commission movement reconciled.',
    })
  }

  if (purchase.status !== 'pending_admin_confirmation') {
    return NextResponse.json({ error: 'Bridge Radiance File Folder purchase is no longer pending' }, { status: 409 })
  }

  if (status === 'rejected') {
    await sql`
      UPDATE file_folder_purchases
      SET status='rejected', confirmed_by=${admin.id}::uuid, confirmed_at=NOW()
      WHERE id=${purchaseId}::uuid
        AND status='pending_admin_confirmation'
    `

    if (purchase.bridger_id) {
      await notifyUser(String(purchase.bridger_id), {
        type: 'client_deposit_rejected',
        title: 'Public movement File Folder payment rejected',
        content: `Administration rejected ${purchase.buyer_name || purchase.buyer_email || 'a Prospect'}'s ${Number(purchase.amount_trx).toLocaleString()} Flame Coin File Folder payment. No File Number was issued.`,
        link: '/bridger/presence',
        fromUserId: admin.id,
        fromUserName: 'WEAVE Administration',
      })
    }

    return NextResponse.json({
      success: true,
      status: 'rejected',
      source: 'file_folder_purchase',
      message: 'Bridge Radiance File Folder payment rejected. No File Number was issued.',
    })
  }

  const prospectName = String(purchase.buyer_name || purchase.buyer_email || 'Bridge Radiance Prospect').trim().slice(0, 255)
  const prospectPhone = String(purchase.buyer_phone || '').trim().slice(0, 80)
  const bridgerId = purchase.bridger_id ? String(purchase.bridger_id) : null
  const existingClient = await resolveExistingClientForFileFolderPurchase(sql, purchase)
  const existingClientId = existingClient ? String(existingClient.id) : null

  // Legacy regression marker: generateFileNumber(null) applied only before Public Flame attribution could bind a Bridger.
  const fileFolder = await generateFileNumber(bridgerId, {
    name: prospectName,
    phone: prospectPhone,
    bridgeCode: purchase.bridge_code || null,
    purchaseId: purchase.id,
    txHash: purchase.payment_reference,
    amountTrx: Number(purchase.amount_trx),
    providerName: purchase.provider_name || null,
    flameName: purchase.flame_name || null,
    movementCode: purchase.movement_code || null,
  })
  const fileNumber = fileFolder.file_number

  let activation = null
  if (existingClientId) {
    activation = await activatePurchasedFileFolderForClient({
      sql,
      clientId: existingClientId,
      fileNumber,
      clientName: existingClient.name || prospectName,
      purchaseId: String(purchase.id),
    })
  } else {
    await provisionPersistentFolder(fileNumber, prospectName)
  }

  const [confirmed] = await sql`
    UPDATE file_folder_purchases
    SET
      file_number=${fileNumber},
      client_id=COALESCE(client_id, ${existingClientId}::uuid),
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

  // Plus requires a confirmed ledger row before ready systems may be issued.
  // The existing Client was initially attached while payment was still
  // pending confirmation, so fulfill Plus *after* the status transition.
  if (fileFolderTier === 'plus' && existingClientId) {
    activation = await activatePurchasedFileFolderForClient({
      sql,
      clientId: existingClientId,
      fileNumber,
      clientName: existingClient.name || prospectName,
      purchaseId: String(confirmed.id),
    })
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

  let commissionMovement = null
  if (bridgerId) {
    commissionMovement = await creditBridgerActivityCommission({
      bridgerId,
      activity: 'client_deposit',
      baseAmount: Number(confirmed.amount_trx),
      sourceId: String(confirmed.id),
      description: `${tierLabel} File Folder purchase: ${fileNumber}`,
    })
    if (!commissionMovement.bridgerShare || (commissionMovement.agentExpected && !commissionMovement.agentShare)) {
      return NextResponse.json({
        error: 'File Folder is approved, but one or more required role shares are not yet recoverable. Verify the Bridger and attached Agent primary wallets, then retry this approval.',
      }, { status: 503 })
    }

    await notifyUser(bridgerId, {
      type: 'client_deposit_approved',
      title: 'Public movement Client crossed',
      content: `Administration approved ${prospectName}'s ${Number(confirmed.amount_trx).toLocaleString()} Flame Coin ${tierLabel} File Folder. File Number ${fileNumber} was issued.`,
      link: '/bridger/presence',
      fromUserId: admin.id,
      fromUserName: 'WEAVE Administration',
    })
  }

  if (activation?.customerDoor && existingClientId) {
    await recordSystemEvent({
      eventType: fileFolderTier === 'plus' ? 'plus_file_folder_operating_systems_ready' : 'customer_door_construction_started',
      actorId: existingClientId,
      actorRole: 'client',
      subjectType: 'customer_door_build',
      subjectId: activation.customerDoor.buildId,
      source: 'file-folder-purchase-verification',
      payload: {
        purchaseId,
        fileNumber,
        publicPath: activation.customerDoor.publicPath,
        parts: activation.customerDoor.parts,
        completesAt: activation.customerDoor.completesAt,
        durationMinutes: activation.customerDoor.durationMinutes,
        boostOptional: activation.customerDoor.boostOptional,
      },
    })
  }

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
      movementCode: confirmed.movement_code || null,
      bridgerId,
      clientId: existingClientId,
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
    clientId: existingClientId,
    clientActivated: Boolean(activation),
    bridgerId,
    amount: Number(confirmed.amount_trx),
    fileFolderTier,
    currency: fileFolderTier === 'plus' ? 'TRX' : 'Flame Coin',
    plusFlameCoinValue: fileFolderTier === 'plus' ? FILE_FOLDER_PRICING.plusFlameCoin : null,
    plusUsdtReference: fileFolderTier === 'plus' ? FILE_FOLDER_PRICING.plusUsdt : null,
    registerUrl: existingClientId ? null : `/client/register?fileNumber=${encodeURIComponent(fileNumber)}`,
    systemSwitchUrl: existingClientId ? '/client/system-switch' : null,
    aiProviderAllocation: allocation?.allocation || null,
    commissionMovement,
    customerDoor: activation?.customerDoor || null,
    message: existingClientId
      ? fileFolderTier === 'plus' ? 'Plus File Folder approved with completed operating systems and a ready Customer Door.' : 'File Folder approved, attached to the Client account, and the included Customer Door formation started.'
      : 'File Folder approved. File Number issued. Prospect can now register as Client and cross into System Switch.',
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
        AND bd.status IN ('pending','approved')
      LIMIT 1
    `

    if (!deposits[0]) {
      return verifyBridgeRadiancePurchase({ admin, purchaseId: depositId, status })
    }

    const deposit = deposits[0]
    const fileFolderTier = bridgeSaleTier(Number(deposit.tier_trx))

    if (!fileFolderTier) {
      return NextResponse.json(
        { error: 'Stored Bridge File Folder amount is outside the current Pro/Premium sales rules' },
        { status: 409 }
      )
    }
    const tierLabel = fileFolderTierLabel(fileFolderTier)

    if (deposit.status === 'approved') {
      if (status !== 'approved' || !deposit.file_number) {
        return NextResponse.json({ error: 'This File Folder approval is already complete' }, { status: 409 })
      }

      let commissionMovement = null
      if (deposit.bridger_id) {
        commissionMovement = await creditBridgerActivityCommission({
          bridgerId: deposit.bridger_id,
          activity: 'client_deposit',
          baseAmount: Number(deposit.tier_trx),
          sourceId: String(deposit.id),
          description: `${tierLabel} File Folder purchase: ${deposit.file_number}`
        })
        if (!commissionMovement.bridgerShare || (commissionMovement.agentExpected && !commissionMovement.agentShare)) {
          return NextResponse.json({
            error: 'File Folder is approved, but one or more required role shares are not yet recoverable. Verify the Bridger and attached Agent primary wallets, then retry this approval.'
          }, { status: 503 })
        }
      }

      return NextResponse.json({
        success: true,
        status: 'approved',
        source: 'bridge_deposit',
        replayed: true,
        depositId: deposit.id,
        fileNumber: deposit.file_number,
        bridgerId: deposit.bridger_id,
        amount: Number(deposit.tier_trx),
        fileFolderTier,
        currency: 'Flame Coin',
        commissionMovement,
        message: 'Existing File Folder approval verified and commission movement reconciled.'
      })
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
          link: '/bridger/presence',
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
      const commissionMovement = await creditBridgerActivityCommission({
        bridgerId: deposit.bridger_id,
        activity: 'client_deposit',
        baseAmount: Number(deposit.tier_trx),
        sourceId: String(deposit.id),
        description: `${tierLabel} File Folder purchase: ${fileNumber}`
      })
      if (!commissionMovement.bridgerShare || (commissionMovement.agentExpected && !commissionMovement.agentShare)) {
        throw new Error('File Folder approved but a required Bridger/Agent share could not be credited; retry approval after wallet verification')
      }

      await notifyUser(deposit.bridger_id, {
        type: 'client_deposit_approved',
        title: 'Client File Folder payment approved',
        content: `Administration approved ${deposit.prospect_name}'s ${Number(deposit.tier_trx).toLocaleString()} TRX ${tierLabel} File Folder payment. File Number ${fileNumber} was issued.`,
        link: '/bridger/presence',
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
