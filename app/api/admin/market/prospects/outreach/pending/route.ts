import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { ensureMarketTables } from '@/lib/market'
import { ensureWeaveMailboxSchema } from '@/lib/weave-mailbox'

// Route name is kept for compatibility; response contains the full Prospect funnel.
export async function GET(request:NextRequest){
  const authUser=await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (authUser.role !== 'admin') {
    return NextResponse.json({ error: 'Administration access required' }, { status: 403 })
  }

  try{
    await Promise.all([ensureMarketTables(),ensureWeaveMailboxSchema()])
    const pending=await sql`
      SELECT
        o.*,
        c.phone,
        c.email,
        c.name AS contact_name,
        u.name AS bridger_name,
        u.role AS sender_role,
        m.email AS sender_email
      FROM market_prospect_outreach o
      JOIN market_prospect_contacts c ON o.contact_id=c.id
      JOIN users u ON o.bridger_id=u.id
      LEFT JOIN weave_mailboxes m ON m.id=o.sender_mailbox_id
      ORDER BY o.last_activity_at DESC
    `
    return NextResponse.json({success:true,pending})
  }catch(error){
    console.error('[Market Outreach Registry] Error:',error)
    return NextResponse.json({error:'Failed to load outreach funnel'},{status:500})
  }
}
