import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

import { WORLD_RULES } from '@/lib/world/constants'

const FILE_FOLDER_PRICE_TRX = WORLD_RULES.FILE_FOLDER_PRICE_TRX
const COMPANY_WALLET = WORLD_RULES.COMPANY_WALLET

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const body = await request.json()

    const {
      sessionId,
      prospectId,
      name,
      phone,
      tierTrx,
      txHash,
    } = body

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      )
    }

    /*
     * AUTHORITATIVE FILE FOLDER PRICE
     * The browser cannot choose another amount.
     */
    const submittedAmount = Number(tierTrx)

    if (
      !Number.isFinite(submittedAmount) ||
      submittedAmount !== FILE_FOLDER_PRICE_TRX
    ) {
      return NextResponse.json(
        {
          error: 'Invalid File Folder amount',
          required: FILE_FOLDER_PRICE_TRX,
          currency: 'TRX',
        },
        { status: 400 }
      )
    }

    const bridges = await sql`
      SELECT
        b.id,
        b.bridge_code,
        b.bridger_id
      FROM bridge_ais b
      WHERE b.bridge_code = ${code}
        AND b.status = 'active'
      LIMIT 1
    `

    if (bridges.length === 0) {
      return NextResponse.json(
        { error: 'Bridge not found or inactive' },
        { status: 404 }
      )
    }

    const bridge = bridges[0]

    /*
     * IMPORTANT:
     * Store the authoritative 35,800 TRX amount,
     * never the client-supplied value.
     */
    const result = await sql`
      INSERT INTO bridge_deposits (
        id,
        bridge_id,
        bridger_id,
        session_id,
        outreach_id,
        prospect_name,
        prospect_phone,
        tier_trx,
        status,
        tx_hash,
        company_wallet,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${bridge.id}::uuid,
        ${bridge.bridger_id || null},
        ${sessionId || null},
        ${prospectId || null},
        ${name.trim()},
        ${phone.trim()},
        ${FILE_FOLDER_PRICE_TRX},
        'pending',
        ${txHash || null},
        ${COMPANY_WALLET},
        NOW(),
        NOW()
      )
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      depositId: result[0].id,
      amount: FILE_FOLDER_PRICE_TRX,
      currency: 'TRX',
      status: 'pending',
      companyWallet: COMPANY_WALLET,
      message:
        'File Folder payment submitted for administrator verification.',
    })
  } catch (error: any) {
    console.error('[bridge deposit] error:', error)

    return NextResponse.json(
      { error: 'Failed to submit File Folder payment' },
      { status: 500 }
    )
  }
}
