import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getPool,sql} from '@/lib/db'
import {getLifestyleAccess} from '@/lib/weave-lifestyle'
import {getActiveLegionEmployment} from '@/lib/legion-employment'
import {ensureRegionalOperationsSchema,regionalTeam} from '@/lib/regional-manager-operations'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Authorization'}
type Position='manager'|'member'
type GateIdentity={managerId:string;position:Position;region:string;members:{user_id:string;role:string}[]}
const localDay=`((NOW() AT TIME ZONE 'Africa/Lagos')::date)`

/**
 * The Regional System Switch Gate is a scoped awareness surface of the
 * company's real activity. Assignment, not GPS or an unrestricted search,
 * determines which gate a person may enter.
 *
 * This API never returns customer identities, transaction amounts, private
 * task instructions, check-in summaries, employee welfare details or leads.
 */
async function resolveGate(user:{id:string;role:string}):Promise<GateIdentity|null>{
  if(!['agent','bridger'].includes(user.role))return null
  const [access,legion]=await Promise.all([
    getLifestyleAccess(user.id),getActiveLegionEmployment(sql,user.id)
  ])
  if(!access.active||legion.active)return null
  const pool=getPool()
  const appointment=await pool.query(`SELECT a.user_id
    FROM weave_regional_manager_appointments a
    JOIN users u ON u.id=a.user_id AND u.is_active=true AND u.role IN ('agent','bridger')
    WHERE a.user_id=$1::uuid AND a.status='active'`,[user.id])
  const position:Position=appointment.rowCount?'manager':'member'
  let managerId=user.id
  if(position==='member'){
    const membership=await regionalTeam(null,user.id)
    if(!membership.length)return null
    managerId=membership[0].manager_id
  }
  const team=await regionalTeam(managerId,null)
  const regionResult=await pool.query(`SELECT region FROM weave_regional_manager_applications
    WHERE user_id=$1::uuid AND status='approved' LIMIT 1`,[managerId])
  return {
    managerId,position,
    region:String(regionResult.rows[0]?.region||'Assigned Region').slice(0,120),
    members:team.map(m=>({user_id:m.user_id,role:m.role}))
  }
}

async function readSignal(pool:ReturnType<typeof getPool>,source:string,query:string,ids:string[],managerId?:string){
  const exists=await pool.query('SELECT to_regclass($1) AS relation',['public.'+source])
  if(!exists.rows[0]?.relation)return {available:false,count:null,lastAt:null}
  try{
    const result=await pool.query(query,managerId?[ids,managerId]:[ids])
    const item=result.rows[0]||{}
    return {available:true,count:Number(item.count||0),lastAt:item.last_at||null}
  }catch(error){
    console.error('[regional gate: '+source+']',error)
    return {available:false,count:null,lastAt:null}
  }
}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401,headers})
  if(!['agent','bridger'].includes(user.role))
    return NextResponse.json({error:'Staff position required'},{status:403,headers})
  try{
    await ensureRegionalOperationsSchema()
    const gate=await resolveGate(user)
    if(!gate)return NextResponse.json({error:'No authorized regional gate'},{status:403,headers})
    const pool=getPool()
    const ids=[...new Set(gate.members.map(m=>m.user_id))]
    const bridgers=[...new Set(gate.members.filter(m=>m.role==='bridger').map(m=>m.user_id))]
    const agents=[...new Set(gate.members.filter(m=>m.role==='agent').map(m=>m.user_id))]
    const [directions,work,participation,prospects,food,folders]=await Promise.all([
      pool.query(`SELECT id,direction,next_action,created_at
        FROM weave_regional_gate_directions
        WHERE regional_manager_user_id=$1::uuid
        ORDER BY created_at DESC LIMIT 3`,[gate.managerId]),
      readSignal(pool,'weave_regional_daily_tasks',
        `SELECT COUNT(*)::int AS count,MAX(completed_at) AS last_at
          FROM weave_regional_daily_tasks WHERE regional_manager_user_id=$2::uuid
          AND assigned_user_id=ANY($1::uuid[]) AND status='completed'
          AND completed_at>=(NOW()-INTERVAL '24 hours')`,ids,gate.managerId),
      readSignal(pool,'weave_regional_daily_checkins',
        `SELECT COUNT(*)::int AS count,MAX(updated_at) AS last_at
          FROM weave_regional_daily_checkins WHERE member_user_id=ANY($1::uuid[])
          AND regional_manager_user_id=$2::uuid AND work_status='working'
          AND work_date=`+localDay,ids,gate.managerId),
      readSignal(pool,'market_prospect_packages',
        `SELECT COUNT(*)::int AS count,MAX(purchased_at) AS last_at
          FROM market_prospect_packages WHERE purchased_by=ANY($1::uuid[])
            AND status='sold' AND purchased_at>=(NOW()-INTERVAL '24 hours')`,bridgers),
      readSignal(pool,'carrier_food_orders',
        `SELECT COUNT(*)::int AS count,MAX(fulfilled_at) AS last_at
          FROM carrier_food_orders WHERE agent_id=ANY($1::uuid[])
          AND payment_status='paid' AND status='fulfilled'
          AND fulfilled_at>=(NOW()-INTERVAL '24 hours')`,agents),
      readSignal(pool,'file_folder_purchases',
        `SELECT COUNT(DISTINCT COALESCE(NULLIF(file_number,''),id::text))::int AS count,
          MAX(COALESCE(confirmed_at,created_at)) AS last_at
          FROM file_folder_purchases WHERE bridger_id=ANY($1::uuid[])
          AND status='confirmed' AND COALESCE(confirmed_at,created_at)>=(NOW()-INTERVAL '24 hours')`,bridgers)
    ])
    const signals=[
      {id:'participation',department:'Company of Time',title:'Team members participating today',...participation},
      {id:'completed_work',department:'Regional Work',title:'Verified assignments completed',...work},
      {id:'hope',department:'Hope · Bridgers',title:'Prospect packages purchased',...prospects},
      {id:'stability',department:'Stability · Agents',title:'Paid food orders fulfilled',...food},
      {id:'dream_lovely',department:'Dream Lovely',title:'Confirmed Client File Folder crossings',...folders}
    ]
    return NextResponse.json({
      success:true,gate:{region:gate.region,position:gate.position,
        purpose:'See real company participation around you and the next work you can contribute.'},
      directions:directions.rows,signals,generatedAt:new Date().toISOString()
    },{headers})
  }catch(error){
    console.error('[Regional System Switch Gate GET]',error)
    return NextResponse.json({error:'Regional activity is unavailable; no results are assumed'},
      {status:503,headers})
  }
}

