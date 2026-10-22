import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import {
  getDistributionAssistantState,applyForDistributionAssistant,reviewDistributionAssistant,
} from '@/lib/distribution-assistants'

export const dynamic='force-dynamic'

export async function GET(request:NextRequest) {
  const user=await getAuthUser(request)
  if (!user) return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  if (!['agent','bridger'].includes(user.role)) return NextResponse.json({success:false,error:'Agent or Bridger position required'},{status:403})
  try {
    const access=await getLifestyleAccess(user.id)
    return NextResponse.json({success:true,eligible:access.active,state:await getDistributionAssistantState(user.id)},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    console.error('[distribution assistant API] GET failed',error)
    return NextResponse.json({success:false,error:'Distribution employment unavailable'},{status:500})
  }
}

export async function POST(request:NextRequest) {
  const user=await getAuthUser(request)
  if (!user) return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  if (!['agent','bridger'].includes(user.role)) return NextResponse.json({success:false,error:'Agent or Bridger position required'},{status:403})
  const body=await request.json().catch(()=>({}))
  if (body.action==='apply') {
    const result=await applyForDistributionAssistant(user.id,String(body.applicationNote||''))
    if (!result.success) {
      const errors:Record<string,string>={
        position_inactive:'An active Agent or Bridger position is required.',
        invalid_note:'Describe your distribution experience and monthly referral plan in 30–2000 characters.',
        already_applied:'You already have an active assistant application or appointment.',
        already_manager:'A current Distribution Manager cannot also hold an Assistant Manager position.',
        not_eligible:'Only active Agents and Bridgers may apply.',
      }
      return NextResponse.json({success:false,error:errors[result.reason]||'Assistant application unavailable'},{status:result.reason==='error'?500:result.reason==='already_applied'?409:400})
    }
    return NextResponse.json({success:true,state:await getDistributionAssistantState(user.id)})
  }
  if (body.action==='approve'||body.action==='reject') {
    const applicantId=String(body.applicantId||'')
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicantId))
      return NextResponse.json({success:false,error:'Invalid applicant ID'},{status:400})
    const result=await reviewDistributionAssistant(user.id,applicantId,body.action)
    if(!result.success) {
      const errors:Record<string,string>={
        not_manager:'Only an active Distribution Manager may review assistant applications.',
        not_pending:'The application is no longer pending.',
        administration_verification_required:'Administration must verify this application before the lead Manager can appoint an assistant.',
        positions_full:'All six Assistant Distribution Manager positions are filled.',
        manager_team_full:'This Distribution Manager already has two appointed assistants.',
        already_manager:'This applicant currently holds a Distribution Manager position.',
      }
      return NextResponse.json({success:false,error:errors[result.reason]||'Could not review the application'},{status:result.reason==='error'?500:409})
    }
    return NextResponse.json({success:true,state:await getDistributionAssistantState(user.id)})
  }
  return NextResponse.json({success:false,error:'Unknown distribution assistant action'},{status:400})
}
