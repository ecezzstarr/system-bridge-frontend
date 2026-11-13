import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureFlameOfHopeFoodSchema } from '@/lib/flame-of-hope-food'
import { notifyAdminOrder } from '@/lib/admin-order-notifications'

export const dynamic='force-dynamic'
const noStore={'Cache-Control':'private, no-store'}
const isUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

export async function GET(request:NextRequest){
  const actor=await getAuthUser(request)
  if(!actor||actor.role!=='admin')return NextResponse.json({success:false,error:'Administrations required'},{status:403,headers:noStore})
  try{
    await ensureFlameOfHopeFoodSchema()
    const result=await getPool().query(`
      SELECT c.id,c.bridger_id,u.name AS bridger_name,u.email AS bridger_email,
        c.event_key,c.claim_week_start::text AS week_start,c.product_id,c.product_price_ngn,
        c.actual_spend_system_switch,c.required_spend_system_switch,c.reference_rate_ngn,
        c.fulfillment_status,c.fulfillment_reference,c.claimed_at,c.fulfilled_at
      FROM weave_flame_of_hope_claims c
      JOIN users u ON u.id=c.bridger_id
      ORDER BY CASE WHEN c.fulfillment_status='pending_fulfillment' THEN 0 WHEN c.fulfillment_status='preparing' THEN 1 ELSE 2 END,
        c.claimed_at DESC
      LIMIT 100
    `)
    return NextResponse.json({success:true,claims:result.rows},{headers:noStore})
  }catch(error){
    console.error('[flame-of-hope admin] list failed',error)
    return NextResponse.json({success:false,error:'Unable to read food reward claims'},{status:503,headers:noStore})
  }
}

export async function POST(request:NextRequest){
  const actor=await getAuthUser(request)
  if(!actor||actor.role!=='admin')return NextResponse.json({success:false,error:'Administrations required'},{status:403,headers:noStore})
  const body=await request.json().catch(()=>({}))
  const id=String(body.claimId||'').trim()
  const target=String(body.status||'').trim()
  const reference=String(body.fulfillmentReference||'').trim()
  if(!isUuid(id)||!['preparing','fulfilled'].includes(target))return NextResponse.json({success:false,error:'Valid claim and transition required'},{status:400,headers:noStore})
  if(target==='fulfilled'&&(reference.length<6||reference.length>240))return NextResponse.json({success:false,error:'Recorded delivery or collection proof reference (6–240 characters) required'},{status:400,headers:noStore})
  await ensureFlameOfHopeFoodSchema()
  const db=await getPool().connect()
  let updated:any=null
  try{
    await db.query('BEGIN')
    const result=await db.query('SELECT * FROM weave_flame_of_hope_claims WHERE id=$1::uuid LIMIT 1 FOR UPDATE',[id])
    const current=result.rows[0]
    if(!current){await db.query('ROLLBACK');return NextResponse.json({success:false,error:'Food claim not found'},{status:404,headers:noStore})}
    if(current.fulfillment_status===target){
      await db.query('COMMIT')
      return NextResponse.json({success:true,alreadyRecorded:true,claim:current},{headers:noStore})
    }
    const valid=(current.fulfillment_status==='pending_fulfillment'&&target==='preparing')||
      (current.fulfillment_status==='preparing'&&target==='fulfilled')
    if(!valid){await db.query('ROLLBACK');return NextResponse.json({success:false,error:'Prepare the reward before confirming actual handoff'},{status:409,headers:noStore})}
    const done=await db.query(
      `UPDATE weave_flame_of_hope_claims
       SET fulfillment_status=$2,
           fulfillment_reference=CASE WHEN $2='fulfilled' THEN $3 ELSE fulfillment_reference END,
           fulfilled_by=CASE WHEN $2='fulfilled' THEN $4::uuid ELSE fulfilled_by END,
           fulfilled_at=CASE WHEN $2='fulfilled' THEN NOW() ELSE fulfilled_at END
       WHERE id=$1::uuid
       RETURNING id,bridger_id,product_id,fulfillment_status,fulfillment_reference,claimed_at,claim_week_start::text AS week_start`,
      [id,target,reference||null,actor.id],
    )
    updated=done.rows[0]
    await db.query(
      'INSERT INTO weave_flame_of_hope_fulfillment_events(claim_id,actor_id,from_status,to_status,fulfillment_reference) VALUES($1::uuid,$2::uuid,$3,$4,$5)',
      [id,actor.id,current.fulfillment_status,target,reference||null],
    )
    await db.query(
      "INSERT INTO notifications(user_id,type,title,content,from_user_name,link) VALUES($1::uuid,'order_update',$2,$3,$4,'/bridger/flame-of-hope')",
      [current.bridger_id,
        target==='fulfilled'?'Flame of Hope · food received':'Flame of Hope · food preparation',
        target==='fulfilled'
          ? 'Administrations recorded fulfilment of your '+current.product_id+' food reward. Reference: '+reference
          : 'Administrations is preparing your '+current.product_id+' food reward. Confirm collection or delivery details with the company.',
        actor.name||'Administrations'],
    )
    await db.query('COMMIT')
  }catch(error){
    try{await db.query('ROLLBACK')}catch{}
    console.error('[flame-of-hope admin] transition failed',error)
    return NextResponse.json({success:false,error:'Food reward status could not be recorded'},{status:503,headers:noStore})
  }finally{db.release()}
  if(target==='fulfilled'){
    try{await notifyAdminOrder({
      orderId:id,event:'fulfilled',department:'bridger',subject:'Flame of Hope food handoff completed',
      detail:'Administrations recorded physical food handoff with fulfilment reference '+reference,
      adminPath:'/admin/flame-of-hope',actorId:actor.id,actorName:actor.name||'Administrations',
    })}catch(error){console.error('[flame-of-hope admin] completion alert failed',error)}
  }
  return NextResponse.json({success:true,claim:updated},{headers:noStore})
}
