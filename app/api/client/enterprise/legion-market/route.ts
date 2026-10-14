import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'
import { ensureLegionEmploymentSchema, activateLegionEmployment } from '@/lib/legion-employment'
import { getInstalledCapabilityTotals } from '@/lib/client-growth-world'
import { recordSystemEvent } from '@/lib/system-events'

async function resolveClient(request:NextRequest){
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()||null
  return resolveClientToken(token,sql)
}

async function getEnterprise(clientId:string){
  const [enterprise]=await sql`
    SELECT a.*
    FROM enterprise_applications a
    WHERE a.client_id=${clientId}::uuid AND a.status='approved'
      AND EXISTS(
        SELECT 1 FROM client_built_systems q
        WHERE q.client_id=a.client_id AND q.file_number=a.file_number
          AND q.system_type='legion_quarters' AND q.status='active'
      )
    LIMIT 1
  `
  return enterprise
}

async function capacityState(clientId:string){
  const capability=await getInstalledCapabilityTotals(sql,clientId)
  const capacity=Math.max(3,3+Math.floor(Number(capability.legionCapacityBonus||0)))
  const [count]=await sql`SELECT COUNT(*)::int AS count FROM enterprise_legions WHERE client_id=${clientId}::uuid AND active=true AND employment_status='active'`
  return {capacity,count:Number(count?.count||0)}
}

export async function GET(request:NextRequest){
  const clientId=await resolveClient(request)
  if(!clientId)return NextResponse.json({success:false,error:'Client login required'},{status:401})
  await ensureEnterpriseDreamSchema(sql)
  await ensureLegionEmploymentSchema(sql)
  const enterprise=await getEnterprise(clientId)
  if(!enterprise)return NextResponse.json({success:false,error:'Build and activate Legion Quarters inside an approved enterprise before recruiting Legions.'},{status:409})

  const capacity=await capacityState(clientId)
  const candidates=await sql`
    SELECT u.id,u.name,u.username,u.role,u.subscription_status,u.subscription_expiry,
           EXISTS(
             SELECT 1 FROM legion_lifestyle_applications la
             WHERE la.applicant_user_id=u.id AND la.client_id=${clientId}::uuid AND la.status='pending'
           ) AS pending_with_client
    FROM users u
    WHERE u.role IN ('agent','bridger')
      AND COALESCE(u.is_active,true)=true
      AND (COALESCE(u.is_subscription_exempt,false)=true OR (u.subscription_status='active' AND (u.subscription_expiry IS NULL OR u.subscription_expiry>NOW())))
      AND NOT EXISTS(
        SELECT 1 FROM enterprise_legions l
        WHERE l.source_user_id=u.id AND l.active=true AND l.employment_status='active'
      )
    ORDER BY u.role,u.name NULLS LAST,u.username
    LIMIT 200
  `

  const applications=await sql`
    SELECT la.*,u.name,u.username,u.email,u.role,a.enterprise_name
    FROM legion_lifestyle_applications la
    JOIN users u ON u.id=la.applicant_user_id
    JOIN enterprise_applications a ON a.id=la.enterprise_application_id
    WHERE la.client_id=${clientId}::uuid AND la.status='pending'
    ORDER BY CASE WHEN la.direction='candidate_application' THEN 0 ELSE 1 END,la.created_at DESC
  `

  const legions=await sql`
    SELECT l.id,l.source_user_id,l.name,l.source_role,l.function_title,l.profit_participation,l.sales_code,l.accepted_at,
           COUNT(o.id)::int AS orders,
           COUNT(o.id) FILTER(WHERE o.payment_status='received')::int AS paid_orders
    FROM enterprise_legions l
    LEFT JOIN client_store_orders o ON o.legion_id=l.id
    WHERE l.client_id=${clientId}::uuid AND l.active=true AND l.employment_status='active'
    GROUP BY l.id
    ORDER BY l.accepted_at DESC NULLS LAST,l.created_at DESC
  `

  return NextResponse.json({success:true,enterprise,capacity,candidates,applications,legions})
}

