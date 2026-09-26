import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getSql } from '@/lib/db'
import { ensureWeaveReceiptSchema } from '@/lib/weave-receipts'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error:'Unauthorized' }, { status:401 })
    const sql = getSql()
    await ensureWeaveReceiptSchema(sql)
    const receipts = await sql`
      SELECT id,receipt_number,user_id,kind,source,source_id,amount,currency,status,description,metadata,created_at
      FROM weave_receipts
      WHERE user_id=${user.id}::uuid
      ORDER BY created_at DESC
      LIMIT 200
    `
    return NextResponse.json({ success:true, receipts }, { headers:{ 'Cache-Control':'private, no-store' } })
  } catch (error) {
    console.error('[receipts GET]', error)
    return NextResponse.json({ error:'Unable to load receipts' }, { status:500 })
  }
}
