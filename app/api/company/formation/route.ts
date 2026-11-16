import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool} from '@/lib/db'
import {getGuidanceStaffDepartments,isGuidanceDepartment,type GuidanceDepartment} from '@/lib/weave-guidance-departments'
import {ensureCompanyFormationSchema,syncFormationOwnership,backfillClientFormations,formationIncome,FORMATION_MILESTONES} from '@/lib/company-formation-movement'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Authorization'}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const clean=(value:unknown,max=2000)=>typeof value==='string'?value.trim().slice(0,max):''
type Identity={id:string;role:string}
async function identity(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return null
  if(user.role==='admin'||user.role==='client')return {id:user.id,role:user.role,departments:[] as GuidanceDepartment[]}
  if(!['agent','bridger'].includes(user.role))return null
  const departments=await getGuidanceStaffDepartments(user)
  return departments.length?{id:user.id,role:user.role,departments}:null
}
async function selectedCase(id:string,actor:Identity){
  const {rows}=await getPool().query(`SELECT c.id,c.source_kind,c.source_id,c.client_id,c.file_number,
    c.purchase_value_system_switch,c.bridger_id,c.stage,c.business_brief,c.first_customer,
    c.first_offer,c.next_action,c.created_at,c.verified_at,c.activated_at,c.updated_at
    FROM weave_company_formation_cases c
    WHERE c.id=$1::uuid
      AND ($2::text<>'client' OR c.client_id=$3::uuid) LIMIT 1`,[id,actor.role,actor.id])
  return rows[0]||null
}
const anyStaff=(actor:{role:string;departments:GuidanceDepartment[]})=>
  actor.role==='admin'||actor.departments.length>0

export async function GET(request:NextRequest){
  try{
    const actor=await identity(request)
    if(!actor)return NextResponse.json({error:'An authorized Client or approved guidance appointment is required'},{status:403,headers})
    await ensureCompanyFormationSchema()
    if(actor.role==='client')await backfillClientFormations(actor.id)
    await syncFormationOwnership()
    const pool=getPool()
    const {rows:cases}=await pool.query(`SELECT c.id,c.source_kind,c.source_id,c.client_id,c.file_number,
      c.purchase_value_system_switch,c.stage,c.created_at,c.verified_at,c.activated_at,
      c.business_brief IS NOT NULL AS has_brief,
      (SELECT COUNT(*)::int FROM weave_company_formation_actions a WHERE a.case_id=c.id) AS action_count
      FROM weave_company_formation_cases c
      WHERE ($1::text<>'client' OR c.client_id=$2::uuid)
      ORDER BY c.created_at DESC LIMIT 100`,[actor.role,actor.id])
    const requested=request.nextUrl.searchParams.get('caseId')||''
    const caseId=uuid.test(requested)?requested:cases[0]?.id
    let selected=null,actions:unknown[]=[],income=null
    if(caseId){
      selected=await selectedCase(String(caseId),actor)
      if(!selected&&requested)return NextResponse.json({error:'Formation case not found or unavailable'},{status:404,headers})
      if(selected){
        const {rows}=await pool.query(`SELECT id,case_id,department,action_type,month_no,note,
          visibility,created_at FROM weave_company_formation_actions
          WHERE case_id=$1::uuid AND ($2::text<>'client' OR visibility='client')
          ORDER BY created_at ASC LIMIT 250`,[selected.id,actor.role])
        actions=rows
        income=await formationIncome(selected)
      }
    }
    let events:unknown[]=[]
    if(anyStaff(actor)){
      const {rows}=await pool.query(`SELECT e.id,e.kind,e.source_kind,e.source_id,
        e.formation_case_id,e.created_at FROM weave_company_formation_events e
        ORDER BY e.created_at DESC LIMIT 70`)
      events=rows
    }
    return NextResponse.json({success:true,mode:actor.role==='client'?'client':actor.role==='admin'?'administrations':'guidance',
      departments:actor.departments, cases,selected,actions,income,events,milestones:FORMATION_MILESTONES,
      note:'No income is inferred from pending orders, unverified payments, product promises, or company event participation.'},{headers})
  }catch(error){
    console.error('[company formation GET]',error)
    return NextResponse.json({error:'Company formation records are unavailable; no figures have been inferred'},{status:503,headers})
  }
}

