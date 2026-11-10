import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql,getPool} from '@/lib/db'
import {getActiveLegionEmployment} from '@/lib/legion-employment'
import {ensureRegionalOperationsSchema,regionalTeam,type RegionalTeamMember} from '@/lib/regional-manager-operations'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','Vary':'Authorization'}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const today=`((NOW() AT TIME ZONE 'Africa/Lagos')::date)`

async function context(user:{id:string;role:string}){
  if(!['bridger','agent'].includes(user.role))return null
  // An Administration-verified regional appointment or assignment is sufficient.
  // Ordinary Bridgers are workers here; Agentic-Bridger is not a prerequisite.
  const [legion,record]=await Promise.all([
    getActiveLegionEmployment(sql,user.id),
    getPool().query(`SELECT user_id FROM weave_regional_manager_appointments
      WHERE user_id=$1::uuid AND status='active'`,[user.id])
  ])
  if(legion.active)return null
  if(record.rows.length){
    return {managerId:user.id,kind:'manager' as const,
      team:await regionalTeam(user.id,null),member:null as RegionalTeamMember|null}
  }
  const memberships=await regionalTeam(null,user.id)
  if(!memberships.length)return null
  const member=memberships[0]
  return {managerId:member.manager_id,kind:'member' as const,
    team:[] as RegionalTeamMember[],member}
}

async function notify(userId:string,title:string,content:string){
  try{await getPool().query(`INSERT INTO notifications
    (user_id,type,title,content,from_user_name,link)
    VALUES($1::uuid,'regional_work',$2,$3,'WEAVE · A Time',
      '/weave/lifestyles/regional-manager/workspace')`,
    [userId,title,content.slice(0,600)])}
  catch(error){console.error('[regional operations notification]',error)}
}