/** Only an appointed ordinary Regional Manager publishes a regional direction.
 * Members read it; neither can create a false activity event or payment.
 */
export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||!['agent','bridger'].includes(user.role))
    return NextResponse.json({error:'Authorized staff sign-in required'},{status:403,headers})
  try{
    await ensureRegionalOperationsSchema()
    const gate=await resolveGate(user)
    if(!gate||gate.position!=='manager')
      return NextResponse.json({error:'Only the appointed Regional Manager directs this gate'},
        {status:403,headers})
    const body=await request.json().catch(()=>({}))
    if(body?.action!=='publish_direction')
      return NextResponse.json({error:'Unknown regional gate action'},{status:400,headers})
    const direction=String(body.direction||'').trim()
    const nextAction=String(body.nextAction||'').trim()
    const sensitive=/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\+?\d[\d ()-]{8,}\d/
    if(direction.length<8||direction.length>160||nextAction.length<20||
       nextAction.length>1000||sensitive.test(direction)||sensitive.test(nextAction))
      return NextResponse.json({error:'Use clear company direction without private contact or payment information'},
        {status:422,headers})
    const pool=getPool(),db=await pool.connect()
    let id:string
    try{
      await db.query('BEGIN')
      await db.query(`SELECT pg_advisory_xact_lock(hashtext($1))`,
        ['regional_gate_'+gate.managerId])
      const authorized=await db.query(`SELECT user_id FROM weave_regional_manager_appointments
        WHERE user_id=$1::uuid AND status='active' FOR UPDATE`,[gate.managerId])
      if(!authorized.rowCount){
        await db.query('ROLLBACK')
        return NextResponse.json({error:'Regional appointment has ended'},{status:403,headers})
      }
      const count=await db.query(`SELECT COUNT(*)::int AS count
        FROM weave_regional_gate_directions WHERE regional_manager_user_id=$1::uuid
        AND (created_at AT TIME ZONE 'Africa/Lagos')::date=`+localDay,[gate.managerId])
      if(Number(count.rows[0]?.count||0)>=3){
        await db.query('ROLLBACK')
        return NextResponse.json({error:'Three directions already published today. Continue supervising the active work.'},
          {status:409,headers})
      }
      const created=await db.query(`INSERT INTO weave_regional_gate_directions
        (regional_manager_user_id,author_user_id,direction,next_action)
        VALUES($1::uuid,$2::uuid,$3,$4) RETURNING id`,
        [gate.managerId,user.id,direction,nextAction])
      id=created.rows[0].id
      await db.query('COMMIT')
    }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error}
    finally{db.release()}
    // The content is in the authenticated regional gate, not in a broadcast
    // notification. A failed notification must not duplicate the direction.
    const members=[...new Set(gate.members.map(m=>m.user_id))]
      .filter(id=>id!==gate.managerId)
    if(members.length){
      try{
        await pool.query(`INSERT INTO notifications
          (user_id,type,title,content,from_user_name,link)
          SELECT id,'regional_gate','Your regional direction is updated',
            'Open your regional gate to see the next company activity',
            'WEAVE · Regional Manager','/weave/lifestyles/regional-manager/workspace'
          FROM users WHERE id=ANY($1::uuid[]) AND is_active=true`,[members])
      }catch(error){console.error('[Regional gate notifications]',error)}
    }
    return NextResponse.json({success:true,directionId:id},{headers})
  }catch(error){
    console.error('[Regional System Switch Gate POST]',error)
    return NextResponse.json({error:'Regional direction was not saved'},{status:503,headers})
  }
}
