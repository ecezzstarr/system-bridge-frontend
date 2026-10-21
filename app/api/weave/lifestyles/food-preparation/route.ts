import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import {
  ensureFoodPreparationManagerSchema,FOOD_PREPARATION_MANAGER_TITLE,
  FOOD_PREPARATION_DUTIES,FOOD_PREPARATION_WORKFLOW,
  FOOD_PREPARATION_CAPACITY,isFoodPreparationPosition,foodPreparationSalary,
  getActiveFoodPreparationManager,ensurePreparationOrderSources,
  moveAssignedPreparationStage,PreparationAccessError,preparationNextStage,validUuid,
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
    if(access.active&&appointment?.status==='approved'){
      await ensurePreparationOrderSources()
      const {rows}=await getPool().query(`
        SELECT t.id,t.product,t.source_order_id,t.assigned_at,
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
        LEFT JOIN agility_stock_orders s
          ON t.product IN ('agility','electrolyte','ember') AND s.id=t.source_order_id
        LEFT JOIN carrier_cake_orders c
          ON t.product='daisy' AND c.id=t.source_order_id
        LEFT JOIN users u ON u.id=COALESCE(s.agent_id,c.agent_id)
        WHERE t.manager_id=$1::uuid ORDER BY t.assigned_at DESC LIMIT 100
      `,[appointment.id])
      tasks=rows.map(row=>({
        ...row,next_stage:preparationNextStage(row.product,row.stage),
      }))
    }
    return NextResponse.json({
      success:true,title:FOOD_PREPARATION_MANAGER_TITLE,
      payrollStatus:'employment_terms_only_no_automatic_payment',
      duties:FOOD_PREPARATION_DUTIES,workflow:FOOD_PREPARATION_WORKFLOW,
      eligible:access.active,appointment,openings,tasks,
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
    await ensureFoodPreparationManagerSchema()
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
        return NextResponse.json({success:false,error:position==='manager'?'The single Food Preparation Manager application place is occupied.':'All five Assistant Food Preparation Manager application places are occupied.'},{status:409})
      }
      const {rows}=await client.query(`
        INSERT INTO weave_food_preparation_managers(agent_id,position,application_note,monthly_salary_ngn)
        VALUES($1::uuid,$2,$3,$4)
        ON CONFLICT (agent_id) DO UPDATE SET
          position=EXCLUDED.position,application_note=EXCLUDED.application_note,
          monthly_salary_ngn=EXCLUDED.monthly_salary_ngn,status='pending',
          review_note=NULL,reviewed_by=NULL,reviewed_at=NULL,updated_at=NOW()
        WHERE weave_food_preparation_managers.status IN ('rejected','revoked')
        RETURNING id,status,position,monthly_salary_ngn,created_at
      `,[user.id,position,note,foodPreparationSalary(position)])
      if(!rows.length){
        await client.query('ROLLBACK')
        return NextResponse.json({success:false,error:'You already have an active food preparation application.'},{status:409})
      }
      await client.query('COMMIT')
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
    await getActiveFoodPreparationManager(user)
    const body=await request.json().catch(()=>({}))
    const taskId=body.taskId
    const stage=body.stage
    const note=typeof body.note==='string'?body.note.trim():''
    if(!validUuid(taskId)||typeof stage!=='string')return NextResponse.json({success:false,error:'Task and stage required'},{status:400})
    const result=await moveAssignedPreparationStage(user.id,taskId,stage,note)
    return NextResponse.json({success:true,handoff:result,
      message:'Work stage recorded. Final delivery and receipt confirmation remain with Administration and receiving Agent/customer.'})
  }catch(error){console.error('[food preparation lifestyle] PATCH',error);return errorResponse(error)}
}
