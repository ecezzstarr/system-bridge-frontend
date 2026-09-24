import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { getFileFolderTier } from '@/lib/file-folder-pricing'

export async function GET(request: NextRequest) {
  try {
    const admin = await getAuthUser(request)

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin only' },
        { status: 403 }
      )
    }

    const deposits = await sql`
      SELECT
        d.*,
        b.bridge_code
      FROM bridge_deposits d
      LEFT JOIN bridge_ais b
        ON b.id = d.bridge_id
      WHERE d.status = 'pending'
      ORDER BY d.created_at ASC
    `

    return NextResponse.json({
      success: true,
      deposits: deposits.map((deposit: any) => ({
        ...deposit,
        fileFolderTier: getFileFolderTier(Number(deposit.tier_trx)),
      }))
    })
  } catch (error) {
    console.error('[bridge deposits pending]', error)

    return NextResponse.json(
      { error: 'Failed to load Bridge deposits' },
      { status: 500 }
    )
  }
}
