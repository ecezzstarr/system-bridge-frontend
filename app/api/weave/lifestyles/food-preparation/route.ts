import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { notifyAdministrationOfCompanyApplication } from '@/lib/employment-application-notifications'
import { ensureWeaveEmploymentLifecycleSchema } from '@/lib/weave-employment-lifecycle'
import { getPool } from '@/lib/db'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import { notifyManualFoodPreparationAssignment } from '@/lib/food-preparation-routing'
import {
  ensureFoodPreparationManagerSchema,FOOD_PREPARATION_MANAGER_TITLE,
  FOOD_PREPARATION_DUTIES,FOOD_PREPARATION_WORKFLOW,
  FOOD_PREPARATION_CAPACITY,isFoodPreparationPosition,foodPreparationSalary,
  getActiveFoodPreparationManager,ensurePreparationOrderSources,
  moveAssignedPreparationStage,PreparationAccessError,preparationNextStage,validUuid,isPreparationProduct,
} from '@/lib/food-preparation-manager'

export const dynamic='force-dynamic'
const errorResponse=(error:unknown)=>error instanceof PreparationAccessError?
  NextResponse.json({success:false,error:error.message},{status:error.status}):
  NextResponse.json({success:false,error:'Food Preparation Manager service unavailable'},{status:500})

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='agent')return NextResponse.json({success:false,error:'Active Agent position required'},{status:403})
  try{
    const access=await getLifestyleAccess(user.id)
    await ensureFoodPreparationManagerSchema()
    const {rows:positions}=await getPool().query(`
      SELECT id,status,position,application_note,monthly_salary_ngn,review_note,reviewed_at,created_at
      FROM weave_food_preparation_managers WHERE agent_id=$1::uuid LIMIT 1
    `,[user.id])
    const appointment=positions[0]||null
    const {rows:capacityRows}=await getPool().query(`
      SELECT position,COUNT(*)::int AS taken
      FROM weave_food_preparation_managers
      WHERE status IN ('pending','approved')
      GROUP BY position
    `)
    const occupied=Object.fromEntries(capacityRows.map(row=>[row.position,Number(row.taken)]))
    const openings={
      manager:{capacity:FOOD_PREPARATION_CAPACITY.manager,remaining:Math.max(0,FOOD_PREPARATION_CAPACITY.manager-(occupied.manager||0))},
      assistant:{capacity:FOOD_PREPARATION_CAPACITY.assistant,remaining:Math.max(0,FOOD_PREPARATION_CAPACITY.assistant-(occupied.assistant||0))},
    }
    let tasks:any[]=[]
    let team:any[]=[]
    const isLead=access.active&&appointment?.status==='approved'&&appointment.position==='manager'
    if(isLead){
      const {rows}=await getPool().query(`
        SELECT m.id,m.agent_id,m.position,u.name,u.username
        FROM weave_food_preparation_managers m
        JOIN users u ON u.id=m.agent_id
        WHERE m.position='assistant' AND m.status='approved'
          AND u.role='agent' AND u.is_active=true
        ORDER BY m.reviewed_at ASC LIMIT 2
      `)
      team=rows
    }
    if(access.active&&appointment?.status==='approved'){
      await ensurePreparationOrderSources()
      const {rows}=await getPool().query(`
        SELECT t.id,t.product,t.source_order_id,t.assigned_at,
          t.manager_id AS assigned_appointment_id, assigned_m.position AS assigned_position,
          assigned_u.name AS assigned_staff_name,
          COALESCE(s.payment_status,c.payment_status) AS payment_status,
          COALESCE(s.fulfillment_status,c.status) AS stage,
          COALESCE(s.variant_id,c.cake_type) AS item,
          COALESCE(s.package_count,1) AS package_count,
          COALESCE(s.delivery_address,c.delivery_location) AS delivery_location,
          COALESCE(s.delivery_phone,c.customer_phone) AS delivery_phone,
          c.customer_name,c.occasion,c.size_option,c.event_date,
          u.name AS purchasing_agent,
          (SELECT COUNT(*)::int FROM weave_food_preparation_task_events e WHERE e.task_id=t.id) AS recorded_handoffs
        FROM weave_food_preparation_tasks t
        JOIN weave_food_preparation_managers assigned_m ON assigned_m.id=t.manager_id
        JOIN users assigned_u ON assigned_u.id=assigned_m.agent_id
        LEFT JOIN agility_stock_orders s
          ON t.product IN ('agility','electrolyte','ember') AND s.id=t.source_order_id
        LEFT JOIN carrier_cake_orders c
          ON t.product='daisy' AND c.id=t.source_order_id
        LEFT JOIN users u ON u.id=COALESCE(s.agent_id,c.agent_id)
        WHERE (t.manager_id=$1::uuid OR ($2::boolean AND (assigned_m.position='assistant' OR assigned_m.status<>'approved')))
        ORDER BY t.assigned_at DESC LIMIT 100
      `,[appointment.id,isLead])
      tasks=rows.map(row=>({
        ...row,next_stage:preparationNextStage(row.product,row.stage),
      }))
    }
    return NextResponse.json({
      success:true,title:FOOD_PREPARATION_MANAGER_TITLE,
      salaryNgn:appointment ? Number(appointment.monthly_salary_ngn) : null,
      payrollStatus:'employment_terms_only_no_automatic_payment',
      duties:FOOD_PREPARATION_DUTIES,workflow:FOOD_PREPARATION_WORKFLOW,
      eligible:access.active,appointment,openings,tasks,team,isLead,
    },{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[food preparation lifestyle] GET',error);return errorResponse(error)}
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='agent')return NextResponse.json({success:false,error:'Only active Agents can apply for food preparation positions.'},{status:403})
  try{
    const access=await getLifestyleAccess(user.id)
    if(!access.active)return NextResponse.json({success:false,error:'Active Agent standing is required before applying.'},{status:403})
    const body=await request.json().catch(()=>({}))
    const position=body.position
    if(!isFoodPreparationPosition(position))return NextResponse.json({success:false,error:'Choose Food Preparation Manager or Assistant Food Preparation Manager.'},{status:400})
    const note=typeof body.applicationNote==='string'?body.applicationNote.trim():''
    if(note.length<40||note.length>2000)return NextResponse.json({success:false,error:'Describe your food preparation, hygiene, packaging, availability and delivery experience in 40–2000 characters.'},{status:400})
    await ensureWeaveEmploymentLifecycleSchema()
    const client=await getPool().connect()
    try{
      await client.query('BEGIN')
      // Serialize capacity decisions across applicants and Administration.
      await client.query('SELECT pg_advisory_xact_lock(20261021, 51)')
      const {rows:existing}=await client.query(`
        SELECT id,status FROM weave_food_preparation_managers
        WHERE agent_id=$1::uuid FOR UPDATE
      `,[user.id])
      if(existing[0]&&['pending','approved'].includes(existing[0].status)){
        await client.query('ROLLBACK')
        return NextResponse.json({success:false,error:'You already have a pending or approved food preparation position.'},{status:409})
      }
      const {rows:counts}=await client.query(`
        SELECT COUNT(*)::int AS taken FROM weave_food_preparation_managers
        WHERE position=$1 AND status IN ('pending','approved')
      `,[position])
      if(Number(counts[0].taken)>=FOOD_PREPARATION_CAPACITY[position]){
        await client.query('ROLLBACK')
        return NextResponse.json({success:false,error:position==='manager'?'The single Food Preparation Manager application place is occupied.':'Both Assistant Food Preparation Manager application places are occupied.'},{status:409})
      }
      const {rows}=await client.query(`
        INSERT INTO weave_food_preparation_managers(agent_id,position,application_note,monthly_salary_ngn)
        VALUES($1::uuid,$2,$3,$4)
        ON CONFLICT (agent_id) DO UPDATE SET
          position=EXCLUDED.position,application_note=EXCLUDED.application_note,
          monthly_salary_ngn=EXCLUDED.monthly_salary_ngn,status='pending',
          review_note=NULL,reviewed_by=NULL,reviewed_at=NULL,exit_kind=NULL,exit_reason=NULL,exited_at=NULL,exited_by=NULL,updated_at=NOW()
        WHERE weave_food_preparation_managers.status IN ('rejected','revoked')
        RETURNING id,status,position,monthly_salary_ngn,created_at
      `,[user.id,position,note,foodPreparationSalary(position)])
      if(!rows.length){
        await client.query('ROLLBACK')
        return NextResponse.json({success:false,error:'You already have an active food preparation application.'},{status:409})
      }
      await client.query('COMMIT')
      try {
        await notifyAdministrationOfCompanyApplication({
          kind:'food_preparation',applicationId:String(rows[0].id),applicantId:user.id,
          positionTitle:position==='manager'?'Food Preparation Manager':'Assistant Food Preparation Manager',
          name:String(user.name||'Agent applicant'),applicationNote:note,
        })
      } catch (notificationError) {
        console.error('[food preparation] Administration application alert failed',notificationError)
      }
      return NextResponse.json({
        success:true,appointment:rows[0],
        message:`Application sent to Administration. The ₦${foodPreparationSalary(position).toLocaleString('en-NG')} monthly salary applies only after approval and is not an automatic wallet payment.`,
      },{status:201})
    }catch(error){
      await client.query('ROLLBACK').catch(()=>{})
      throw error
    }finally{client.release()}
  }catch(error){console.error('[food preparation lifestyle] POST',error);return errorResponse(error)}
}

export async function PATCH(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='agent')return NextResponse.json({success:false,error:'Agent position required'},{status:403})
  try{
    const appointment=await getActiveFoodPreparationManager(user)
    const body=await request.json().catch(()=>({}))
    if(body.action==='assign'){
      if(appointment.position!=='manager')throw new PreparationAccessError('Only the WEAVE Stability Lead Manager can assign food preparation work.')
      const taskId=body.taskId
      const nextAssigneeId=body.assigneeId
      const note=typeof body.note==='string'?body.note.trim():''
      if(!validUuid(taskId)||!validUuid(nextAssigneeId)||note.length<12||note.length>800)
        throw new PreparationAccessError('Task, approved assistant and assignment reason (12–800 characters) required.',400)
      await ensurePreparationOrderSources()
      const client=await getPool().connect()
      try{
        await client.query('BEGIN')
        const {rows:targets}=await client.query(`
          SELECT m.id,m.agent_id,m.position
          FROM weave_food_preparation_managers m
          JOIN users u ON u.id=m.agent_id
          WHERE m.id=$1::uuid AND m.status='approved'
            AND m.position IN ('manager','assistant')
            AND u.role='agent' AND u.is_active=true LIMIT 1
        `,[nextAssigneeId])
        const target=targets[0]
        if(!target||(target.position==='manager'&&target.id!==appointment.id))
          throw new PreparationAccessError('Choose yourself or an approved active Stability assistant.',403)
        const entitlement=await getLifestyleAccess(target.agent_id)
        if(!entitlement.active)throw new PreparationAccessError('The selected assistant does not have active Agent standing.',403)
        const {rows:tasks}=await client.query(`
          SELECT t.id,t.product,t.source_order_id,t.manager_id,old.position AS former_position,old.status AS former_status,old.agent_id AS former_agent_id
          FROM weave_food_preparation_tasks t
          JOIN weave_food_preparation_managers old ON old.id=t.manager_id
          WHERE t.id=$1::uuid FOR UPDATE OF t
        `,[taskId])
        const task=tasks[0]
        if(!task||!isPreparationProduct(task.product)||
          !(task.manager_id===appointment.id||task.former_position==='assistant'||task.former_status!=='approved'))
          throw new PreparationAccessError('This food order is not part of your Stability team.',403)
        const {rows:orders}=task.product==='daisy'
          ?await client.query('SELECT * FROM carrier_cake_orders WHERE id=$1::uuid FOR UPDATE',[task.source_order_id])
          :await client.query('SELECT * FROM agility_stock_orders WHERE id=$1::uuid FOR UPDATE',[task.source_order_id])
        const order=orders[0]
        if(!order||order.payment_status!=='paid'||(task.product==='daisy'&&!order.preparation_released_at))
          throw new PreparationAccessError('Only verified, Administration-released food can be assigned.',409)
        const status=String(task.product==='daisy'?order.status:order.fulfillment_status)
        if(!preparationNextStage(task.product,status))
          throw new PreparationAccessError('This order has no unfinished preparation/dispatch step.',409)
        if(task.manager_id===target.id){
          await client.query('COMMIT')
          return NextResponse.json({success:true,message:'This order is already assigned to the selected staff member.'})
        }
        const {rows:updated}=await client.query(`
          UPDATE weave_food_preparation_tasks
          SET manager_id=$1::uuid,assigned_by=$2::uuid,assigned_at=NOW(),updated_at=NOW()
          WHERE id=$3::uuid RETURNING id,product,source_order_id,manager_id
        `,[target.id,user.id,task.id])
        await client.query(`
          INSERT INTO weave_food_preparation_assignment_events
            (task_id,from_manager_id,to_manager_id,assigned_by_agent_id,note)
          VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5)
        `,[task.id,task.manager_id,target.id,user.id,note])
        await notifyManualFoodPreparationAssignment(
          client,String(target.agent_id),user.id,task.product,order,String(task.id)
        )
        await client.query(`
          INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)
          VALUES($1::uuid,'food_preparation_reassigned','Preparation task reassigned',
            $2,$3::uuid,'WEAVE Stability Lead','/weave/lifestyles/food-preparation')
        `,[task.former_agent_id,
          'Your '+task.product+' order '+task.source_order_id+' was reassigned by the Stability Lead. Do not prepare or dispatch it.',user.id])
        await client.query('COMMIT')
        return NextResponse.json({success:true,task:updated[0],message:'Stability Lead assigned this verified order and notified the selected staff member.'})
      }catch(error){
        await client.query('ROLLBACK').catch(()=>{})
        throw error
      }finally{client.release()}
    }
    const taskId=body.taskId
    const stage=body.stage
    const note=typeof body.note==='string'?body.note.trim():''
    if(!validUuid(taskId)||typeof stage!=='string')return NextResponse.json({success:false,error:'Task and stage required'},{status:400})
    const result=await moveAssignedPreparationStage(user.id,taskId,stage,note)
    return NextResponse.json({success:true,handoff:result,
      message:'Work stage recorded. Final delivery and receipt confirmation remain with the receiving Agent/customer.'})
  }catch(error){console.error('[food preparation lifestyle] PATCH',error);return errorResponse(error)}
}
