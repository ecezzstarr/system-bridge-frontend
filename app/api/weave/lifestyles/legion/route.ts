import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import { activateLegionEmployment, ensureLegionEmploymentSchema, getActiveLegionEmployment, releaseLegionEmployment } from '@/lib/legion-employment'
import { getInstalledCapabilityTotals } from '@/lib/client-growth-world'
import { recordSystemEvent } from '@/lib/system-events'
import {notifyAdministrators,notifyUser} from '@/lib/deposit-notifications'
import { getClientMonthlyStanding, ensureClientMonthlySchema } from '@/lib/client-monthly-subscription'

async function enterpriseCapacity(clientId:string){
  const capability=await getInstalledCapabilityTotals(sql,clientId)
  const capacity=Math.max(3,3+Math.floor(Number(capability.legionCapacityBonus||0)))
  const [count]=await sql`SELECT COUNT(*)::int AS count FROM enterprise_legions WHERE client_id=${clientId}::uuid AND active=true AND employment_status='active'`
  return {capacity,count:Number(count?.count||0)}
}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  const baseRole=String(user.baseRole||user.role||'').toLowerCase()
  if(!['agent','bridger'].includes(baseRole))return NextResponse.json({success:false,error:'Legion Lifestyle is available to Agents and Agentic-Bridger owners.'},{status:403})

  await ensureLegionEmploymentSchema(sql)
  const access=await getLifestyleAccess(user.id)
  const employment=await getActiveLegionEmployment(sql,user.id)
  if(employment.active){
    const [stats]=await sql`
      SELECT COUNT(*)::int AS orders,
             COUNT(*) FILTER (WHERE payment_status='received')::int AS paid_orders,
             COALESCE(SUM(amount) FILTER (WHERE payment_status='received'),0)::numeric AS revenue
      FROM client_store_orders
      WHERE legion_id=${employment.legionId}::uuid
    `
    return NextResponse.json({success:true,eligible:false,access,employment:{...employment,stats:stats||{orders:0,paid_orders:0,revenue:0}},applications:[],enterprises:[]})
  }

  const applications=await sql`
    SELECT la.*,a.enterprise_name,a.sector,owner.name AS client_name
    FROM legion_lifestyle_applications la
    JOIN enterprise_applications a ON a.id=la.enterprise_application_id
    LEFT JOIN users owner ON owner.id=la.client_id
    WHERE la.applicant_user_id=${user.id}::uuid
      AND la.status IN ('pending','offered')
    ORDER BY la.created_at DESC
  `

  await ensureClientMonthlySchema()
  const enterprises=access.active ? await sql`
    SELECT a.id,a.client_id,a.file_number,a.enterprise_name,a.sector,owner.name AS client_name,
           COUNT(l.id) FILTER (WHERE l.active=true AND l.employment_status='active')::int AS legion_count
    FROM enterprise_applications a
    JOIN users owner ON owner.id=a.client_id
    JOIN client_built_systems q ON q.client_id=a.client_id AND q.file_number=a.file_number AND q.system_type='legion_quarters' AND q.status='active'
    LEFT JOIN enterprise_legions l ON l.client_id=a.client_id
    WHERE a.status='approved'
      AND EXISTS (SELECT 1 FROM client_monthly_subscriptions cms WHERE cms.client_id=a.client_id AND cms.payment_status='paid' AND cms.period_end>NOW())
    GROUP BY a.id,owner.name
    ORDER BY a.reviewed_at DESC NULLS LAST,a.submitted_at DESC
    LIMIT 100
  ` : []

  return NextResponse.json({success:true,eligible:access.active,access,employment,applications,enterprises})
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  const baseRole=String(user.baseRole||user.role||'').toLowerCase()
  if(!['agent','bridger'].includes(baseRole))return NextResponse.json({success:false,error:'Agent or Bridger access required.'},{status:403})

  await ensureLegionEmploymentSchema(sql)
  const body=await request.json().catch(()=>({}))
  const action=String(body.action||'apply')

  // Resignation is available even when the worker's underlying access
  // has expired. An exclusive employment must never trap someone in a role.
  if(action==='release_legion'){
    const employment=await getActiveLegionEmployment(sql,user.id)
    if(!employment.active||!employment.legionId)
      return NextResponse.json({success:false,error:'No active Legion employment to release'},{status:409})
    const result=await releaseLegionEmployment(sql,{
      legionId:employment.legionId,actorUserId:user.id,
      actorPosition:'worker',reason:String(body.reason||''),
    })
    if(!result.success)return NextResponse.json(result,{status:result.status||500})
    if(!result.alreadyReleased)await recordSystemEvent({
      eventType:'legion_employment_released',actorId:user.id,actorRole:baseRole,
      subjectType:'enterprise_legion',subjectId:employment.legionId,source:'lifestyle-legion',
      payload:{releasedBy:'worker',clientId:employment.clientId,pendingOrders:result.pendingOrders},
    }).catch(e=>console.error('[Legion release event]',e))
    if(!result.alreadyReleased)await notifyAdministrators({
      type:'legion_employment_released',title:'Worker ended exclusive Legion employment',
      content:`${user.name||baseRole} returned to their underlying ${baseRole} position. ${result.pendingOrders||0} unfinished Client orders remain attached to the enterprise. Reason: ${String(body.reason||'').slice(0,180)}`,
      link:'/admin/legion-releases',fromUserId:user.id,fromUserName:user.name||'Legion',
    })
    return NextResponse.json(result)
  }

  const access=await getLifestyleAccess(user.id)
  if(!access.active){
    const error=baseRole==='agent'
      ? 'An active Agent account is required before applying to become a Legion.'
      : 'Buy Agentic-Bridger once for 20 Flame Coin before applying to become a Legion.'
    return NextResponse.json({success:false,error},{status:403})
  }
  const current=await getActiveLegionEmployment(sql,user.id)
  if(current.active)return NextResponse.json({success:false,error:'You are already an active Legion and can only work for your Client inside Weave.'},{status:409})

  if(action==='apply'){
    const enterpriseApplicationId=String(body.enterpriseApplicationId||'')
    const note=String(body.note||'').trim().slice(0,2000)||null
    const [enterprise]=await sql`
      SELECT a.id,a.client_id,a.file_number,a.enterprise_name
      FROM enterprise_applications a
      WHERE a.id=${enterpriseApplicationId}::uuid AND a.status='approved'
        AND EXISTS(SELECT 1 FROM client_built_systems q WHERE q.client_id=a.client_id AND q.file_number=a.file_number AND q.system_type='legion_quarters' AND q.status='active')
      LIMIT 1
    `
    if(!enterprise)return NextResponse.json({success:false,error:'This Client enterprise is not open for Legions.'},{status:404})
    const clientStanding=await getClientMonthlyStanding(String(enterprise.client_id))
    if(!clientStanding.active)return NextResponse.json({success:false,error:'This Client enterprise must renew its monthly subscription before accepting new Legions.'},{status:409})
    const capacity=await enterpriseCapacity(String(enterprise.client_id))
    if(capacity.count>=capacity.capacity)return NextResponse.json({success:false,error:'This Client Legion Quarter is currently full.'},{status:409})
    const [existing]=await sql`
      SELECT id FROM legion_lifestyle_applications
      WHERE applicant_user_id=${user.id}::uuid AND enterprise_application_id=${enterprise.id}::uuid AND status='pending'
      LIMIT 1
    `
    if(existing)return NextResponse.json({success:true,applicationId:existing.id,alreadyPending:true})
    const [application]=await sql`
      INSERT INTO legion_lifestyle_applications(applicant_user_id,applicant_role,client_id,enterprise_application_id,file_number,direction,status,note)
      VALUES(${user.id}::uuid,${baseRole},${enterprise.client_id}::uuid,${enterprise.id}::uuid,${enterprise.file_number},'candidate_application','pending',${note})
      RETURNING *
    `
    await recordSystemEvent({eventType:'legion_application_submitted',actorId:user.id,actorRole:baseRole,subjectType:'enterprise_application',subjectId:String(enterprise.id),source:'lifestyle-legion',payload:{enterpriseName:enterprise.enterprise_name}})
    return NextResponse.json({success:true,application},{status:201})
  }

  if(action==='accept_invite'||action==='accept_offer'){
    const expectedDirection=action==='accept_offer'?'candidate_application':'client_invite'
    const expectedStatus=action==='accept_offer'?'offered':'pending'
    const applicationId=String(body.applicationId||'')
    const [application]=await sql`
      SELECT la.*,a.enterprise_name,u.name,u.email
      FROM legion_lifestyle_applications la
      JOIN enterprise_applications a ON a.id=la.enterprise_application_id
      JOIN users u ON u.id=la.applicant_user_id
      WHERE la.id=${applicationId}::uuid
        AND la.applicant_user_id=${user.id}::uuid
        AND la.direction=${expectedDirection}
        AND la.status=${expectedStatus}
      LIMIT 1
    `
    if(!application)return NextResponse.json({success:false,error:'Legion invitation or agreed Client employment offer was not found.'},{status:404})
    if(String(application.profit_participation||'').trim().length<5)return NextResponse.json({success:false,error:'A written earnings agreement is required before exclusive Legion employment.'},{status:409})
    const clientStanding=await getClientMonthlyStanding(String(application.client_id))
    if(!clientStanding.active)return NextResponse.json({success:false,error:'This Client enterprise must renew its monthly subscription before activating new Legions.'},{status:409})
    const capacity=await enterpriseCapacity(String(application.client_id))
    if(capacity.count>=capacity.capacity)return NextResponse.json({success:false,error:'The Client Legion Quarter is now full.'},{status:409})
    const legion=await activateLegionEmployment(sql,{
      applicantUserId:user.id,applicantRole:baseRole,clientId:String(application.client_id),enterpriseApplicationId:String(application.enterprise_application_id),fileNumber:String(application.file_number),name:String(application.name||user.name||'Legion'),contact:String(application.email||user.email||''),functionTitle:application.function_title||'Enterprise Legion',profitParticipation:application.profit_participation||null,
    })
    await recordSystemEvent({
      eventType:'legion_employment_activated',actorId:user.id,actorRole:baseRole,
      subjectType:'enterprise_legion',subjectId:String(legion.id),source:'lifestyle-legion',
      payload:{applicationId,enterpriseName:application.enterprise_name,acceptedByWorker:true,exclusive:true},
    }).catch(e=>console.error('[Legion accept event]',e))
    await notifyUser(String(application.client_id),{
      type:'legion_employment_activated',title:'Enterprise Legion accepted',
      content:`${user.name||baseRole} accepted the written employment terms. Their active ${baseRole} operating position is now your exclusive Legion until release.`,
      link:'/client/enterprise/legions',fromUserId:user.id,fromUserName:user.name||'Legion',
    })
    return NextResponse.json({success:true,legion,exclusive:true})
  }

  return NextResponse.json({success:false,error:'Unsupported Legion action.'},{status:400})
}
