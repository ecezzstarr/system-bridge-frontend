import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool,sql } from '@/lib/db'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import { getActiveLegionEmployment } from '@/lib/legion-employment'
import { ensureFoodDistributionEmploymentSchema,getFoodDistributionEmployment } from '@/lib/food-distribution-employment'

export const dynamic='force-dynamic'
export async function GET(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Authentication required'},{status:401})
  if(user.role!=='agent')return NextResponse.json({success:false,error:'Food Distribution employment is an Agent Department position.'},{status:403})
  try {
    const access=await getLifestyleAccess(user.id)
    const legion=await getActiveLegionEmployment(sql,user.id)
    const [appointment,managers]=await Promise.all([
      getFoodDistributionEmployment(user.id),
      (async()=>{await ensureFoodDistributionEmploymentSchema();const {rows}=await getPool().query(`
        SELECT e.user_id,u.name FROM weave_food_distribution_employment e JOIN users u ON u.id=e.user_id
        WHERE e.position='manager' AND e.status='approved' AND u.is_active=true ORDER BY u.name LIMIT 100
      `);return rows})(),
    ])
    return NextResponse.json({success:true,eligible:access.active&&!legion.active,appointment,managers,
      monthlyDistributionTarget:200, message:!access.active?'An active Agent position is required.':legion.active?'Exclusive Legion service temporarily suspends other employment.':undefined},
      {headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    console.error('[food distribution employment] state failed',error)
    return NextResponse.json({success:false,error:'Unable to load Food Distribution employment.'},{status:500})
  }
}
export async function POST(request:NextRequest) {
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Authentication required'},{status:401})
  if(user.role!=='agent')return NextResponse.json({success:false,error:'Only Agents can apply for Food Distribution employment.'},{status:403})
  const body=await request.json().catch(()=>({}))
  const position=body.position
  const note=typeof body.applicationNote==='string'?body.applicationNote.trim():''
  const managerUserId=typeof body.managerUserId==='string'?body.managerUserId:null
  if(!['manager','assistant'].includes(position)||note.length<30||note.length>2000)
    return NextResponse.json({success:false,error:'Choose a position and provide 30–2,000 characters describing your food distribution plan.'},{status:400})
  const access=await getLifestyleAccess(user.id)
  const legion=await getActiveLegionEmployment(sql,user.id)
  if(!access.active||legion.active)return NextResponse.json({success:false,error:'An active Agent position without exclusive Legion service is required.'},{status:403})
  await ensureFoodDistributionEmploymentSchema()
  const pool=getPool()
  const client=await pool.connect()
  try {
    await client.query('BEGIN')
    const {rows:existing}=await client.query('SELECT status FROM weave_food_distribution_employment WHERE user_id=$1::uuid FOR UPDATE',[user.id])
    if(existing.length&&['pending','approved'].includes(existing[0].status)){
      await client.query('ROLLBACK')
      return NextResponse.json({success:false,error:'An application or appointment is already active.'},{status:409})
    }
    let supervisor=null
    if(position==='assistant'){
      if(!managerUserId){await client.query('ROLLBACK');return NextResponse.json({success:false,error:'Select an approved Food Distribution Manager.'},{status:400})}
      const {rows}=await client.query(`SELECT e.user_id FROM weave_food_distribution_employment e JOIN users u ON u.id=e.user_id WHERE e.user_id=$1::uuid AND e.position='manager' AND e.status='approved' AND u.is_active=true`,[managerUserId])
      if(!rows.length){await client.query('ROLLBACK');return NextResponse.json({success:false,error:'Selected Food Distribution Manager is not active.'},{status:400})}
      supervisor=rows[0].user_id
    }
    const {rows}=await client.query(`
      INSERT INTO weave_food_distribution_employment(user_id,position,status,application_note,manager_user_id,administration_note,reviewed_by,reviewed_at,hired_at,created_at,updated_at)
      VALUES($1::uuid,$2,'pending',$3,$4::uuid,NULL,NULL,NULL,NULL,NOW(),NOW())
      ON CONFLICT(user_id) DO UPDATE SET position=EXCLUDED.position,status='pending',application_note=EXCLUDED.application_note,
        manager_user_id=EXCLUDED.manager_user_id,administration_note=NULL,reviewed_by=NULL,reviewed_at=NULL,hired_at=NULL,updated_at=NOW()
      WHERE weave_food_distribution_employment.status IN ('rejected','ended')
      RETURNING user_id,position,status,application_note,manager_user_id,created_at
    `,[user.id,position,note,supervisor])
    if(!rows.length){await client.query('ROLLBACK');return NextResponse.json({success:false,error:'An active application already exists.'},{status:409})}
    await client.query('COMMIT')
    try {
      await pool.query(\`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
        SELECT id,'food_distribution_employment','Food Distribution application awaiting review',
          $1,'WEAVE Employment','/admin/food-distribution-employment'
        FROM users WHERE role='admin' AND is_active=true\`,[
          'An Agent submitted a '+(position==='manager'?'Food Distribution Manager':'Assistant Food Distribution Manager')+' application. Open the Administration review desk to verify eligibility and decide the appointment.'
        ])
    } catch(error) { console.error('[food distribution employment] Administration alert failed',error) }
    return NextResponse.json({success:true,appointment:rows[0]},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    try{await client.query('ROLLBACK')}catch{}
    console.error('[food distribution employment] application failed',error)
    return NextResponse.json({success:false,error:'Could not record application.'},{status:500})
  }finally{client.release()}
}
