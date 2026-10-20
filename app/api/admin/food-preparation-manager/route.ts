import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import { notifyManualFoodPreparationAssignment } from '@/lib/food-preparation-routing'
import {
  ensureFoodPreparationManagerSchema,ensurePreparationOrderSources,
  getPreparationSourceOrder,isPreparationProduct,preparationNextStage,
  validUuid,FOOD_PREPARATION_MANAGER_SALARY_NGN,
} from '@/lib/food-preparation-manager'
export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  const admin=await getAuthUser(request)
  if(!admin||admin.role!=='admin')return NextResponse.json({success:false,error:'Administration only'},{status:403})
  try{
    await ensureFoodPreparationManagerSchema()
    await ensurePreparationOrderSources()
    const [staff,orders,ca]=await Promise.all([
      getPool().query(`
        SELECT m.id,m.agent_id,m.status,m.application_note,m.review_note,
          m.monthly_salary_ngn,m.reviewed_at,m.created_at,
          u.name,u.username,u.email,u.is_active,u.role
        FROM weave_food_preparation_managers m
        JOIN users u ON u.id=m.agent_id
        ORDER BY CASE WHEN m.status='pending' THEN 0 WHEN m.status='approved' THEN 1 ELSE 2 END,
          m.updated_at DESC LIMIT 100
      `),
      getPool().query(`
        SELECT o.id,o.variant_id,o.fulfillment_status AS stage,o.payment_status,
          o.package_count,o.delivery_address AS destination,u.name AS buying_agent,
          CASE WHEN o.variant_id IN ('electrolyte','electrolyte-medium') THEN 'electrolyte' WHEN o.variant_id IN ('ember-small','ember-large') THEN 'ember' ELSE 'agility' END AS product,
          t.manager_id,t.id AS task_id
        FROM agility_stock_orders o
        LEFT JOIN weave_food_preparation_tasks t ON t.source_order_id=o.id
          AND t.product=CASE WHEN o.variant_id IN ('electrolyte','electrolyte-medium') THEN 'electrolyte' WHEN o.variant_id IN ('ember-small','ember-large') THEN 'ember' ELSE 'agility' END
        LEFT JOIN users u ON u.id=o.agent_id
        WHERE o.payment_status='paid'
          AND o.fulfillment_status IN ('paid','heating','packed','boxed','preparing')
        ORDER BY o.created_at DESC LIMIT 100
      `),
      getPool().query(`
        SELECT c.id,c.cake_type AS variant_id,c.status AS stage,c.payment_status,
          c.customer_name,c.delivery_location AS destination,c.event_date,c.preparation_released_at,
          'daisy'::text AS product,
          t.manager_id,t.id AS task_id,u.name AS buying_agent
        FROM carrier_cake_orders c
        LEFT JOIN weave_food_preparation_tasks t ON t.product='daisy' AND t.source_order_id=c.id
        LEFT JOIN users u ON u.id=c.agent_id
        WHERE c.payment_status='paid' AND c.status IN ('paid','preparing','ready')
        ORDER BY c.event_date ASC,c.created_at DESC LIMIT 100
      `),
    ])
    return NextResponse.json({success:true,monthlySalaryNgn:FOOD_PREPARATION_MANAGER_SALARY_NGN,
      applications:staff.rows,orders:[...orders.rows,...ca.rows]},
      {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[admin preparation] GET',error);return NextResponse.json({success:false,error:'Unable to load preparation staffing'},{status:500})}
}

export async function PATCH(request:NextRequest){
  const admin=await getAuthUser(request)
  if(!admin||admin.role!=='admin')return NextResponse.json({success:false,error:'Administration only'},{status:403})
  try{
    const body=await request.json().catch(()=>({}))
    const action=body.action
    await ensureFoodPreparationManagerSchema()
    if(action==='review'){
      const appointmentId=body.appointmentId
      const decision=body.decision
      const note=typeof body.reviewNote==='string'?body.reviewNote.trim():''
      if(!validUuid(appointmentId)||!['approved','rejected','revoked'].includes(decision)||note.length<15||note.length>2000)
        return NextResponse.json({success:false,error:'Appointment, decision and review reason (15–2000 characters) required.'},{status:400})
      const {rows}=await getPool().query(`
        UPDATE weave_food_preparation_managers m
        SET status=$1,review_note=$2,reviewed_by=$3::uuid,reviewed_at=NOW(),updated_at=NOW()
        FROM users u
        WHERE m.id=$4::uuid AND m.agent_id=u.id
          AND (($1 IN ('approved','rejected') AND m.status='pending' AND u.role='agent' AND u.is_active)
               OR ($1='revoked' AND m.status='approved'))
        RETURNING m.id,m.agent_id,m.status
      `,[decision,note,admin.id,appointmentId])
      if(!rows.length)return NextResponse.json({success:false,error:'Appointment was already decided or Agent is not eligible.'},{status:409})
      return NextResponse.json({success:true,appointment:rows[0]})
    }
    if(action==='assign'){
      const managerId=body.managerId
      const product=body.product
      const orderId=body.orderId
      if(!validUuid(managerId)||!validUuid(orderId)||!isPreparationProduct(product))
        return NextResponse.json({success:false,error:'Approved manager, product and source order required.'},{status:400})
      const {rows:people}=await getPool().query(`
        SELECT m.id,m.agent_id FROM weave_food_preparation_managers m
        JOIN users u ON u.id=m.agent_id
        WHERE m.id=$1::uuid AND m.status='approved' AND u.role='agent' AND u.is_active=true LIMIT 1
      `,[managerId])
      if(!people.length)return NextResponse.json({success:false,error:'Assign only an approved, active Agent manager.'},{status:403})
      const access=await getLifestyleAccess(people[0].agent_id)
      if(!access.active)return NextResponse.json({success:false,error:'The selected manager no longer has active Lifestyle access.'},{status:403})
      await ensurePreparationOrderSources()
      const order=await getPreparationSourceOrder(product,orderId)
      if(!order||order.payment_status!=='paid')
        return NextResponse.json({success:false,error:'Only a verified paid source order may be assigned.'},{status:409})
      if(product==='daisy'&&!order.preparation_released_at)
        return NextResponse.json({success:false,error:'Administration must confirm the Daisy Pastries payment for kitchen preparation first.'},{status:409})
      const status=String(product==='daisy'?order.status:order.fulfillment_status)
      if(!preparationNextStage(product,status))
        return NextResponse.json({success:false,error:'This order has no unfinished preparation/dispatch step.'},{status:409})
      const client=await getPool().connect()
      let committed=false
      try{
        await client.query('BEGIN')
        const {rows:before}=await client.query(`
          SELECT manager_id FROM weave_food_preparation_tasks
          WHERE product=$1 AND source_order_id=$2::uuid FOR UPDATE
        `,[product,orderId])
        const priorManager=String(before[0]?.manager_id||'')
        const {rows}=await client.query(`
          INSERT INTO weave_food_preparation_tasks(manager_id,product,source_order_id,assigned_by)
          VALUES($1::uuid,$2,$3::uuid,$4::uuid)
          ON CONFLICT (product,source_order_id) DO UPDATE
            SET manager_id=EXCLUDED.manager_id,assigned_by=EXCLUDED.assigned_by,
              assigned_at=NOW(),updated_at=NOW()
          RETURNING id,manager_id,product,source_order_id,assigned_at
        `,[managerId,product,orderId,admin.id])
        if(priorManager!==managerId){
          await notifyManualFoodPreparationAssignment(
            client,String(people[0].agent_id),admin.id,product,order,String(rows[0].id)
          )
          if(priorManager){
            await client.query(`
              INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)
              SELECT m.agent_id,'food_preparation_reassigned','Preparation task reassigned',
                $1,$2::uuid,'WEAVE Administration','/weave/lifestyles/food-preparation'
              FROM weave_food_preparation_managers m WHERE m.id=$3::uuid
            `,['Your '+product+' order '+orderId+' has been reassigned. Please do not prepare or dispatch it.',admin.id,priorManager])
          }
        }
        await client.query('COMMIT');committed=true
        return NextResponse.json({success:true,task:rows[0],
          message:priorManager===managerId?'Order remains assigned to this manager.':'Approved Food Preparation Manager notified with the order location and delivery instructions.'})
      }catch(error){
        if(!committed)await client.query('ROLLBACK').catch(()=>{})
        throw error
      }finally{client.release()}
    }
    return NextResponse.json({success:false,error:'Select a supported staffing action.'},{status:400})
  }catch(error){console.error('[admin preparation] PATCH',error);return NextResponse.json({success:false,error:'Unable to update Food Preparation Manager staffing.'},{status:500})}
}