async function metrics(team:RegionalTeamMember[]){
  const pool=getPool()
  const bridgers=[...new Set(team.filter(x=>x.role==='bridger').map(x=>x.user_id))]
  const agents=[...new Set(team.filter(x=>x.role==='agent').map(x=>x.user_id))]
  async function count(table:string,query:string,ids:string[]){
    const found=await pool.query('SELECT to_regclass($1) AS relation',['public.'+table])
    if(!found.rows[0]?.relation)return {available:false,value:null}
    try{
      const result=await pool.query(query,[ids])
      return {available:true,...result.rows[0]}
    }catch(error){console.error('[regional metric: '+table+']',error);return {available:false,value:null}}
  }
  return {
    prospectPurchases:await count('market_prospect_packages',
      `SELECT COUNT(*)::int AS packages FROM market_prospect_packages
        WHERE purchased_by=ANY($1::uuid[]) AND status='sold'
          AND (purchased_at AT TIME ZONE 'Africa/Lagos')::date=((NOW() AT TIME ZONE 'Africa/Lagos')::date)`,bridgers),
    confirmedFileFolders:await count('file_folder_purchases',
      `SELECT COUNT(DISTINCT COALESCE(NULLIF(file_number,''),id::text))::int AS folders
        FROM file_folder_purchases WHERE bridger_id=ANY($1::uuid[])
        AND status='confirmed'
        AND (COALESCE(confirmed_at,created_at) AT TIME ZONE 'Africa/Lagos')::date=
          ((NOW() AT TIME ZONE 'Africa/Lagos')::date)`,bridgers),
    fulfilledFood:await count('carrier_food_orders',
      `SELECT COUNT(*)::int AS orders,COALESCE(SUM(quantity_packages),0)::int AS units
        FROM carrier_food_orders WHERE agent_id=ANY($1::uuid[])
        AND payment_status='paid' AND status='fulfilled'
        AND (fulfilled_at AT TIME ZONE 'Africa/Lagos')::date=
          ((NOW() AT TIME ZONE 'Africa/Lagos')::date)`,agents)
  }
}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Authentication required'},{status:401,headers})
  if(!['bridger','agent'].includes(user.role))return NextResponse.json({error:'Authorized Bridger or Agent position required'},{status:403,headers})
  try{
    await ensureRegionalOperationsSchema()
    const ctx=await context(user)
    if(!ctx)return NextResponse.json({error:'No active regional appointment or team assignment; contact Administrations'},{status:403,headers})
    const pool=getPool()
    const [taskResult,checkinResult]=await Promise.all([
      pool.query(`SELECT t.id,t.regional_manager_user_id,t.assigned_user_id,
        u.name AS assigned_name,t.title,t.instructions,t.work_date,
        t.status,t.evidence_note,t.manager_note,t.created_at,t.updated_at,t.completed_at
        FROM weave_regional_daily_tasks t JOIN users u ON u.id=t.assigned_user_id
        WHERE t.regional_manager_user_id=$1::uuid
          AND ($2::uuid IS NULL OR t.assigned_user_id=$2::uuid)
          AND t.work_date>=`+today+`-INTERVAL '14 days'
        ORDER BY t.work_date DESC,t.updated_at DESC LIMIT 120`,
        [ctx.managerId,ctx.kind==='member'?user.id:null]),
      pool.query(`SELECT c.regional_manager_user_id,c.member_user_id,u.name AS member_name,
        c.work_date,c.work_status,c.summary,c.support_status,c.manager_response,
        c.created_at,c.updated_at,c.responded_at
        FROM weave_regional_daily_checkins c JOIN users u ON u.id=c.member_user_id
        WHERE c.regional_manager_user_id=$1::uuid
          AND ($2::uuid IS NULL OR c.member_user_id=$2::uuid)
          AND c.work_date>=`+today+`-INTERVAL '14 days'
        ORDER BY c.work_date DESC,c.updated_at DESC LIMIT 200`,
        [ctx.managerId,ctx.kind==='member'?user.id:null])
    ])
    const tasks=taskResult.rows,checkins=checkinResult.rows
    const summary=ctx.kind==='manager'?{
      teamMembers:ctx.team.length,
      directReports:ctx.team.filter(x=>x.level==='direct').length,
      assistantReports:ctx.team.filter(x=>x.level==='assistant').length,
      todayCheckins:checkins.filter(x=>String(x.work_date).slice(0,10)===
        new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Lagos'})).length,
      needsHelp:checkins.filter(x=>x.support_status==='open'||x.support_status==='acknowledged').length,
      tasksOpen:tasks.filter(x=>!['completed'].includes(x.status)).length,
      tasksCompleted:tasks.filter(x=>x.status==='completed').length
    }:null
    return NextResponse.json({
      success:true,mode:ctx.kind,managerId:ctx.managerId,
      team:ctx.kind==='manager'?ctx.team:[],
      membership:ctx.kind==='member'?ctx.member:null,
      tasks,checkins,summary,
      metrics:ctx.kind==='manager'?await metrics(ctx.team):null
    },{headers})
  }catch(error){
    console.error('[Regional Manager workspace GET]',error)
    return NextResponse.json({error:'Unable to read verified regional records'},{status:503,headers})
  }
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||!['bridger','agent'].includes(user.role))
    return NextResponse.json({error:'Bridger or Agent authentication required'},{status:403,headers})
  try{
    await ensureRegionalOperationsSchema()
    const ctx=await context(user)
    if(!ctx)return NextResponse.json({error:'Active regional appointment or team assignment required'},{status:403,headers})
    const body=await request.json().catch(()=>({}))
    const action=String(body.action||'')
    const pool=getPool()
    if(action==='assign'){
      if(ctx.kind!=='manager')return NextResponse.json({error:'Only the Regional Manager assigns lead work'},{status:403,headers})
      const memberId=String(body.memberId||'')
      const member=ctx.team.find(x=>x.user_id===memberId&&x.level==='direct')
      const title=String(body.title||'').trim(),instructions=String(body.instructions||'').trim()
      if(!member||!uuid.test(memberId)||title.length<6||title.length>160||
        instructions.length<15||instructions.length>2000)
        return NextResponse.json({error:'Select an appointed direct team member and provide clear work instructions'},{status:422,headers})
      const result=await pool.query(`INSERT INTO weave_regional_daily_tasks
        (regional_manager_user_id,assigned_user_id,title,instructions)
        VALUES($1::uuid,$2::uuid,$3,$4) RETURNING id`,
        [ctx.managerId,memberId,title,instructions])
      await pool.query(`INSERT INTO weave_regional_daily_task_history
        (task_id,actor_user_id,from_status,to_status,note)
        VALUES($1::uuid,$2::uuid,NULL,'assigned','Assigned by the Regional Manager')`,
        [result.rows[0].id,user.id])
      await notify(memberId,'Regional assignment · '+title,'Open your staff workspace to read and record progress.')
      return NextResponse.json({success:true,taskId:result.rows[0].id},{headers})
    }
    if(action==='check_in'){
      if(ctx.kind!=='member')return NextResponse.json({error:'Only assigned staff submit personal check-ins'},{status:403,headers})
      const workStatus=String(body.workStatus||'')
      const summary=String(body.summary||'').trim()
      if(!['working','needs_help','no_assignment'].includes(workStatus)||
        summary.length<15||summary.length>2000)
        return NextResponse.json({error:'Describe your work or support need in at least 15 characters'},{status:422,headers})
      await pool.query(`INSERT INTO weave_regional_daily_checkins
        (regional_manager_user_id,member_user_id,work_date,work_status,summary,support_status)
        VALUES($1::uuid,$2::uuid,`+today+`,$3,$4,$5)
        ON CONFLICT(regional_manager_user_id,member_user_id,work_date)
        DO UPDATE SET work_status=EXCLUDED.work_status,summary=EXCLUDED.summary,
          support_status=EXCLUDED.support_status,
          manager_response=CASE WHEN EXCLUDED.support_status='open' THEN NULL
            ELSE weave_regional_daily_checkins.manager_response END,
          responded_at=CASE WHEN EXCLUDED.support_status='open' THEN NULL
            ELSE weave_regional_daily_checkins.responded_at END,
          updated_at=NOW()`,[ctx.managerId,user.id,workStatus,summary,
          workStatus==='needs_help'?'open':'none'])
      await notify(ctx.managerId,'Regional employee check-in',workStatus==='needs_help'?'An assigned worker requested assistance.':'An assigned worker recorded daily work.')
      return NextResponse.json({success:true},{headers})
    }
    if(action==='respond_support'){
      if(ctx.kind!=='manager')return NextResponse.json({error:'Only Regional Managers respond to support'},{status:403,headers})
      const memberId=String(body.memberId||''),workDate=String(body.workDate||'')
      const note=String(body.note||'').trim(),supportStatus=String(body.supportStatus||'')
      if(!uuid.test(memberId)||!ctx.team.some(x=>x.user_id===memberId)||
        !/^\d{4}-\d{2}-\d{2}$/.test(workDate)||note.length<10||note.length>2000||
        !['acknowledged','resolved'].includes(supportStatus))
        return NextResponse.json({error:'Choose a member, check-in and a clear response'},{status:422,headers})
      const r=await pool.query(`UPDATE weave_regional_daily_checkins
        SET support_status=$4,manager_response=$5,responded_at=NOW(),updated_at=NOW()
        WHERE regional_manager_user_id=$1::uuid AND member_user_id=$2::uuid
          AND work_date=$3::date AND support_status IN ('open','acknowledged')
        RETURNING member_user_id`,[ctx.managerId,memberId,workDate,supportStatus,note])
      if(!r.rowCount)return NextResponse.json({error:'Unresolved support request not found'},{status:404,headers})
      await notify(memberId,'Regional support response',note)
      return NextResponse.json({success:true},{headers})
    }
    if(action==='task_progress'){
      const id=String(body.taskId||''),next=String(body.status||''),note=String(body.note||'').trim()
      if(!uuid.test(id)||note.length<8||note.length>1500)
        return NextResponse.json({error:'Provide a task and a meaningful progress note'},{status:422,headers})
      const db=await pool.connect()
      try{
        await db.query('BEGIN')
        const r=await db.query(`SELECT * FROM weave_regional_daily_tasks
          WHERE id=$1::uuid AND regional_manager_user_id=$2::uuid FOR UPDATE`,[id,ctx.managerId])
        const task=r.rows[0]
        if(!task){await db.query('ROLLBACK');return NextResponse.json({error:'Regional task not found'},{status:404,headers})}
        const isManager=ctx.kind==='manager'
        const isAssigned=ctx.kind==='member'&&String(task.assigned_user_id)===user.id
        const permitted=(isAssigned&&(
            (['assigned','returned'].includes(task.status)&&next==='in_progress')||
            (task.status==='in_progress'&&next==='submitted'&&note.length>=15)
          ))||(isManager&&task.status==='submitted'&&
            (next==='completed'||next==='returned')&&
            ctx.team.some(x=>x.user_id===String(task.assigned_user_id)&&x.level==='direct'))
        if(!permitted){
          await db.query('ROLLBACK')
          return NextResponse.json({error:'Task transition is not authorized or evidence is incomplete'},{status:403,headers})
        }
        await db.query(`UPDATE weave_regional_daily_tasks SET status=$2,
          evidence_note=CASE WHEN $2='submitted' THEN $3 ELSE evidence_note END,
          manager_note=CASE WHEN $2 IN ('completed','returned') THEN $3 ELSE manager_note END,
          completed_at=CASE WHEN $2='completed' THEN NOW() ELSE NULL END,
          updated_at=NOW() WHERE id=$1::uuid`,[id,next,note])
        await db.query(`INSERT INTO weave_regional_daily_task_history
          (task_id,actor_user_id,from_status,to_status,note)
          VALUES($1::uuid,$2::uuid,$3,$4,$5)`,[id,user.id,task.status,next,note])
        await db.query('COMMIT')
        await notify(isManager?String(task.assigned_user_id):ctx.managerId,
          'Regional task · '+next.replaceAll('_',' '),note)
        return NextResponse.json({success:true,status:next},{headers})
      }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error}
      finally{db.release()}
    }
    return NextResponse.json({error:'Unknown regional action'},{status:400,headers})
  }catch(error){
    console.error('[Regional Manager workspace POST]',error)
    return NextResponse.json({error:'Regional work could not be safely recorded'},{status:503,headers})
  }
}
