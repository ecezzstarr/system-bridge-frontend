import {NextRequest,NextResponse} from 'next/server'
import {sql} from '@/lib/db'
import {getProManagerApplicant,getActiveProRegionalManager,
 ensureProRegionalManagerActivationSchema} from '@/lib/pro-regional-manager-activation'
import {proRegionalManagerDepartment} from '@/lib/pro-regional-manager-policy'
import {getFileFolderWorldSnapshot} from '@/lib/client-file-folder-world'
import {ensureClientBusinessStore} from '@/lib/client-business-store'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
const allowedTypes=['business_contact','partnership','department_operation',
 'customer_service','follow_up','company_report']
const allowedStatuses=['planned','in_progress','completed','blocked']

export async function GET(request:NextRequest){
 try{
  const applicant=await getProManagerApplicant(request)
  if(!applicant)return NextResponse.json({error:'Agent or Bridger Pro Regional Manager applicant access required.'},{status:403,headers})
  const {row,user}=applicant
  const active=await getActiveProRegionalManager(request)
  const department=proRegionalManagerDepartment(row.source_role)
  const position={type:'pro_regional_manager',originalRole:row.source_role,
    department:department?.department,workScope:department?.workScope,
    dailyWork:department?.dailyWork,
    businessName:row.business_name,fileNumber:row.file_number||null,
    territory:{country:row.operating_country,region:row.operating_region,
      city:row.operating_city,address:row.contact_address},
    businessPlan:row.business_plan,dailyWorkPlan:row.daily_work_plan,
    agreedMonthlySalaryUSDT:Number(row.agreed_monthly_salary_usdt||0),
    employmentTermsReference:row.employment_terms_reference,
    applicationStatus:row.application_status,activationStatus:row.activation_status||'not_prepared'}
  if(!active)return NextResponse.json({success:true,active:false,position,
    message:'Pro File Folder work opens only after approved company employment, signed agreement, independently verified activation and original account ownership.'},{headers})
  await ensureProRegionalManagerActivationSchema()
  const world=await getFileFolderWorldSnapshot(sql,String(user.id),String(row.file_number))
  const store=await ensureClientBusinessStore(sql,String(user.id),String(row.file_number),
    String(row.business_name),false)
  const [items,orders,doorSystems,activity]=await Promise.all([
   sql`SELECT id,name,description,price,currency,offer_type,enabled,created_at
     FROM client_store_items WHERE store_id=${store.id}::uuid ORDER BY created_at DESC LIMIT 100`,
   sql`SELECT id,item_id,customer_name,customer_contact,customer_wallet,payment_reference,
     customer_note,amount,currency,status,payment_status,created_at
     FROM client_store_orders WHERE store_id=${store.id}::uuid ORDER BY created_at DESC LIMIT 100`,
   sql`SELECT s.id AS system_id,s.system_type,s.title,s.status,
     COALESCE(p.public_label,s.title) AS public_label,p.public_summary,
     COALESCE(p.enabled,false) AS public_enabled,p.published_at
     FROM client_built_systems s
     LEFT JOIN client_customer_door_systems p ON p.system_id=s.id
       AND p.store_id=${store.id}::uuid
     WHERE s.client_id=${user.id}::uuid AND s.file_number=${row.file_number}
       AND s.status='active' AND s.system_type<>'customer_door'
     ORDER BY s.activated_at DESC LIMIT 100`,
   sql`SELECT id,activity_type,title,organization,details,next_action,status,
      completed_at,created_at,updated_at
     FROM weave_pro_regional_manager_work WHERE user_id=${user.id}::uuid
     ORDER BY created_at DESC LIMIT 100`,
  ])
  return NextResponse.json({success:true,active:true,position,world,
    businessStore:{...store,items,orders,customer_door_systems:doorSystems,
      public_url:'/market/'+store.public_slug},
    activity,notice:'Departmental work, company payroll, customer orders and File Folder purchases are separate records. Customer payments require actual settlement verification.'},{headers})
 }catch(e){console.error('[Pro Regional Manager workspace GET]',e)
  return NextResponse.json({error:'Unable to open Pro Manager workspace; contact Administration if this Pro File Folder was activated but is not initializing.'},{status:503,headers})}
}

export async function POST(request:NextRequest){
 try{
  const active=await getActiveProRegionalManager(request)
  if(!active)return NextResponse.json({error:'Independent Pro activation is required before recording company work.'},{status:403,headers})
  const body=await request.json().catch(()=>null)
  const title=String(body?.title||'').trim()
  const type=String(body?.activityType||'')
  const organization=String(body?.organization||'').trim()
  const details=String(body?.details||'').trim()
  const nextAction=String(body?.nextAction||'').trim()
  if(!allowedTypes.includes(type)||title.length<3||title.length>180||
   organization.length>180||details.length>4000||nextAction.length>1000)
   return NextResponse.json({error:'Select an authorized work type, meaningful title, and valid activity details.'},{status:400,headers})
  const [activity]=await sql`INSERT INTO weave_pro_regional_manager_work
    (user_id,source_role,activity_type,title,organization,details,next_action)
    VALUES(${active.user.id}::uuid,${active.row.source_role},${type},${title},
      ${organization||null},${details||null},${nextAction||null})
    RETURNING id,activity_type,title,organization,details,next_action,status,created_at`
  return NextResponse.json({success:true,activity},{status:201,headers})
 }catch(e){console.error('[Pro Manager work POST]',e)
  return NextResponse.json({error:'Unable to record this activity'},{status:503,headers})}
}

export async function PATCH(request:NextRequest){
 try{
  const active=await getActiveProRegionalManager(request)
  if(!active)return NextResponse.json({error:'Active Pro company position required'},{status:403,headers})
  const body=await request.json().catch(()=>null)
  const id=String(body?.id||'')
  const status=String(body?.status||'')
  const nextAction=String(body?.nextAction||'').trim()
  if(!/^[0-9a-f-]{36}$/i.test(id)||!allowedStatuses.includes(status)||nextAction.length>1000)
   return NextResponse.json({error:'Valid work record, status and next action required.'},{status:400,headers})
  const [activity]=await sql`UPDATE weave_pro_regional_manager_work
    SET status=${status},next_action=${nextAction||null},
      completed_at=CASE WHEN ${status}='completed' THEN COALESCE(completed_at,now()) ELSE NULL END,
      updated_at=now()
    WHERE id=${id}::uuid AND user_id=${active.user.id}::uuid
    RETURNING id,status,next_action,completed_at,updated_at`
  return activity?NextResponse.json({success:true,activity},{headers}):
   NextResponse.json({error:'Work record not found'},{status:404,headers})
 }catch(e){console.error('[Pro Manager work PATCH]',e)
  return NextResponse.json({error:'Unable to update company work'},{status:503,headers})}
}
