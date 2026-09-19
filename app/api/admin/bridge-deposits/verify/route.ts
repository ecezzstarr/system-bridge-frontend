import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { generateFileNumber } from '@/lib/fne'
import { creditBridgerActivityCommission } from '@/lib/bridger-commission-router'

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthUser(request)

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin only' },
        { status: 403 }
      )
    }

    const { depositId, status } = await request.json()

    if (
      !depositId ||
      !['approved', 'rejected'].includes(status)
    ) {
      return NextResponse.json(
        {
          error:
            'depositId and status (approved|rejected) are required'
        },
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
      INNER JOIN bridge_ais ba
        ON ba.id = bd.bridge_id
      WHERE bd.id = ${depositId}::uuid
        AND bd.status = 'pending'
      LIMIT 1
    `

    if (!deposits[0]) {
      return NextResponse.json(
        {
          error:
            'Bridge deposit not found or already processed'
        },
        { status: 404 }
      )
    }

    const deposit = deposits[0]

    /*
     * REJECTION
     *
     * No File Number is created.
     */
    if (status === 'rejected') {
      await sql`
        UPDATE bridge_deposits
        SET
          status = 'rejected',
          verifier_id = ${admin.id}::uuid,
          verified_at = NOW()
        WHERE id = ${depositId}::uuid
          AND status = 'pending'
      `

      return NextResponse.json({
        success: true,
        status: 'rejected',
        message: 'Bridge File Folder payment rejected'
      })
    }

    /*
     * APPROVAL
     *
     * Generate the official File Number using the
     * Bridger attached to this Bridge.
     */
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

    /*
     * Attach the File Number to the Bridge payment.
     *
     * The payment itself is the event that causes
     * the File Folder to become issued.
     */
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

    /*
     * Conversion Tracking
     */
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

    /*
     * Attach the File Number to the System Switch session
     * when the Bridge supplied a session.
     */
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

    /*
     * DISTRIBUTE COMMISSIONS
     * 30% to Bridger, 2% (5% of Weave's 40%) to Agent
     */
    if (deposit.bridger_id) {
      creditBridgerActivityCommission({
        bridgerId: deposit.bridger_id,
        activity: 'client_deposit',
        baseAmount: Number(deposit.tier_trx),
        description: `Commission for File Folder purchase: ${fileNumber}`
      }).catch(err => console.error('[bridge verify] commission error:', err))
    }

    return NextResponse.json({
      success: true,
      status: 'approved',
      depositId: deposit.id,
      fileNumber,
      bridgerId: deposit.bridger_id,
      bridgeCode: deposit.bridge_code,
      amount: Number(deposit.tier_trx),
      currency: 'TRX',
      message:
        'File Folder approved and File Number issued.'
    })
  } catch (error: any) {
    console.error(
      '[bridge deposit verification]',
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to verify Bridge File Folder payment'
      },
      { status: 500 }
    )
  }
}
