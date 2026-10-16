import { NextRequest, NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { ensureCarrierFoodSchema, expireCarrierFoodPaymentIntents } from '@/lib/carrier-food'

async function requireAdmin(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='admin')throw Object.assign(new Error('Administration account required'),{status:403})
  return user
}

export async function GET(request:NextRequest){
  try{
    await requireAdmin(request)
    await ensureCarrierFoodSchema()
    await expireCarrierFoodPaymentIntents()
    const result=await getPool().query(`
      SELECT
        c.id,c.agent_id,c.referral_code,c.variant_id,c.quantity_packages,c.unit_price_ngn,c.total_ngn,
        c.customer_name,c.customer_phone,c.delivery_location,c.customer_note,c.status,
        c.payment_method,c.payment_account_number,c.payment_reference,c.opay_transaction_reference,
        c.payment_status,c.payment_proof_submitted_at,c.payment_verified_at,c.payment_rejected_at,
        c.payment_admin_note,c.created_at,c.updated_at,
        COALESCE(NULLIF(TRIM(u.name),''),NULLIF(TRIM(u.username),''),'WEAVE Agent') AS agent_name,
        u.email AS agent_email
      FROM carrier_food_orders c
      JOIN users u ON u.id=c.agent_id
      WHERE c.payment_status IN ('proof_submitted','paid','rejected')
      ORDER BY
        CASE c.payment_status WHEN 'proof_submitted' THEN 0 WHEN 'paid' THEN 1 ELSE 2 END,
        c.created_at DESC
      LIMIT 150
    `)
    return NextResponse.json({success:true,orders:result.rows})
  }catch(error:any){
    return NextResponse.json({success:false,error:error.message||'Unable to load Carrier food payments'},{status:error.status||500})
  }
}

export async function POST(request:NextRequest){
  let db:PoolClient|undefined
  try{
    const admin=await requireAdmin(request)
    await ensureCarrierFoodSchema()
    const body=await request.json().catch(()=>({}))
    const orderId=String(body.orderId||'').trim()
    const action=String(body.action||'').trim().toLowerCase()
    const adminNote=String(body.adminNote||'').trim().slice(0,1000)
    if(!orderId||!['approve','reject'].includes(action)){
      return NextResponse.json({success:false,error:'Carrier payment and approve/reject action are required'},{status:400})
    }

    db=await getPool().connect()
    await db.query('BEGIN')
    const result=await db.query(
      `SELECT c.*,COALESCE(NULLIF(TRIM(u.name),''),NULLIF(TRIM(u.username),''),'WEAVE Agent') AS agent_name
       FROM carrier_food_orders c
       JOIN users u ON u.id=c.agent_id
       WHERE c.id=$1::uuid
       FOR UPDATE OF c`,
      [orderId]
    )
    const order=result.rows[0]
    if(!order){
      await db.query('ROLLBACK')
      return NextResponse.json({success:false,error:'Carrier payment not found'},{status:404})
    }
    if(order.payment_status!=='proof_submitted'||order.status!=='awaiting_payment_verification'){
      await db.query('ROLLBACK')
      return NextResponse.json({success:false,error:`This Carrier payment is already ${order.payment_status}`},{status:409})
    }

    if(action==='reject'){
      const updated=await db.query(
        `UPDATE carrier_food_orders
         SET payment_status='rejected',status='cancelled',payment_rejected_at=NOW(),
             payment_admin_note=$1,cancelled_at=NOW(),updated_at=NOW()
         WHERE id=$2::uuid
         RETURNING id,payment_status,status`,
        [adminNote||'Payment proof rejected by Administration',orderId]
      )
      await db.query('COMMIT')
      try{
        await getPool().query(
          `INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
           VALUES ($1::uuid,'carrier_food_payment','Carrier customer payment rejected',$2,'Administration','/weave/carrier/food')`,
          [order.agent_id,`${order.customer_name}'s Carrier payment was rejected.${adminNote?` ${adminNote}`:''}`]
        )
      }catch{}
      return NextResponse.json({success:true,order:updated.rows[0],message:'Carrier payment rejected and reserved stock released.'})
    }

    const updated=await db.query(
      `UPDATE carrier_food_orders
       SET payment_status='paid',status='requested',payment_verified_by=$1::uuid,
           payment_verified_at=NOW(),payment_admin_note=$2,updated_at=NOW()
       WHERE id=$3::uuid
       RETURNING id,payment_status,status,payment_verified_at`,
      [admin.id,adminNote||null,orderId]
    )
    await db.query('COMMIT')

    try{
      await getPool().query(
        `INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
         VALUES ($1::uuid,'carrier_food_payment','Paid Carrier order ready',$2,'Administration','/weave/carrier/food')`,
        [order.agent_id,`${order.customer_name}'s ${order.variant_id} order is paid and verified. ${order.quantity_packages} pack${Number(order.quantity_packages)===1?'':'s'} can now be fulfilled.`]
      )
    }catch{}

    return NextResponse.json({success:true,order:updated.rows[0],message:'OPay payment verified. The order is now released to the Agent.'})
  }catch(error:any){
    if(db)await db.query('ROLLBACK').catch(()=>{})
    return NextResponse.json({success:false,error:error.message||'Unable to verify Carrier food payment'},{status:error.status||500})
  }finally{
    db?.release()
  }
}