export async function POST(request:NextRequest){
  try{
    const actor=await identity(request)
    if(!actor)return NextResponse.json({error:'Authorized Client or department appointment required'},{status:403,headers})
    await ensureCompanyFormationSchema()
    await syncFormationOwnership()
    const body=await request.json().catch(()=>null)
    if(!body)return NextResponse.json({error:'Invalid request body'},{status:400,headers})
    const caseId=clean(body.caseId,40),action=clean(body.action,30)
    if(!uuid.test(caseId))return NextResponse.json({error:'Valid formation case required'},{status:422,headers})
    const record=await selectedCase(caseId,actor)
    if(!record)return NextResponse.json({error:'Formation not found or outside your authority'},{status:404,headers})
    const pool=getPool()
    if(action==='save_brief'){
      if(actor.role!=='client'||!record.activated_at||!record.verified_at)
        return NextResponse.json({error:'An activated, independently verified Client File Folder is required'},{status:403,headers})
      const brief=clean(body.businessBrief,2000),customer=clean(body.firstCustomer,700),
        offer=clean(body.firstOffer,700),next=clean(body.nextAction,700)
      if(brief.length<30||customer.length<10||offer.length<10||next.length<10)
        return NextResponse.json({error:'Provide a practical business description, customers, an offer and a next action'},{status:422,headers})
      const db=await pool.connect()
      let actionId:string
      try{
        await db.query('BEGIN')
        const {rows}=await db.query(`UPDATE weave_company_formation_cases
          SET business_brief=$1,first_customer=$2,first_offer=$3,next_action=$4,
            stage=CASE WHEN stage='awaiting_client' THEN 'planning' ELSE stage END,updated_at=NOW()
          WHERE id=$5::uuid AND client_id=$6::uuid AND verified_at IS NOT NULL AND activated_at IS NOT NULL
          RETURNING id`,[brief,customer,offer,next,caseId,actor.id])
        if(!rows.length){await db.query('ROLLBACK');return NextResponse.json({error:'Client File Folder is not activated'},{status:409,headers})}
        const saved=await db.query(`INSERT INTO weave_company_formation_actions
          (case_id,author_id,department,action_type,note,visibility)
          VALUES($1::uuid,$2::uuid,'client','client_brief',$3,'client') RETURNING id`,
          [caseId,actor.id,'Business: '+brief+' | Customers: '+customer+' | Offer: '+offer+' | Next: '+next])
        actionId=String(saved.rows[0].id)
        await db.query('COMMIT')
      }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error}
      finally{db.release()}
      await notifyAction(record,actionId,actor.id,'Client')
      return NextResponse.json({success:true,actionId},{headers})
    }
    if(action==='add_note'){
      const note=clean(body.note,2000),department=clean(body.department,24),
        month=body.monthNo==null?null:Number(body.monthNo)
      if(note.length<10||note.length>2000||(month!==null&&(!Number.isInteger(month)||month<1||month>4)))
        return NextResponse.json({error:'Write a 10–2000 character action, with an optional month 1–4'},{status:422,headers})
      if(actor.role==='client'&&(!record.verified_at||!record.activated_at))
        return NextResponse.json({error:'The File Folder must first be verified and activated'},{status:403,headers})
      if(!record.verified_at)
        return NextResponse.json({error:'No Client business guidance before independent purchase verification'},{status:409,headers})
      const authorDepartment=actor.role==='client'?'client':actor.role==='admin'?'admin':department
      if(actor.role!=='client'&&actor.role!=='admin'&&(!isGuidanceDepartment(department)||!actor.departments.includes(department)))
        return NextResponse.json({error:'Only your approved department may record guidance'},{status:403,headers})
      const type=actor.role==='client'?'client_update':month===null?'guidance':'milestone'
      const visibility=actor.role==='client'?'client':body.internal===true?'internal':'client'
      const {rows}=await pool.query(`INSERT INTO weave_company_formation_actions
        (case_id,author_id,department,action_type,month_no,note,visibility)
        VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7) RETURNING id`,
        [caseId,actor.id,authorDepartment,type,month,note,visibility])
      const actionId=String(rows[0].id)
      await notifyAction(record,actionId,actor.id,authorDepartment,visibility)
      return NextResponse.json({success:true,actionId},{headers})
    }
    if(action==='advance_stage'){
      if(!anyStaff(actor))return NextResponse.json({error:'Only authorized company positions may advance the business workflow'},{status:403,headers})
      const stage=clean(body.stage,24),note=clean(body.note,2000)
      if(!['planning','building','selling','review','closed'].includes(stage)||note.length<15)
        return NextResponse.json({error:'Select a valid business stage and describe the evidence for the change'},{status:422,headers})
      if(!record.verified_at||!record.activated_at)
        return NextResponse.json({error:'Business operation requires verified payment and an activated Client account'},{status:409,headers})
      const department=actor.role==='admin'?'admin':clean(body.department,24)
      if(actor.role!=='admin'&&(!isGuidanceDepartment(department)||!actor.departments.includes(department)))
        return NextResponse.json({error:'Approval for this department is required'},{status:403,headers})
      const db=await pool.connect()
      let actionId:string
      try{
        await db.query('BEGIN')
        const {rows}=await db.query(`UPDATE weave_company_formation_cases SET stage=$1,updated_at=NOW()
          WHERE id=$2::uuid AND verified_at IS NOT NULL AND activated_at IS NOT NULL RETURNING id`,[stage,caseId])
        if(!rows.length){await db.query('ROLLBACK');return NextResponse.json({error:'Formation is not active'},{status:409,headers})}
        const saved=await db.query(`INSERT INTO weave_company_formation_actions
          (case_id,author_id,department,action_type,note,visibility)
          VALUES($1::uuid,$2::uuid,$3,'review',$4,'client') RETURNING id`,
          [caseId,actor.id,department,'Stage '+stage+': '+note])
        actionId=String(saved.rows[0].id)
        await db.query('COMMIT')
      }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error}
      finally{db.release()}
      await notifyAction(record,actionId,actor.id,department)
      return NextResponse.json({success:true,actionId,stage},{headers})
    }
    return NextResponse.json({error:'Unsupported formation action'},{status:400,headers})
  }catch(error){
    console.error('[company formation POST]',error)
    return NextResponse.json({error:'Unable to record authorized business formation action'},{status:503,headers})
  }
}

