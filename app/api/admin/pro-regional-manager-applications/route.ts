import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql} from '@/lib/db'
import {ensureProRegionalManagerApplicationsSchema} from '@/lib/pro-regional-manager-applications'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
async function reviewer(request:NextRequest){
 const user=await getAuthUser(request)
 return user?.role==='admin'?user:null
}
export async function GET(request:NextRequest){
 const admin=await reviewer(request)
 if(!admin)return NextResponse.json({error:'Administration access required'},{status:403,headers})
 try{
  await ensureProRegionalManagerApplicationsSchema()
  const status=request.nextUrl.searchParams.get('status')||'pending'
  if(!['pending','approved_pending_verification','rejected','withdrawn','all'].includes(status))
   return NextResponse.json({error:'Invalid status'},{status:400,headers})
  const limit=Math.min(100,Math.max(1,Number.parseInt(request.nextUrl.searchParams.get('limit')||'50',10)||50))
  const offset=Math.max(0,Number.parseInt(request.nextUrl.searchParams.get('offset')||'0',10)||0)
  const applications=status==='all'
   ?await sql`SELECT a.*,u.name,u.email,u.role AS current_role,u.is_active
     FROM weave_pro_regional_manager_applications a JOIN users u ON u.id=a.user_id
     ORDER BY a.submitted_at DESC LIMIT ${limit} OFFSET ${offset}`
   :await sql`SELECT a.*,u.name,u.email,u.role AS current_role,u.is_active
     FROM weave_pro_regional_manager_applications a JOIN users u ON u.id=a.user_id
     WHERE a.status=${status}
     ORDER BY a.submitted_at DESC LIMIT ${limit} OFFSET ${offset}`
  const [count]=status==='all'
   ?await sql`SELECT COUNT(*)::int AS total FROM weave_pro_regional_manager_applications`
   :await sql`SELECT COUNT(*)::int AS total FROM weave_pro_regional_manager_applications WHERE status=${status}`
  return NextResponse.json({success:true,positionType:'pro_regional_manager',
   applications,pagination:{total:Number(count?.total||0),limit,offset,
    hasMore:offset+applications.length<Number(count?.total||0)}},{headers})
 }catch(e){console.error('[Admin Pro Regional Manager read]',e)
  return NextResponse.json({error:'Unable to read Pro Regional Manager applications'},{status:503,headers})}
}
export async function POST(request:NextRequest){
 const admin=await reviewer(request)
 if(!admin)return NextResponse.json({error:'Administration access required'},{status:403,headers})
 try{
  const body=await request.json().catch(()=>null)
  const id=String(body?.userId||'').trim()
  const decision=String(body?.decision||'')
  const reviewNote=String(body?.reviewNote||'').trim()
  if(!/^[0-9a-f-]{36}$/i.test(id)||!['approve','reject'].includes(decision)||
    reviewNote.length<10||reviewNote.length>2000)
   return NextResponse.json({error:'Valid applicant, decision and documented Administration review note required.'},{status:400,headers})
  const salary=Number(body.monthlySalaryUSDT)
  const reference=String(body.employmentTermsReference||'').trim()
  if(decision==='approve'&&(
   body.independentlyVerified!==true||
   !Number.isFinite(salary)||salary<=0||salary>100000||
   Math.round(salary*100)!==salary*100||
   reference.length<8||reference.length>255))
   return NextResponse.json({error:'Independently confirm the existing agreed salary and signed company employment terms. Enter actual salary amount and verifiable agreement reference before approving.'},{status:400,headers})
  await ensureProRegionalManagerApplicationsSchema()
  const status=decision==='approve'?'approved_pending_verification':'rejected'
  // A reviewed application is NOT a Pro File Folder grant or paid/activated position.
  const [approved]=await sql`UPDATE weave_pro_regional_manager_applications a
   SET status=${status},agreed_monthly_salary_usdt=${decision==='approve'?salary:null},
     employment_terms_reference=${decision==='approve'?reference:null},
     reviewed_by=${admin.id}::uuid,reviewed_at=now(),
     review_note=${reviewNote},updated_at=now()
   FROM users u
   WHERE a.user_id=${id}::uuid AND a.user_id=u.id
     AND a.status='pending' AND u.is_active=true AND u.role=a.source_role
     AND u.role IN ('agent','bridger')
   RETURNING a.user_id,a.source_role,a.status,a.business_name,a.agreed_monthly_salary_usdt`
  if(!approved)return NextResponse.json({error:'Application was already reviewed or applicant role is no longer eligible.'},{status:409,headers})
  return NextResponse.json({success:true,application:approved,
    notice:decision==='approve'
     ?'Employment terms reviewed. Pro File Folder and activation remain pending independent identity, original-role folder ownership and payment checks.'
     :'Application rejected with a recorded Administration reason.'},{headers})
 }catch(e){console.error('[Admin Pro Regional Manager review]',e)
  return NextResponse.json({error:'Unable to review the Pro Regional Manager application'},{status:503,headers})}
}
