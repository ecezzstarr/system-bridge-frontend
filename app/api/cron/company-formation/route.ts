import {NextRequest,NextResponse} from 'next/server'
import {hasWeaveSchedulerAuthority} from '@/lib/weave-scheduler-auth'
import {runCompanyFormationDailyReview} from '@/lib/company-formation-review'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  if(!await hasWeaveSchedulerAuthority(request,{
    workflowPath:'.github/workflows/weave-file-folder-sales-manager.yml'
  }))return NextResponse.json({error:'Unauthorized Company of Time scheduler'},{status:401})
  try{
    const result=await runCompanyFormationDailyReview()
    return NextResponse.json({success:true,result},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[company formation daily review]',error)
    return NextResponse.json({error:'Company formation reconciliation failed'},{status:503})
  }
}
