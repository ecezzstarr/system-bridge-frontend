import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool, getSql } from '@/lib/db'
import { ensureBridgerNumberEngineSchema } from '@/lib/bridger-number-engine'
import { issueWeaveReceipt } from '@/lib/weave-receipts'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='bridger') return NextResponse.json({error:'Only Bridgers can access this inventory'},{status:403})
  await ensureBridgerNumberEngineSchema(getSql())
  const pool=getPool(); const client=await pool.connect()
  try{
    const available=(await client.query(`
      SELECT id,country,provider,price_flame_coin,status,created_at
      FROM bridger_whatsapp_numbers WHERE status='available' AND assigned_to IS NULL
      ORDER BY price_flame_coin ASC,created_at ASC LIMIT 100
    `)).rows
    const mine=(await client.query(`
      SELECT id,phone_e164,country,provider,provider_reference,price_flame_coin,status,assigned_at,notes
      FROM bridger_whatsapp_numbers WHERE assigned_to=$1::uuid
      ORDER BY assigned_at DESC
    `,[user.id])).rows
    const inbox=(await client.query(`
      SELECT i.id,i.number_id,i.channel,i.sender,i.message,i.received_at,i.expires_at,i.viewed_at
      FROM bridger_number_inbox i
      JOIN bridger_whatsapp_numbers n ON n.id=i.number_id
      WHERE n.assigned_to=$1::uuid AND i.expires_at>NOW()
      ORDER BY i.received_at DESC LIMIT 100
    `,[user.id])).rows
    if(inbox.length) await client.query(`
      UPDATE bridger_number_inbox i SET viewed_at=COALESCE(i.viewed_at,NOW())
      FROM bridger_whatsapp_numbers n
      WHERE i.number_id=n.id AND n.assigned_to=$1::uuid AND i.expires_at>NOW()
    `,[user.id])
    return NextResponse.json({success:true,available,mine,inbox},{headers:{'Cache-Control':'private, no-store'}})
  } finally { client.release() }
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='bridger') return NextResponse.json({error:'Only Bridgers can purchase numbers'},{status:403})
  const {numberId}=await request.json()
  if(!numberId) return NextResponse.json({error:'numberId required'},{status:400})
  await ensureBridgerNumberEngineSchema(getSql())
  const pool=getPool(); const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const bridger=(await client.query(`SELECT status FROM bridger_profiles WHERE user_id=$1::uuid`,[user.id])).rows[0]
    if(!bridger||bridger.status!=='active'){await client.query('ROLLBACK');return NextResponse.json({error:'An active Bridger position is required'},{status:403})}
    const number=(await client.query(`
      SELECT * FROM bridger_whatsapp_numbers
      WHERE id=$1::uuid AND status='available' AND assigned_to IS NULL FOR UPDATE
    `,[numberId])).rows[0]
    if(!number){await client.query('ROLLBACK');return NextResponse.json({error:'That number is no longer available'},{status:409})}
    const price=Number(number.price_flame_coin)
    const wallet=(await client.query(`SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE`,[user.id])).rows[0]
    if(!wallet){await client.query('ROLLBACK');return NextResponse.json({error:'Wallet not found'},{status:404})}
    const before=Number(wallet.balance_trx)||0
    if(before<price){await client.query('ROLLBACK');return NextResponse.json({error:'Insufficient Flame Coin balance',required:price,currentBalance:before},{status:400})}
    const after=before-price
    await client.query(`UPDATE wallets SET balance_trx=$1,updated_at=NOW() WHERE user_id=$2::uuid AND is_primary=true`,[after,user.id])
    await client.query(`
      INSERT INTO ledger_entries(id,user_id,entry_type,amount,currency,description,balance_before,balance_after,created_at)
      VALUES(gen_random_uuid(),$1::uuid,'whatsapp_number_purchase',$2,'Flame Coin',$3,$4,$5,NOW())
    `,[user.id,price,`Purchased assigned WhatsApp business number ${number.id}`,before,after])
    const assigned=(await client.query(`
      UPDATE bridger_whatsapp_numbers
      SET status='assigned',assigned_to=$1::uuid,assigned_at=NOW(),updated_at=NOW()
      WHERE id=$2::uuid RETURNING *
    `,[user.id,numberId])).rows[0]
    await client.query('COMMIT')
    const receipt=await issueWeaveReceipt({userId:user.id,kind:'purchase',source:'bridger_whatsapp_number',sourceId:String(numberId),amount:price,currency:'Flame Coin',status:'completed',description:'Bridger WhatsApp business number assignment',metadata:{country:number.country,provider:number.provider,balanceAfter:after}})
    return NextResponse.json({success:true,number:assigned,newBalance:after,receipt})
  }catch(error){
    await client.query('ROLLBACK'); console.error('[Bridger Number purchase]',error)
    return NextResponse.json({error:'Number purchase failed'},{status:500})
  }finally{client.release()}
}
