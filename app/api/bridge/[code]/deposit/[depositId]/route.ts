import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getFileFolderTier } from '@/lib/file-folder-pricing'

export async function GET(
  request: NextRequest,
  {
    params
  }: {
    params: Promise<{
      code: string
      depositId: string
    }>
  }
) {
  try {
    const { code, depositId } = await params

    const rows = await sql`
      SELECT
        d.id,
        d.status,
        d.tier_trx,
        d.company_wallet,
        d.file_number,
        d.tx_hash,
        d.prospect_name,
        d.prospect_phone,
        d.verified_at
      FROM bridge_deposits d
      INNER JOIN bridge_ais b
        ON b.id = d.bridge_id
      WHERE d.id = ${depositId}::uuid
        AND b.bridge_code = ${code}
      LIMIT 1
    `

    if (!rows[0]) {
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      )
    }

    const d = rows[0]

    return NextResponse.json({
      success: true,
      deposit: {
        id: d.id,
        status: d.status,
        amount: Number(d.tier_trx),
        fileFolderTier: getFileFolderTier(Number(d.tier_trx)),
        currency: 'Flame Coin',
        companyWallet: d.company_wallet,
        fileNumber: d.file_number,
        txHash: d.tx_hash,
        verifiedAt: d.verified_at
      }
    })
  } catch (error) {
    console.error('[bridge deposit status]', error)

    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}
