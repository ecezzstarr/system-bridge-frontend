import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { getFileFolderTier } from '@/lib/file-folder-pricing'
import { ensureFlameSchema } from '@/lib/flame-schema'

export async function GET(request: NextRequest) {
  try {
    const admin = await getAuthUser(request)
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    await ensureFlameSchema()

    const deposits = await sql`
      SELECT
        d.*,
        b.bridge_code,
        u.name AS bridger_name
      FROM bridge_deposits d
      LEFT JOIN bridge_ais b ON b.id = d.bridge_id
      LEFT JOIN users u ON u.id = b.bridger_id
      WHERE d.status = 'pending'
      ORDER BY d.created_at ASC
    `

    const purchases = await sql`
      SELECT
        p.id,
        p.buyer_name,
        p.buyer_email,
        p.buyer_phone,
        p.amount_trx,
        p.payment_reference,
        p.status,
        p.file_number,
        p.bridge_code,
        p.provider_name,
        p.flame_name,
        p.bridger_id,
        p.movement_code,
        u.name AS public_bridger_name,
        p.created_at
      FROM file_folder_purchases p
      LEFT JOIN users u ON u.id = p.bridger_id
      WHERE p.status = 'pending_admin_confirmation'
      ORDER BY p.created_at ASC
    `

    const normalized = [
      ...deposits.map((deposit: any) => ({
        ...deposit,
        source: 'bridge_deposit',
        fileFolderTier: getFileFolderTier(Number(deposit.tier_trx)),
      })),
      ...purchases.map((purchase: any) => ({
        id: purchase.id,
        source: 'file_folder_purchase',
        prospect_name: purchase.buyer_name || purchase.buyer_email || 'Bridge Radiance Prospect',
        prospect_phone: purchase.buyer_phone || '',
        tier_trx: Number(purchase.amount_trx || 0),
        tx_hash: purchase.payment_reference,
        status: purchase.status,
        file_number: purchase.file_number,
        bridge_code: purchase.bridge_code,
        bridger_id: purchase.bridger_id || null,
        bridger_name: purchase.public_bridger_name || purchase.provider_name || purchase.flame_name || 'Bridge Radiance',
        movement_code: purchase.movement_code || null,
        provider_name: purchase.provider_name || null,
        flame_name: purchase.flame_name || null,
        created_at: purchase.created_at,
        fileFolderTier: getFileFolderTier(Number(purchase.amount_trx)),
      })),
    ].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    return NextResponse.json({ success: true, deposits: normalized })
  } catch (error) {
    console.error('[bridge deposits pending]', error)
    return NextResponse.json({ error: 'Failed to load Bridge deposits' }, { status: 500 })
  }
}
