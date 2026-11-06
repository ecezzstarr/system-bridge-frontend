import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql} from '@/lib/db'
import {CJ_DORADO_FILE_NUMBER} from '@/lib/client-file-folder'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
export async function GET(request:NextRequest){
 try{
  const actor=await getAuthUser(request)
  if(actor?.role!=='admin')return NextResponse.json({error:'Administration required'},{status:403,headers})
  const [table]=await sql`SELECT to_regclass('public.cj_crypto_exchange_orders') AS name`
  if(!table?.name)return NextResponse.json({success:true,orders:[]},{headers})
  const orders=await sql`SELECT o.id,o.pair,o.side,o.quantity,o.indicated_price_usdt,o.status,
   o.external_venue,o.external_reference,o.reported_at,o.verified_at,o.created_at
   FROM cj_crypto_exchange_orders o JOIN users u ON u.id=o.client_id
   WHERE o.file_number=${CJ_DORADO_FILE_NUMBER} AND u.role='client'
   ORDER BY o.created_at DESC LIMIT 100`
  return NextResponse.json({success:true,orders},{headers})
 }catch(error){console.error('[CJ exchange review GET]',error)
  return NextResponse.json({error:'Review queue unavailable'},{status:503,headers})}
}
export async function POST(request:NextRequest){
 try{
  const actor=await getAuthUser(request)
  if(actor?.role!=='admin')return NextResponse.json({error:'Administration required'},{status:403,headers})
  const body=await request.json().catch(()=>({}))
  const id=String(body.id||'')
  if(!/^[0-9a-f-]{36}$/i.test(id)||body.externalProofReviewed!==true)
   return NextResponse.json({error:'Review the independent external execution evidence first.'},{status:400,headers})
  const [row]=await sql`UPDATE cj_crypto_exchange_orders
   SET status='verified',reviewed_by=${actor.id}::uuid,verified_at=now(),updated_at=now()
   WHERE id=${id}::uuid AND file_number=${CJ_DORADO_FILE_NUMBER}
    AND status='externally_reported' AND external_reference IS NOT NULL
   RETURNING id,status`
  return row?NextResponse.json({success:true,order:row},{headers}):
   NextResponse.json({error:'Order was already reviewed or has no external execution evidence.'},{status:409,headers})
 }catch(error){console.error('[CJ exchange review POST]',error)
  return NextResponse.json({error:'Unable to verify external exchange record'},{status:503,headers})}
}