async function notifyAction(record:{id:string;client_id:string|null},actionId:string,actorId:string,department:string,visibility='client'){
  const pool=getPool()
  const recipients:string[]=[]
  if(visibility==='client'&&record.client_id&&record.client_id!==actorId)recipients.push(String(record.client_id))
  if(department==='client'){
    const {rows}=await pool.query(`SELECT DISTINCT u.id FROM users u
      LEFT JOIN weave_guidance_staff_applications a ON a.user_id=u.id
        AND a.status='approved' AND a.source_role=u.role
      WHERE COALESCE(u.is_active,true)=true
        AND (u.role='admin' OR (u.role IN ('agent','bridger') AND a.department IN ('mandate','forensic','lawyer')))`)
    for(const row of rows)if(String(row.id)!==actorId)recipients.push(String(row.id))
  }
  const unique=[...new Set(recipients)]
  for(const id of unique){
    await pool.query(`INSERT INTO notifications(user_id,type,title,content,from_user_name,link)
      VALUES($1::uuid,'company_formation_action',$2,$3,'WEAVE · Company Formation',$4)`,
      [id,'File Folder business formation update',
        department==='client'?'A Client recorded new business direction for company support.':'A company department recorded a new business action.',
        '/company/formation?caseId='+encodeURIComponent(record.id)+'&action='+encodeURIComponent(actionId)]
    ).catch(error=>console.error('[company formation notification]',error))
  }
}
