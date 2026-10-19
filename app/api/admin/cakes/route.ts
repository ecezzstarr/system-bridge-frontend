import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureCarrierCakeSchema,nextCakeAdministrationStatus } from '@/lib/carrier-cakes'
import { ensureFoodPreparationManagerSchema } from '@/lib/food-preparation-manager'
import { assignPaidOrderToPreparationManager } from '@/lib/food-preparation-routing'

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='admin')return NextResponse.json({error:'Administration required'},{status:403})
  try{
    await ensureCarrierCakeSchema()
    const result=await getPool().query(`
      SELECT o.*,u.name AS agent_name,u.username AS agent_username,u.email AS agent_email
      FROM carrier_cake_orders o
      LEFT JOIN users u ON u.id=o.agent_id
      ORDER BY CASE o.status
        WHEN 'awaiting_payment_verification' THEN 1
        WHEN 'paid' THEN 2
        WHEN 'preparing' THEN 3
        WHEN 'ready' THEN 4
        WHEN 'dispatched' THEN 5
        WHEN 'quote_requested' THEN 6
        WHEN 'quoted' THEN 7
        ELSE 8 END,
        o.event_date ASC,o.created_at DESC
      LIMIT 300`)
    return NextResponse.json({success:true,orders:result.rows})
  }catch(error){console.error('[admin/cakes] GET failed',error);return NextResponse.json({error:'Unable to load cake orders'},{status:500})}
}

export async function PATCH(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='admin')return NextResponse.json({error:'Administration required'},{status:403})
  try{
    await ensureCarrierCakeSchema()
    const body=await request.json().catch(()=>({}))
    const orderId=String(body.orderId||'').trim()
    const requestedStatus=String(body.status||'').trim()
    const adminNote=String(body.adminNote||'').trim().slice(0,800)
    if(!orderId)return NextResponse.json({error:'Cake order is required'},{status:400})
    if(body.action==='confirm_payment_for_preparation'){
      const confirmationNote=String(body.adminNote||'').trim().slice(0,800)
      if(confirmationNote.length<12)return NextResponse.json({error:'Document the Administration payment confirmation before preparing Daisy Pastries (12+ characters).'},{status:400})
      await ensureFoodPreparationManagerSchema()
      const client=await getPool().connect()
      let committed=false
      try {
        await client.query('BEGIN')
        const result=await client.query('SELECT * FROM carrier_cake_orders WHERE id=$1::uuid FOR UPDATE',[orderId])
        const paid=result.rows[0]
        if(!paid||paid.payment_status!=='paid'||paid.status!=='paid'||paid.preparation_released_at){
          await client.query('ROLLBACK')
          return NextResponse.json({error:'An Agent-confirmed paid cake order awaiting Administration release is required.'},{status:409})
        }
        // Agent verifies the customer transfer. Administration explicitly
        // reviews that recorded verification and releases the kitchen order.
        const release=await client.query(`
          UPDATE carrier_cake_orders
          SET preparation_released_at=NOW(),preparation_released_by=$1::uuid,admin_note=$3,updated_at=NOW()
          WHERE id=$2::uuid AND status='paid' AND payment_status='paid'
            AND preparation_released_at IS NULL RETURNING *
        `,[user.id,orderId,confirmationNote])
        if(!release.rows.length)throw new Error('Cake payment release changed during confirmation')
        const preparation=await assignPaidOrderToPreparationManager(client,'daisy',release.rows[0],user.id)
        await client.query('COMMIT')
        committed=true
        return NextResponse.json({success:true,order:release.rows[0],preparation,
          message:preparation.assigned
            ? 'Administration released the paid Daisy Pastries order. Food Preparation Manager notified with the customer location and event details.'
            : 'Daisy Pastries released for preparation, but no approved Food Preparation Manager was available. Assign it from Administration.'})
      }catch(error){
        if(!committed)await client.query('ROLLBACK').catch(()=>{})
        console.error('[admin/cakes] release failed',error)
        return NextResponse.json({error:'Unable to release this Daisy Pastries order for preparation'},{status:500})
      }finally{client.release()}
    }
    const currentResult=await getPool().query('SELECT * FROM carrier_cake_orders WHERE id=$1::uuid LIMIT 1',[orderId])
    const current=currentResult.rows[0]
    if(!current)return NextResponse.json({error:'Cake order not found'},{status:404})
    const expected=nextCakeAdministrationStatus(current.status)
    if(!expected||requestedStatus!==expected)return NextResponse.json({error:expected?`Next cake stage must be ${expected}`:'This cake order is not in an Administration production stage'},{status:409})
    if(current.payment_status!=='paid')return NextResponse.json({error:'Administration cannot prepare a cake before the Agent verifies customer payment'},{status:409})
    if(!current.preparation_released_at)return NextResponse.json({error:'Confirm the paid cake order for preparation before moving kitchen stages.'},{status:409})
    const result=await getPool().query(
      `UPDATE carrier_cake_orders SET status=$1,admin_note=$2,
        preparing_at=CASE WHEN $1='preparing' THEN COALESCE(preparing_at,NOW()) ELSE preparing_at END,
        ready_at=CASE WHEN $1='ready' THEN COALESCE(ready_at,NOW()) ELSE ready_at END,
        dispatched_at=CASE WHEN $1='dispatched' THEN COALESCE(dispatched_at,NOW()) ELSE dispatched_at END,
        completed_at=CASE WHEN $1='completed' THEN COALESCE(completed_at,NOW()) ELSE completed_at END,
        updated_at=NOW()
       WHERE id=$3::uuid AND status=$4 RETURNING *`,
      [requestedStatus,adminNote||null,orderId,current.status]
    )
    const updated=result.rows[0]
    if(!updated)return NextResponse.json({error:'Cake order changed. Reload before moving it again.'},{status:409})
    try{
      await getPool().query(`INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
        VALUES ($1::uuid,'cake_fulfillment','Cake order moved',$2,'Administration','/agent/cakes')`,[
        updated.agent_id,`Cake order for ${updated.customer_name} is now ${requestedStatus}.`])
    }catch{}
    return NextResponse.json({success:true,order:updated})
  }catch(error){console.error('[admin/cakes] PATCH failed',error);return NextResponse.json({error:'Unable to move cake fulfillment'},{status:500})}
}
