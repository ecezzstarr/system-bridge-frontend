import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureWeaveReceiptSchema,issueWeaveReceipt } from '@/lib/weave-receipts'
import {
  aiConfigured,ensureRiverCallSchema,hashToken,ID_RE,newWebhookToken,PHONE_RE,
  refundUnconnectedCall,startTwilioVoice,twilioConfigured,webhookUrl,RIVER_CALL_PRICE_FLAME_COIN
} from '@/lib/river-voice-outreach'

export const runtime='nodejs'
const ownFields="id,candidate_name,phone_e164,status,stage,price_flame_coin,whatsapp_status,whatsapp_consent,created_at,ended_at,refund_at,source_outreach_id"

export async function GET(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user||user.role!=='bridger')return NextResponse.json({error:'Bridger access required'},{status:403})
  try {
    await ensureRiverCallSchema()
    const pool=getPool()
    const [settings,calls,wallet]=await Promise.all([
      pool.query('SELECT price_flame_coin,enabled FROM weave_river_call_settings WHERE id=1'),
      pool.query('SELECT '+ownFields+' FROM weave_river_calls WHERE bridger_id=$1::uuid ORDER BY created_at DESC LIMIT 60',[user.id]),
      pool.query('SELECT balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true LIMIT 1',[user.id]),
    ])
    const config=settings.rows[0]
    return NextResponse.json({success:true,priceFlameCoin:RIVER_CALL_PRICE_FLAME_COIN,
      enabled:Boolean(config?.enabled),providerReady:twilioConfigured()&&aiConfigured(),
      walletBalance:Number(wallet.rows[0]?.balance_trx||0),calls:calls.rows},{headers:{'Cache-Control':'private,no-store'}})
  }catch(e){console.error('[river voice GET]',e);return NextResponse.json({error:'River call records unavailable'},{status:503})}
}
export async function POST(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user||user.role!=='bridger')return NextResponse.json({error:'Bridger access required'},{status:403})
  const body=await request.json().catch(()=>({}))
  const requestKey=String(body.requestKey||'')
  const sourceOutreachId=String(body.sourceOutreachId||'')
  const phone=String(body.phone||'').trim()
  const name=String(body.name||'').trim().slice(0,150)
  const consentSource=String(body.consentSource||'').trim().slice(0,400)
  if(!ID_RE.test(requestKey))return NextResponse.json({error:'A valid request key is required'},{status:400})
  if(!PHONE_RE.test(phone))return NextResponse.json({error:'Use a valid phone number beginning with + and country code'},{status:400})
  if(sourceOutreachId&&!ID_RE.test(sourceOutreachId))return NextResponse.json({error:'Invalid owned prospect reference'},{status:400})
  if(body.confirmedRequestedCall!==true || consentSource.length<8)
    return NextResponse.json({error:'Record how this person requested or agreed to an AI phone call before dialing'},{status:400})
  if(!twilioConfigured()||!aiConfigured())return NextResponse.json({error:'River live calling is not configured. No Flame Coin charged.'},{status:503})
  await ensureRiverCallSchema()
  const pool=getPool(),client=await pool.connect()
  const token=newWebhookToken()
  let id='',fee=0,balanceAfter=0
  try{
    await client.query('BEGIN')
    const repeat=await client.query('SELECT '+ownFields+' FROM weave_river_calls WHERE bridger_id=$1::uuid AND request_key=$2::uuid',[user.id,requestKey])
    if(repeat.rows[0]){await client.query('COMMIT');return NextResponse.json({success:true,replayed:true,call:repeat.rows[0]})}
    const profile=await client.query("SELECT status FROM bridger_profiles WHERE user_id=$1::uuid",[user.id])
    if(profile.rows[0]?.status!=='active'){await client.query('ROLLBACK');return NextResponse.json({error:'Active Bridger position required'},{status:403})}
    if(sourceOutreachId){
      const assigned=await client.query(
        "SELECT o.id,c.phone,c.whatsapp_number FROM market_prospect_outreach o JOIN market_prospect_contacts c ON c.id=o.contact_id WHERE o.id=$1::uuid AND o.bridger_id=$2::uuid",[sourceOutreachId,user.id])
      if(!assigned.rows[0]){await client.query('ROLLBACK');return NextResponse.json({error:'Candidate is not assigned to this Bridger'},{status:403})}
      const owned=assigned.rows[0]
      if(![owned.phone,owned.whatsapp_number].some((n:any)=>String(n||'').replace(/\D/g,'')===phone.replace(/\D/g,''))){
        await client.query('ROLLBACK');return NextResponse.json({error:'The entered number does not match the assigned candidate'},{status:400})
      }
    }
    const blocked=await client.query('SELECT 1 FROM weave_river_call_optouts WHERE phone_e164=$1 LIMIT 1',[phone])
    if(blocked.rows.length){await client.query('ROLLBACK');return NextResponse.json({error:'This contact declined AI outreach and cannot be called'},{status:403})}
    const cfg=await client.query('SELECT enabled,price_flame_coin FROM weave_river_call_settings WHERE id=1')
    fee=RIVER_CALL_PRICE_FLAME_COIN
    if(!cfg.rows[0]?.enabled || !Number.isFinite(fee) || fee<=0){
      await client.query('ROLLBACK');return NextResponse.json({error:'Administration has not activated a River call price'},{status:503})
    }
    const wa=await client.query('SELECT whatsapp_number FROM users WHERE id=$1::uuid',[user.id])
    const bridgerWhatsapp=String(wa.rows[0]?.whatsapp_number||'').replace(/\D/g,'')
    if(!/^[1-9]\d{6,14}$/.test(bridgerWhatsapp)){
      await client.query('ROLLBACK');return NextResponse.json({error:'Save your valid WhatsApp number in My Prospects before using River outreach'},{status:400})
    }
    const wallet=await client.query('SELECT id,balance_trx FROM wallets WHERE user_id=$1::uuid AND is_primary=true FOR UPDATE',[user.id])
    if(!wallet.rows[0]){await client.query('ROLLBACK');return NextResponse.json({error:'Primary wallet not found'},{status:404})}
    const before=Number(wallet.rows[0].balance_trx)
    if(before<fee){await client.query('ROLLBACK');return NextResponse.json({error:'Insufficient Flame Coin balance',required:fee,available:before},{status:402})}
    balanceAfter=before-fee
    await client.query('UPDATE wallets SET balance_trx=$1,updated_at=NOW() WHERE id=$2',[balanceAfter,wallet.rows[0].id])
    const created=await client.query(
      "INSERT INTO weave_river_calls(bridger_id,request_key,source_outreach_id,candidate_name,phone_e164,consent_source,bridger_whatsapp,price_flame_coin,webhook_token_hash) "+
      "VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9) RETURNING id",
      [user.id,requestKey,sourceOutreachId||null,name||null,phone,consentSource,bridgerWhatsapp,fee,hashToken(token)])
    id=String(created.rows[0].id)
    await client.query(
      "INSERT INTO ledger_entries(id,user_id,entry_type,amount,currency,description,balance_before,balance_after,metadata,created_at) "+
      "VALUES(gen_random_uuid(),$1::uuid,'fee',$2,'Flame Coin','River live outreach call',$3,$4,$5::jsonb,NOW())",
      [user.id,fee,before,balanceAfter,JSON.stringify({commerce_type:'river_voice_call',call_id:id,phone_masked:phone.slice(0,4)+'****'})]
    )
    await client.query('COMMIT')
  }catch(e){await client.query('ROLLBACK').catch(()=>{});console.error('[river voice purchase]',e);
    return NextResponse.json({error:'River call purchase could not be completed'},{status:500})
  }finally{client.release()}
  try{
    const sid=await startTwilioVoice(phone,webhookUrl(id,token),webhookUrl(id,token,true))
    await pool.query("UPDATE weave_river_calls SET provider_call_sid=$1,status='queued' WHERE id=$2::uuid AND status='starting'",[sid,id])
    // Receipt errors do not undo an accepted provider call; payment is already in the ledger.
    try{
      await ensureWeaveReceiptSchema()
      await issueWeaveReceipt({userId:user.id,kind:'purchase',source:'river_voice_call',sourceId:id,
        amount:fee,currency:'Flame Coin',status:'paid',description:'Bridger River AI phone call',metadata:{callId:id}})
    }catch(e){console.error('[river voice receipt]',e)}
    return NextResponse.json({success:true,callId:id,status:'queued',chargedFlameCoin:fee,newBalance:balanceAfter},{status:201})
  }catch(e){
    console.error('[river voice dial]',e)
    try{await refundUnconnectedCall(id)}catch(err){console.error('[river voice refund requires reconciliation]',err)}
    return NextResponse.json({error:'The provider did not accept the call. Any charged Flame Coin is being reconciled; check the call ledger.',callId:id},{status:503})
  }
}
