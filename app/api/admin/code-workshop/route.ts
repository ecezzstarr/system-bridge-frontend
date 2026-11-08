import {NextRequest,NextResponse} from 'next/server'
import {requireWorkshopAuthorization} from '@/lib/workshop-auth'
import {
 CODE_WORKSHOP_POLICY,isCodeWorkshopWritable,readWorkshopSource,workshopActivity,
 createWorkshopBranch,commitWorkshopFile,createWorkshopReview,
} from '@/lib/weave-code-workshop'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const noStore={'Cache-Control':'private, no-store'}

export async function GET(request:NextRequest){
 const auth=await requireWorkshopAuthorization(request)
 if(!auth.authorized)return auth.response
 const userId=String(auth.session.user.id)
 try{
  const params=request.nextUrl.searchParams
  const kind=params.get('mode')||'file'
  if(kind==='activity'){
   const entries=await workshopActivity(userId)
   return NextResponse.json({success:true,kind,entries,policy:CODE_WORKSHOP_POLICY,
    writingConfigured:isCodeWorkshopWritable()},{headers:noStore})
  }
  if(kind!=='file'&&kind!=='directory')
   return NextResponse.json({error:'Unsupported source view'},{status:400,headers:noStore})
  const source=await readWorkshopSource({
   actorId:userId,branch:params.get('branch')||'main',
   ...(kind==='directory'?{directory:params.get('path')||'app'}:{path:params.get('path')||'app/page.tsx'}),
  })
  return NextResponse.json({success:true,...source,policy:CODE_WORKSHOP_POLICY,
   writingConfigured:isCodeWorkshopWritable()},{headers:noStore})
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:'Source could not be read'},
   {status:400,headers:noStore})
 }
}

export async function POST(request:NextRequest){
 const auth=await requireWorkshopAuthorization(request)
 if(!auth.authorized)return auth.response
 if(!request.headers.get('content-type')?.includes('application/json'))
  return NextResponse.json({error:'JSON submission required'},{status:415,headers:noStore})
 if(Number(request.headers.get('content-length')||0)>150000)
  return NextResponse.json({error:'Source request exceeds maximum length'},{status:413,headers:noStore})
 const body=await request.json().catch(()=>null)
 if(!body||typeof body!=='object'||Array.isArray(body))
  return NextResponse.json({error:'Valid source submission required'},{status:400,headers:noStore})
 try{
  const actorId=String(auth.session.user.id)
  let result:unknown
  if(body.action==='create_branch'){
   result=await createWorkshopBranch(actorId,String(body.confirmation||''))
  }else if(body.action==='save_file'){
   result=await commitWorkshopFile({
    actorId,branch:String(body.branch||''),path:String(body.path||''),
    content:body.content,expectedSha:typeof body.expectedSha==='string'?body.expectedSha:null,
    message:String(body.message||''),confirmation:String(body.confirmation||''),
   })
  }else if(body.action==='open_review'){
   result=await createWorkshopReview({
    actorId,branch:String(body.branch||''),title:String(body.title||''),
    summary:String(body.summary||''),confirmation:String(body.confirmation||''),
    workArea:body.workArea,
    attestations:Array.isArray(body.attestations)?body.attestations:[],
   })
  }else return NextResponse.json({error:'Unsupported Code Workshop action'},{status:400,headers:noStore})
  return NextResponse.json({success:true,result},{headers:noStore})
 }catch(error){
  console.error('[WEAVE Code Workshop] refused',error instanceof Error?error.message:'unknown')
  return NextResponse.json({error:error instanceof Error?error.message:'Code operation unavailable'},
   {status:409,headers:noStore})
 }
}
