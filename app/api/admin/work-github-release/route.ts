import {NextRequest,NextResponse} from 'next/server'
import {requireWorkshopAuthorization} from '@/lib/workshop-auth'
import {workGithubReleaseBoard,mergeApprovedWorkPull} from '@/lib/weave-github-release'
export const dynamic='force-dynamic'
export const runtime='nodejs'

export async function GET(request:NextRequest){
  const auth=await requireWorkshopAuthorization(request)
  if(!auth.authorized)return auth.response
  try{
    return NextResponse.json({success:true,...await workGithubReleaseBoard()},{
      headers:{'Cache-Control':'private, no-store'},
    })
  }catch(error){console.error('[Work GitHub handoff]',error)
    return NextResponse.json({error:'GitHub handoff unavailable. Check repository access and network.'},{status:503})}
}
export async function POST(request:NextRequest){
  const auth=await requireWorkshopAuthorization(request)
  if(!auth.authorized)return auth.response
  try{
    if(!request.headers.get('content-type')?.includes('application/json'))
      return NextResponse.json({error:'JSON request required'},{status:415})
    const body=await request.json()
    if(body?.action!=='merge_work_pr')
      return NextResponse.json({error:'Unsupported GitHub operation'},{status:400})
    const number=Number(body.number)
    const result=await mergeApprovedWorkPull({
      number,headSha:String(body.headSha||''),
      adminId:String(auth.session.user.id),confirmation:String(body.confirmation||''),
    })
    return NextResponse.json({success:true,result},{
      headers:{'Cache-Control':'private, no-store'},
    })
  }catch(error:any){
    console.error('[Work GitHub merge refused]',error instanceof Error?error.message:'unknown')
    return NextResponse.json({error:String(error?.message||'GitHub refused merge')},{status:409})
  }
}
