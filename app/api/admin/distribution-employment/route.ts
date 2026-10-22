import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { listManagerEmploymentForAdmin,reviewManagerEmployment } from '@/lib/manager-employment'
import { readDistributionEmploymentOverview } from '@/lib/distribution-team-updates'
import {reviewAssistantEligibilityByAdministration} from '@/lib/distribution-assistant-admin-review'
export const dynamic='force-dynamic'
async function admin(request:NextRequest){
  const user=await getAuthUser(request)
  return user?.role==='admin'?user:null
}
export async function GET(request:NextRequest){
  const user=await admin(request)
  if(!user)return NextResponse.json({success:false,error:'Administration required'},{status:403})
  try{
    const [appointments,overview]=await Promise.all([
      listManagerEmploymentForAdmin(user.id),
      readDistributionEmploymentOverview(),
    ])
    return NextResponse.json({success:true,appointments,overview,readOnlyReports:true},
      {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[distribution verification] reading failed',error)
    return NextResponse.json({success:false,error:'Unable to load verification desk'},{status:500})}
}
export async function POST(request:NextRequest){
  const user=await admin(request)
  if(!user)return NextResponse.json({success:false,error:'Administration required'},{status:403})
  const body=await request.json().catch(()=>({}))
  if(!['approve','reject'].includes(body.action)
    ||typeof body.applicantId!=='string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.applicantId)
    || typeof body.note!=='string'||body.note.trim().length<10||body.note.trim().length>1200)
    return NextResponse.json({success:false,error:'Provide a valid applicant, decision and verification reason of 10–1200 characters.'},{status:400})
  if(body.position==='distribution_assistant'){
    if(!['verify','decline'].includes(body.action))
      return NextResponse.json({success:false,error:'Choose Verify eligibility or Decline application.'},{status:400})
    const outcome=await reviewAssistantEligibilityByAdministration(
      user.id,body.applicantId,body.action,body.note)
    if(!outcome.success)
      return NextResponse.json({success:false,error:outcome.reason==='not_pending'?
        'Application is no longer awaiting Administration verification. Refresh the desk.':
        outcome.reason==='ineligible'?'Applicant does not currently meet position eligibility.':
        'Assistant application decision could not be recorded.'},{status:outcome.reason==='not_pending'?409:400})
    return NextResponse.json({success:true,verification:outcome.verification},
      {headers:{'Cache-Control':'private, no-store'}})
  }
    const result=await reviewManagerEmployment(user.id,body.applicantId,body.action,body.note)
  if(!result.success)return NextResponse.json({success:false,error:
    result.reason==='not_pending'?'Application is no longer pending. Refresh the desk.':
    result.reason==='not_eligible'?'Applicant is not an active eligible Agent or Bridger.':
    'Verification could not be completed.'},{status:result.reason==='not_pending'?409:400})
  return NextResponse.json({success:true,employment:result.employment},
    {headers:{'Cache-Control':'private, no-store'}})
}
