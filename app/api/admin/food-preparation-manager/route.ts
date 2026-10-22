import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { FOOD_ADMIN_PER_PACKAGE_NGN } from '@/lib/food-forensic-settlement'
import { exitWeaveEmployment } from '@/lib/weave-employment-lifecycle'
import {
  ensureFoodPreparationManagerSchema,validUuid,
  FOOD_PREPARATION_MANAGER_SALARY_NGN,FOOD_PREPARATION_ASSISTANT_SALARY_NGN,FOOD_PREPARATION_CAPACITY,
} from '@/lib/food-preparation-manager'
export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
  const admin=await getAuthUser(request)
  if(!admin||admin.role!=='admin')return NextResponse.json({success:false,error:'Administration only'},{status:403})
  try{
    await ensureFoodPreparationManagerSchema()
    const [staff,allocations]=await Promise.all([
      getPool().query(`
        SELECT m.id,m.agent_id,m.status,m.application_note,m.review_note,
          m.position,m.monthly_salary_ngn,m.reviewed_at,m.created_at,
          u.name,u.username,u.email,u.is_active,u.role
        FROM weave_food_preparation_managers m
        JOIN users u ON u.id=m.agent_id
        ORDER BY CASE WHEN m.status='pending' THEN 0 WHEN m.status='approved' THEN 1 ELSE 2 END,
          m.updated_at DESC LIMIT 100
      `),
      getPool().query(`
        SELECT COUNT(*)::int AS order_count,
               COALESCE(SUM(administration_ngn),0)::numeric AS allocated_ngn,
               COALESCE(SUM(package_count),0)::int AS package_count,
               COALESCE(SUM(received_ngn),0)::numeric AS verified_stock_funds_ngn
        FROM weave_food_forensic_stock_splits
      `),
    ])
    return NextResponse.json({
      success:true,monthlySalaryNgn:FOOD_PREPARATION_MANAGER_SALARY_NGN,
      assistantSalaryNgn:FOOD_PREPARATION_ASSISTANT_SALARY_NGN,
      capacities:FOOD_PREPARATION_CAPACITY,applications:staff.rows,
      administrationFeeNgn:FOOD_ADMIN_PER_PACKAGE_NGN,
      allocation:allocations.rows[0],
      allocationStatus:'recorded_not_automatically_disbursed',
    },{headers:{'Cache-Control':'private, no-store'}})
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
      if(decision==='revoked'){
        const {rows:matches}=await getPool().query(
          'SELECT agent_id FROM weave_food_preparation_managers WHERE id=$1::uuid AND status=\'approved\'', [appointmentId])
        if(!matches.length)return NextResponse.json({success:false,error:'This approved appointment is no longer active.'},{status:409})
        const outcome=await exitWeaveEmployment('food_preparation',String(matches[0].agent_id),
          {id:admin.id,role:admin.role},'fire',note)
        if(!outcome.success)return NextResponse.json({success:false,error:'Employment could not be terminated.'},{status:409})
        return NextResponse.json({success:true,appointment:{id:appointmentId,agent_id:matches[0].agent_id,status:'revoked'},assignedOrdersToReview:outcome.assignedFoodOrdersToReview})
      }
      const client=await getPool().connect()
      try{
        await client.query('BEGIN')
        await client.query('SELECT pg_advisory_xact_lock(20261021, 51)')
        const {rows:people}=await client.query(`
          SELECT m.id,m.agent_id,m.status,m.position,u.role,u.is_active
          FROM weave_food_preparation_managers m
          JOIN users u ON u.id=m.agent_id
          WHERE m.id=$1::uuid FOR UPDATE OF m
        `,[appointmentId])
        const person=people[0]
        const eligible=person&&(
          decision==='revoked'?person.status==='approved':
          person.status==='pending'&&person.role==='agent'&&person.is_active
        )
        if(!eligible){
          await client.query('ROLLBACK')
          return NextResponse.json({success:false,error:'Appointment was already decided or Agent is not eligible.'},{status:409})
        }
        if(decision==='approved'){
          const {rows:approved}=await client.query(`
            SELECT COUNT(*)::int AS total
            FROM weave_food_preparation_managers
            WHERE position=$1 AND status='approved'
          `,[person.position])
          const capacity=FOOD_PREPARATION_CAPACITY[person.position as keyof typeof FOOD_PREPARATION_CAPACITY]
          if(Number(approved[0].total)>=capacity){
            await client.query('ROLLBACK')
            return NextResponse.json({success:false,error:'This kitchen position is already fully staffed.'},{status:409})
          }
        }
        const {rows}=await client.query(`
          UPDATE weave_food_preparation_managers
          SET status=$1,review_note=$2,reviewed_by=$3::uuid,reviewed_at=NOW(),updated_at=NOW()
          WHERE id=$4::uuid RETURNING id,agent_id,status,position
        `,[decision,note,admin.id,appointmentId])
        await client.query('COMMIT')
        return NextResponse.json({success:true,appointment:rows[0]})
      }catch(error){
        await client.query('ROLLBACK').catch(()=>{})
        throw error
      }finally{client.release()}
    }
    return NextResponse.json({success:false,error:'Select a supported staffing action.'},{status:400})
  }catch(error){console.error('[admin preparation] PATCH',error);return NextResponse.json({success:false,error:'Unable to update Food Preparation Manager staffing.'},{status:500})}
}
