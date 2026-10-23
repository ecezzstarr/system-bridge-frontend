import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getReleaseWorkshopState,requestReleaseJob,fullReleaseSha} from '@/lib/weave-release-workshop'
export const dynamic='force-dynamic'

async function authorize(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return {error:NextResponse.json({error:'Login required'},{status:401})}
  if(user.role!=='admin')return {error:NextResponse.json({error:'Administration only'},{status:403})}
  return {user}
}

export async function GET(request:NextRequest){
  const auth=await authorize(request)
  if(auth.error)return auth.error
  try{return NextResponse.json({success:true,...await getReleaseWorkshopState()},{headers:{'Cache-Control':'private, no-store'}})}
  catch(error){console.error('[Release Workshop read]',error);return NextResponse.json({error:'Release state unavailable'},{status:500})}
}

export async function POST(request:NextRequest){
  const auth=await authorize(request)
  if(auth.error)return auth.error
  try{
    if(!request.headers.get('content-type')?.includes('application/json'))
      return NextResponse.json({error:'JSON submission required'},{status:415})
    const body=await request.json()
    const action=body?.action
    if(action!=='deploy_latest'&&action!=='rollback')
      return NextResponse.json({error:'Only verified deployment or historical rollback is allowed'},{status:400})
    if(action==='rollback'&&!fullReleaseSha(body?.targetSha))
      return NextResponse.json({error:'Select an exact 40-character release SHA'},{status:400})
    const job=await requestReleaseJob({
      action,targetSha:body?.targetSha,userId:auth.user!.id,
      confirmation:String(body?.confirmation||''),
    })
    return NextResponse.json({success:true,job},{status:202,headers:{'Cache-Control':'private, no-store'}})
  }catch(error:any){
    console.error('[Release Workshop request]',error)
    return NextResponse.json({error:error?.message||'Release request rejected'},{status:400})
  }
}
