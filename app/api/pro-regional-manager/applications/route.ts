import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql} from '@/lib/db'
import {ensureProRegionalManagerApplicationsSchema} from '@/lib/pro-regional-manager-applications'
import {proRegionalManagerDepartment} from '@/lib/pro-regional-manager-policy'

export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}

async function applicant(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user||!['agent','bridger'].includes(user.role))return null
 const [active]=await sql`SELECT id FROM users WHERE id=${user.id}::uuid
  AND role=${user.role} AND is_active=true LIMIT 1`
 return active?user:null
}

export async function GET(request:NextRequest){
 try{
  const user=await applicant(request)
  if(!user)return NextResponse.json({error:'Only active Agents and Bridgers may apply through Lifestyle. External Clients verify their issued Pro File Number separately.'},{status:403,headers})
  await ensureProRegionalManagerApplicationsSchema()
  const [application]=await sql`SELECT source_role,operating_country,operating_region,operating_city,
    business_name,business_plan,daily_work_plan,status,agreed_monthly_salary_usdt,
    employment_terms_reference,review_note,submitted_at,reviewed_at
    FROM weave_pro_regional_manager_applications WHERE user_id=${user.id}::uuid LIMIT 1`
  return NextResponse.json({success:true,positionType:'pro_regional_manager',
    sourceRole:user.role,department:proRegionalManagerDepartment(user.role)?.department,
    fileFolderActivated:false,application:application||null},{headers})
 }catch(e){console.error('[Pro Regional Manager application read]',e)
  return NextResponse.json({error:'Unable to read the Pro Regional Manager application'},{status:503,headers})}
}

export async function POST(request:NextRequest){
 try{
  const user=await applicant(request)
  if(!user)return NextResponse.json({error:'Only active Agents and Bridgers apply through Lifestyle; external Clients use Pro File Number verification.'},{status:403,headers})
  if(Number(request.headers.get('content-length')||0)>24000)
   return NextResponse.json({error:'Application is too large.'},{status:413,headers})
  const body=await request.json().catch(()=>null)
  if(!body||typeof body!=='object')return NextResponse.json({error:'Complete the application.'},{status:400,headers})
  const country=String(body.operatingCountry||'').trim()
  const region=String(body.operatingRegion||'').trim()
  const city=String(body.operatingCity||'').trim()
  const address=String(body.contactAddress||'').trim()
  const businessName=String(body.businessName||'').trim()
  const dailyWorkPlan=String(body.dailyWorkPlan||'').trim()
  const rawPlan=body.businessPlan&&typeof body.businessPlan==='object'?body.businessPlan:{}
  const plan:Record<string,string>={}
  for(const key of ['businessActivity','customers','revenueModel','operations']){
   const value=String(rawPlan[key]||'').trim()
   if(value.length<10||value.length>3000)
    return NextResponse.json({error:'Every business plan section must contain 10–3000 characters.'},{status:400,headers})
   plan[key]=value
  }
  if(country.length<2||country.length>100||region.length<2||region.length>150||
     city.length<2||city.length>150||address.length<6||address.length>500||
     businessName.length<3||businessName.length>180||dailyWorkPlan.length<30||
     dailyWorkPlan.length>2500||body.termsAccepted!==true)
   return NextResponse.json({error:'Provide your operating country, region, city, contact address, business name, daily work plan and agreement to application terms.'},{status:400,headers})
  await ensureProRegionalManagerApplicationsSchema()
  const [record]=await sql`INSERT INTO weave_pro_regional_manager_applications
     (user_id,source_role,operating_country,operating_region,operating_city,contact_address,
      business_name,business_plan,daily_work_plan,status)
    VALUES (${user.id}::uuid,${user.role},${country},${region},${city},${address},
      ${businessName},${JSON.stringify(plan)}::jsonb,${dailyWorkPlan},'pending')
    ON CONFLICT(user_id) DO UPDATE SET
      source_role=EXCLUDED.source_role,operating_country=EXCLUDED.operating_country,
      operating_region=EXCLUDED.operating_region,operating_city=EXCLUDED.operating_city,
      contact_address=EXCLUDED.contact_address,business_name=EXCLUDED.business_name,
      business_plan=EXCLUDED.business_plan,daily_work_plan=EXCLUDED.daily_work_plan,
      status='pending',agreed_monthly_salary_usdt=NULL,employment_terms_reference=NULL,
      reviewed_by=NULL,reviewed_at=NULL,review_note=NULL,
      submitted_at=now(),updated_at=now()
    WHERE weave_pro_regional_manager_applications.status IN ('rejected','withdrawn')
    RETURNING status,submitted_at,business_name`
  if(!record)return NextResponse.json({error:'An application is already pending or approved; refresh your application status.'},{status:409,headers})
  return NextResponse.json({success:true,positionType:'pro_regional_manager',application:record,
    notice:'Application received for Administrations review. No Pro File Folder, activation charge, salary payment or additional permissions have been granted.'},{status:201,headers})
 }catch(e){console.error('[Pro Regional Manager application submit]',e)
  return NextResponse.json({error:'Unable to submit the Pro Regional Manager application'},{status:503,headers})}
}
