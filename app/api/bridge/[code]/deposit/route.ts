import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

import { WORLD_RULES } from '@/lib/world/constants'
import { FILE_FOLDER_PRICING, fileFolderTierLabel, getFileFolderTier } from '@/lib/file-folder-pricing'
import { notifyDepositSubmitted } from '@/lib/deposit-notifications'

const COMPANY_TRX_WALLET = WORLD_RULES.COMPANY_TRX_WALLET

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
      amountFlameCoin,
      tierTrx,
      txHash,
    } = body

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      )
    }

    if (!txHash || typeof txHash !== 'string' || !txHash.trim()) {
      return NextResponse.json(
        { error: 'TRX transaction hash is required' },
        { status: 400 }
      )
    }

    const submittedAmount = Number(amountFlameCoin ?? tierTrx)
    const fileFolderTier = submittedAmount === FILE_FOLDER_PRICING.premiumFlameCoin
      ? getFileFolderTier(submittedAmount, 'premium')
      : getFileFolderTier(submittedAmount, 'pro')

    if (!fileFolderTier) {
      return NextResponse.json(
        {
          error: 'Invalid Pro or Premium File Folder amount',
          proNegotiatedMinimum: FILE_FOLDER_PRICING.proNegotiatedMinimumFlameCoin,
          proStartingPrice: FILE_FOLDER_PRICING.proStartingFlameCoin,
          premiumPrice: FILE_FOLDER_PRICING.premiumFlameCoin,
          currency: 'Flame Coin',
          peg: '1 Flame Coin = 1 TRX',
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
     * Bridge prospect sales are Pro or Premium.
     * Pro normally starts at 6,500 Flame Coin and may be negotiated down to 3,000.
     * Premium is exactly 35,800 Flame Coin.
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
        ${submittedAmount},
        'pending',
        ${txHash.trim()},
        ${COMPANY_TRX_WALLET},
        NOW(),
        NOW()
      )
      RETURNING id
    `

    const tierLabel = fileFolderTierLabel(fileFolderTier)
    await notifyDepositSubmitted({
      depositorId: null,
      depositorName: name.trim(),
      role: 'Prospect Client',
      depositId: result[0].id,
      rail: 'BRIDGE_TRX',
      amountLabel: `${submittedAmount.toLocaleString()} TRX`,
      secondaryLabel: `${tierLabel} File Folder`,
      adminLink: '/admin/control-center#bridge',
    })

    return NextResponse.json({
      success: true,
      depositId: result[0].id,
      amount: submittedAmount,
      fileFolderTier,
      currency: 'Flame Coin',
      fundingAsset: 'TRX',
      peg: '1 Flame Coin = 1 TRX',
      status: 'pending',
      companyWallet: COMPANY_TRX_WALLET,
      message:
        `${tierLabel} TRX File Folder payment submitted for administrator verification. Verified TRX is recognized 1:1 as Flame Coin.`,
    })
  } catch (error: any) {
    console.error('[bridge deposit] error:', error)

    return NextResponse.json(
      { error: 'Failed to submit File Folder payment' },
      { status: 500 }
    )
  }
}
