import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {validNativeDepartment} from '@/lib/weave-native-blueprint'
import {
 getNativePublished,getNativeProgress,listNativePublished,setNativeStep,
} from '@/lib/weave-native-registry'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const noStore={'Cache-Control':'private, no-store'}
export async function GET(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user)return NextResponse.json({error:'Active WEAVE account required'},{status:401,headers:noStore})
 const department=request.nextUrl.searchParams.get('department')
 if(!validNativeDepartment(department))
  return NextResponse.json({error:'Choose a department'},{status:400,headers:noStore})
 try{
  const slug=request.nextUrl.searchParams.get('slug')
  if(!slug){
   const modules=await listNativePublished(department,user.role)
   return NextResponse.json({success:true,modules},{headers:noStore})
  }
  const module=await getNativePublished(department,slug,user.role)
  if(!module)return NextResponse.json({error:'Module not published'},{status:404,headers:noStore})
  const progress=module.blueprint.kind==='system'
   ?await getNativeProgress(module.id,user.id):[]
  return NextResponse.json({success:true,module,progress},{headers:noStore})
 }catch(error){
  const message=error instanceof Error?error.message:'Module not available'
  const status=message==='Department access denied'?403:400
  return NextResponse.json({error:message},{status,headers:noStore})
 }
}
export async function POST(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user)return NextResponse.json({error:'Account required'},{status:401,headers:noStore})
 if(!request.headers.get('content-type')?.includes('application/json'))
  return NextResponse.json({error:'JSON required'},{status:415,headers:noStore})
 if(Number(request.headers.get('content-length')||0)>2500)
  return NextResponse.json({error:'Action exceeds limit'},{status:413,headers:noStore})
 const body=await request.json().catch(()=>null)
 if(!body||body.action!=='set_step'||typeof body.completed!=='boolean'||
  typeof body.stepId!=='string'||typeof body.releaseId!=='string')
  return NextResponse.json({error:'Valid work step required'},{status:400,headers:noStore})
 try{
  const progress=await setNativeStep({
   releaseId:body.releaseId,userId:user.id,role:user.role,
   stepId:body.stepId,completed:body.completed,
  })
  return NextResponse.json({success:true,progress},{headers:noStore})
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:'Cannot record step'},
   {status:403,headers:noStore})
 }
}
