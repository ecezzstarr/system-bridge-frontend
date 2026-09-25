import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { generateFileNumber } from '@/lib/fne'
import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { creditBridgerActivityCommission } from '@/lib/bridger-commission-router'
import { getFileFolderTier } from '@/lib/file-folder-pricing'
import { notifyUser } from '@/lib/deposit-notifications'

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthUser(request)

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { depositId, status } = await request.json()

    if (!depositId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'depositId and status (approved|rejected) are required' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Bridge deposit not found or already processed' },
        { status: 404 }
      )
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

    // Provision the persistent File Folder shell only after the paid Bridge movement is approved.
    // The first workshop is intentionally NOT chosen here: it must come from Client personalization.
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
        ${deposit.prospect_name},
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
      creditBridgerActivityCommission({
        bridgerId: deposit.bridger_id,
        activity: 'client_deposit',
        baseAmount: Number(deposit.tier_trx),
        description: `Commission for ${fileFolderTier === 'premium' ? 'Premium' : 'Standard'} File Folder purchase: ${fileNumber}`
      }).catch(err => console.error('[bridge verify] commission error:', err))

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
      depositId: deposit.id,
      fileNumber,
      bridgerId: deposit.bridger_id,
      bridgeCode: deposit.bridge_code,
      amount: Number(deposit.tier_trx),
      fileFolderTier,
      currency: 'Flame Coin',
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
