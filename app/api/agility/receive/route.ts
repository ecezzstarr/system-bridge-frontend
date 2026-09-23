import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getApiUser } from '@/lib/api-auth'
import { ensureAgilitySchema } from '@/lib/agility'

export async function POST(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ success: false, error: 'Agent account required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const orderId = String(body.orderId || '').trim()
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order is required' }, { status: 400 })
    }

    await ensureAgilitySchema()
    const [updated] = await sql`
      UPDATE agility_stock_orders
      SET fulfillment_status='received', received_at=COALESCE(received_at,NOW()), updated_at=NOW()
      WHERE id=${orderId}::uuid
        AND agent_id=${user.id}::uuid
        AND payment_status='paid'
        AND fulfillment_status='delivered'
      RETURNING *
    `

    if (!updated) {
      return NextResponse.json({
        success: false,
        error: 'Only a paid Agility order marked delivered by Administration can be received',
      }, { status: 409 })
    }

    try {
      await sql`
        INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
        SELECT id,'agility_received','Agility received',
          ${(user.name || user.username || 'Agent') + ' confirmed receipt of ' + updated.box_count + ' Agility box' + (Number(updated.box_count) === 1 ? '' : 'es') + '.'},
          ${user.name || user.username || 'Agent'},
          '/admin/agility'
        FROM users
        WHERE role='admin' AND is_active=true
      `
    } catch {
      // Receipt state remains authoritative.
    }

    return NextResponse.json({ success: true, order: updated })
  } catch (error) {
    console.error('[agility/receive] failed', error)
    return NextResponse.json({ success: false, error: 'Unable to confirm Agility receipt' }, { status: 500 })
  }
}