export async function POST(request:NextRequest){
  const clientId=await resolveClient(request)
  if(!clientId)return NextResponse.json({success:false,error:'Client login required'},{status:401})
  await ensureEnterpriseDreamSchema(sql)
  await ensureLegionEmploymentSchema(sql)
  const enterprise=await getEnterprise(clientId)
  if(!enterprise)return NextResponse.json({success:false,error:'Legion Quarters are required before recruitment.'},{status:409})
  const capacity=await capacityState(clientId)
  if(capacity.count>=capacity.capacity)return NextResponse.json({success:false,error:'Legion Quarter capacity is full.'},{status:409})

  const body=await request.json().catch(()=>({}))
  const action=String(body.action||'invite')

  if(action==='invite'){
    const userId=String(body.userId||'')
    const functionTitle=String(body.functionTitle||'Enterprise Legion').trim().slice(0,255)||'Enterprise Legion'
    const profitParticipation=String(body.profitParticipation||'').trim().slice(0,4000)||null
    const note=String(body.note||'').trim().slice(0,2000)||null
    const [candidate]=await sql`
      SELECT id,name,email,role
      FROM users
      WHERE id=${userId}::uuid AND role IN ('agent','bridger')
        AND COALESCE(is_active,true)=true
        AND (COALESCE(is_subscription_exempt,false)=true OR (subscription_status='active' AND (subscription_expiry IS NULL OR subscription_expiry>NOW())))
        AND NOT EXISTS(SELECT 1 FROM enterprise_legions l WHERE l.source_user_id=users.id AND l.active=true AND l.employment_status='active')
      LIMIT 1
    `
    if(!candidate)return NextResponse.json({success:false,error:'This Agent or Bridger is not currently available for Legion recruitment.'},{status:404})
    const [existing]=await sql`
      SELECT id FROM legion_lifestyle_applications
      WHERE applicant_user_id=${candidate.id}::uuid AND client_id=${clientId}::uuid AND status='pending'
      LIMIT 1
    `
    if(existing)return NextResponse.json({success:true,applicationId:existing.id,alreadyPending:true})
    const [application]=await sql`
      INSERT INTO legion_lifestyle_applications(applicant_user_id,applicant_role,client_id,enterprise_application_id,file_number,direction,status,note,function_title,profit_participation)
      VALUES(${candidate.id}::uuid,${candidate.role},${clientId}::uuid,${enterprise.id}::uuid,${enterprise.file_number},'client_invite','pending',${note},${functionTitle},${profitParticipation})
      RETURNING *
    `
    await recordSystemEvent({eventType:'legion_invitation_created',actorId:clientId,actorRole:'client',subjectType:'user',subjectId:String(candidate.id),source:'enterprise-dream',payload:{enterpriseName:enterprise.enterprise_name,functionTitle}})
    return NextResponse.json({success:true,application},{status:201})
  }

  if(action==='accept_application'){
    const applicationId=String(body.applicationId||'')
    const functionTitle=String(body.functionTitle||'Enterprise Legion').trim().slice(0,255)||'Enterprise Legion'
    const profitParticipation=String(body.profitParticipation||'').trim().slice(0,4000)||null
    const [application]=await sql`
      SELECT la.*,u.name,u.email,u.role,u.subscription_status,u.subscription_expiry,u.is_subscription_exempt
      FROM legion_lifestyle_applications la
      JOIN users u ON u.id=la.applicant_user_id
      WHERE la.id=${applicationId}::uuid
        AND la.client_id=${clientId}::uuid
        AND la.direction='candidate_application'
        AND la.status='pending'
      LIMIT 1
    `
    if(!application)return NextResponse.json({success:false,error:'Legion application not found.'},{status:404})
    const subscriptionCurrent=Boolean(application.is_subscription_exempt)||(application.subscription_status==='active'&&(!application.subscription_expiry||new Date(application.subscription_expiry).getTime()>Date.now()))
    if(!subscriptionCurrent)return NextResponse.json({success:false,error:'The applicant no longer has an active Agent or Bridger subscription.'},{status:409})
    const currentCapacity=await capacityState(clientId)
    if(currentCapacity.count>=currentCapacity.capacity)return NextResponse.json({success:false,error:'Legion Quarter capacity is full.'},{status:409})
    const legion=await activateLegionEmployment(sql,{
      applicantUserId:String(application.applicant_user_id),applicantRole:String(application.applicant_role),clientId:String(clientId),enterpriseApplicationId:String(enterprise.id),fileNumber:String(enterprise.file_number),name:String(application.name||'Legion'),contact:String(application.email||''),functionTitle,profitParticipation,livelihoodRole:'Works exclusively for this Client inside Weave while Legion employment remains active.',
    })
    await recordSystemEvent({eventType:'legion_employment_activated',actorId:clientId,actorRole:'client',subjectType:'enterprise_legion',subjectId:String(legion.id),source:'enterprise-dream',payload:{enterpriseName:enterprise.enterprise_name,sourceRole:application.applicant_role,exclusive:true}})
    return NextResponse.json({success:true,legion,exclusive:true},{status:201})
  }

  return NextResponse.json({success:false,error:'Unsupported recruitment action.'},{status:400})
}
