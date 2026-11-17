import {NextRequest,NextResponse} from 'next/server'
import {requireWorkshopAuthorization} from '@/lib/workshop-auth'
import {validNativeDepartment} from '@/lib/weave-native-blueprint'
import {
 draftNativeModule,listNativeReleases,listNativeSubmissions,publishNativeModule,prepareNativeRollback,unpublishNativeModule,
} from '@/lib/weave-native-registry'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const noStore={'Cache-Control':'private, no-store'}
const errorResponse=(error:unknown)=>NextResponse.json(
 {error:error instanceof Error?error.message:'Publication unavailable'},
 {status:409,headers:noStore})

/** Only appointed source operators can publish new company runtime modules. */
export async function GET(request:NextRequest){
 const auth=await requireWorkshopAuthorization(request)
 if(!auth.authorized)return auth.response
 const params=request.nextUrl.searchParams
 const department=params.get('department')
 if(!validNativeDepartment(department))
  return NextResponse.json({error:'Choose a department'},{status:400,headers:noStore})
 try{
  if(params.get('mode')==='submissions'){
   const slug=params.get('slug')
   if(!slug)return NextResponse.json({error:'Select a published module'},{status:400,headers:noStore})
   const submissions=await listNativeSubmissions(department,slug)
   return NextResponse.json({success:true,submissions},{headers:noStore})
  }
  const releases=await listNativeReleases(department,params.get('slug')||undefined)
  return NextResponse.json({success:true,releases},{headers:noStore})
 }catch(error){return errorResponse(error)}
}
export async function POST(request:NextRequest){
 const auth=await requireWorkshopAuthorization(request)
 if(!auth.authorized)return auth.response
 if(!request.headers.get('content-type')?.includes('application/json'))
  return NextResponse.json({error:'JSON required'},{status:415,headers:noStore})
 if(Number(request.headers.get('content-length')||0)>60000)
  return NextResponse.json({error:'Module exceeds maximum size'},{status:413,headers:noStore})
 const body=await request.json().catch(()=>null)
 if(!body||typeof body!=='object'||Array.isArray(body))
  return NextResponse.json({error:'Valid module required'},{status:400,headers:noStore})
 try{
  const actorId=String(auth.session.user.id)
  if(body.action==='draft'){
   const release=await draftNativeModule(body.blueprint,actorId)
   return NextResponse.json({success:true,release},{status:201,headers:noStore})
  }
  if(body.action==='publish'){
   if(body.confirmation!=='PUBLISH WEAVE MODULE')
    return NextResponse.json({error:'Type PUBLISH WEAVE MODULE'},{status:400,headers:noStore})
   const published=await publishNativeModule({
    releaseId:String(body.releaseId||''),actorId,
    expectedPublishedId:typeof body.expectedPublishedId==='string'?body.expectedPublishedId:null,
   })
   return NextResponse.json({success:true,published},{headers:noStore})
  }
  if(body.action==='unpublish'){
   if(body.confirmation!=='UNPUBLISH WEAVE MODULE')
    return NextResponse.json({error:'Type UNPUBLISH WEAVE MODULE'},{status:400,headers:noStore})
   if(!validNativeDepartment(body.department))
    return NextResponse.json({error:'Choose a valid department'},{status:400,headers:noStore})
   const unpublished=await unpublishNativeModule({
    department:body.department,slug:String(body.slug||''),
    actorId,expectedPublishedId:String(body.expectedPublishedId||''),
   })
   return NextResponse.json({success:true,unpublished},{headers:noStore})
  }
  if(body.action==='prepare_rollback'){
   const release=await prepareNativeRollback(Number(body.version),actorId)
   return NextResponse.json({success:true,release},{status:201,headers:noStore})
  }
  return NextResponse.json({error:'Unknown native module operation'},{status:400,headers:noStore})
 }catch(error){return errorResponse(error)}
}
