import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql} from '@/lib/db'
import {CJ_DORADO_FILE_NUMBER} from '@/lib/client-file-folder'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
const PAIRS=['BTC/USDT','ETH/USDT','SOL/USDT','TRX/USDT'] as const
async function access(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user||user.role!=='client')return null
 const [owned]=await sql`SELECT id,file_number FROM users WHERE id=${user.id}::uuid
 AND role='client' AND is_active=true AND file_number=${CJ_DORADO_FILE_NUMBER} LIMIT 1`
 if(!owned)return null
 const [workshop]=await sql`SELECT id FROM client_system_workshops
 WHERE client_id=${user.id}::uuid AND file_number=${CJ_DORADO_FILE_NUMBER}
 AND workshop_type='crypto_exchange' LIMIT 1`
 return workshop?user:null
}
async function ensureJournal(){
 await sql`CREATE TABLE IF NOT EXISTS cj_crypto_exchange_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id),
  file_number varchar(120) NOT NULL,
  pair varchar(20) NOT NULL CHECK(pair IN ('BTC/USDT','ETH/USDT','SOL/USDT','TRX/USDT')),
  side varchar(4) NOT NULL CHECK(side IN ('buy','sell')),
  quantity numeric(24,8) NOT NULL CHECK(quantity>0),
  indicated_price_usdt numeric(24,8) NOT NULL CHECK(indicated_price_usdt>0),
  notional_usdt numeric(24,8) NOT NULL CHECK(notional_usdt>0),
  notes varchar(1000),
  status varchar(24) NOT NULL DEFAULT 'proposed'
   CHECK(status IN ('proposed','externally_reported','verified','canceled')),
  external_venue varchar(120),
  external_reference varchar(200),
  reported_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
 )`
 await sql`CREATE INDEX IF NOT EXISTS cj_crypto_order_owner_time ON cj_crypto_exchange_orders(client_id,created_at DESC)`
 await sql`CREATE UNIQUE INDEX IF NOT EXISTS cj_crypto_order_external_reference
 ON cj_crypto_exchange_orders(external_venue,external_reference)
 WHERE external_venue IS NOT NULL AND external_reference IS NOT NULL`
}
export async function GET(request:NextRequest){
 try{
  const user=await access(request)
  if(!user)return NextResponse.json({error:'CJ Crypto Exchange Workshop access required'},{status:403,headers})
  await ensureJournal()
  const orders=await sql`SELECT id,pair,side,quantity,indicated_price_usdt,notional_usdt,notes,status,
  external_venue,external_reference,reported_at,verified_at,created_at
  FROM cj_crypto_exchange_orders WHERE client_id=${user.id}::uuid
  AND file_number=${CJ_DORADO_FILE_NUMBER} ORDER BY created_at DESC LIMIT 100`
  return NextResponse.json({success:true,orders,liveTrading:false,
   notice:'This desk records orders and external execution evidence. It does not place exchange trades, custody crypto or show live market quotes.'},{headers})
 }catch(error){console.error('[CJ crypto orders GET]',error)
  return NextResponse.json({error:'Exchange journal unavailable'},{status:503,headers})}
}
export async function POST(request:NextRequest){
 try{
  const user=await access(request)
  if(!user)return NextResponse.json({error:'CJ Crypto Exchange Workshop access required'},{status:403,headers})
  const body=await request.json().catch(()=>({}))
  const pair=String(body.pair||'')
  const side=String(body.side||'')
  const quantity=Number(body.quantity)
  const price=Number(body.priceUSDT)
  const notional=Math.round(quantity*price*1e8)/1e8
  const notes=String(body.notes||'').trim()
  if(!PAIRS.includes(pair as typeof PAIRS[number])||!['buy','sell'].includes(side)||
   !Number.isFinite(quantity)||quantity<=0||quantity>100000000||
   !Number.isFinite(price)||price<=0||price>1000000000||
   !Number.isFinite(notional)||notional<=0||notional>100000000||
   Math.round(quantity*1e8)!==quantity*1e8||
   Math.round(price*1e8)!==price*1e8||notes.length>1000)
   return NextResponse.json({error:'Enter a valid pair, side, quantity and indicated USDT price.'},{status:400,headers})
  await ensureJournal()
  const [order]=await sql`INSERT INTO cj_crypto_exchange_orders
   (client_id,file_number,pair,side,quantity,indicated_price_usdt,notional_usdt,notes)
   VALUES(${user.id}::uuid,${CJ_DORADO_FILE_NUMBER},${pair},${side},${quantity},${price},${notional},${notes||null})
   RETURNING *`
  return NextResponse.json({success:true,order},{status:201,headers})
 }catch(error){console.error('[CJ crypto orders POST]',error)
  return NextResponse.json({error:'Unable to save exchange order record'},{status:503,headers})}
}
export async function PATCH(request:NextRequest){
 try{
  const user=await access(request)
  if(!user)return NextResponse.json({error:'CJ Crypto Exchange Workshop access required'},{status:403,headers})
  const body=await request.json().catch(()=>({}))
  const id=String(body.id||'')
  const action=String(body.action||'')
  if(!/^[0-9a-f-]{36}$/i.test(id)||!['cancel','report_external'].includes(action))
   return NextResponse.json({error:'Invalid order action'},{status:400,headers})
  await ensureJournal()
  if(action==='cancel'){
   const [row]=await sql`UPDATE cj_crypto_exchange_orders SET status='canceled',updated_at=now()
   WHERE id=${id}::uuid AND client_id=${user.id}::uuid AND status='proposed' RETURNING id,status`
   return row?NextResponse.json({success:true,order:row},{headers}):
    NextResponse.json({error:'Only proposed orders may be canceled'},{status:409,headers})
  }
  const venue=String(body.externalVenue||'').trim()
  const reference=String(body.externalReference||'').trim()
  if(venue.length<2||venue.length>120||reference.length<8||reference.length>200)
   return NextResponse.json({error:'Name the external venue and supply its actual order reference.'},{status:400,headers})
  const [row]=await sql`UPDATE cj_crypto_exchange_orders
  SET status='externally_reported',external_venue=${venue},external_reference=${reference},
   reported_at=now(),updated_at=now()
  WHERE id=${id}::uuid AND client_id=${user.id}::uuid AND status='proposed'
  RETURNING id,status`
  return row?NextResponse.json({success:true,order:row},{headers}):
   NextResponse.json({error:'Only proposed orders may be reported'},{status:409,headers})
 }catch(error){console.error('[CJ crypto orders PATCH]',error)
  return NextResponse.json({error:'Exchange record not updated; check whether the reference is already used.'},{status:409,headers})}
}
