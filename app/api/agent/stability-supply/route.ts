import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getSql } from '@/lib/db'
import { ensureBridgerNumberEngineSchema } from '@/lib/bridger-number-engine'
import { ensureMarketTables } from '@/lib/market'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
 if(user.role!=='agent')return NextResponse.json({error:'Stability supply is Agent-only'},{status:403})
 await Promise.all([ensureBridgerNumberEngineSchema(getSql()),ensureMarketTables()])
 const sql=getSql()
 const [numbers,prospects]=await Promise.all([
  sql`SELECT o.country,o.price_flame_coin,o.delivery_minutes,COALESCE(s.stock_count,0)::int AS stock_count
      FROM bridger_number_country_offers o
      LEFT JOIN LATERAL (SELECT COUNT(*)::int AS stock_count FROM bridger_whatsapp_numbers n
        WHERE LOWER(n.country)=LOWER(o.country) AND n.status='available' AND n.assigned_to IS NULL) s ON true
      WHERE o.enabled=true ORDER BY o.country ASC`,
  sql`SELECT id,title,description,price_trx,created_at FROM market_prospect_packages WHERE status='published' ORDER BY created_at DESC LIMIT 100`
 ])
 return NextResponse.json({success:true,numbers,prospects},{headers:{'Cache-Control':'private, no-store'}})
}
