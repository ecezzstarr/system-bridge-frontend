import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import {
  acceptManagerEmploymentDocument,
  getManagerEmploymentState,
  subscribeManagerContinuance,
  MANAGER_EMPLOYMENT_LIMIT,
  MANAGER_MONTHLY_SALARY_NGN,
  MANAGER_PROBATION_TARGET,
  MANAGER_DOCUMENT_VERSION,
  MANAGER_CONTINUANCE_NGN,
  POSITION_MONTHLY_SUBSCRIPTION_NGN,
} from '@/lib/manager-employment'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (!['agent','bridger'].includes(user.role)) {
    return NextResponse.json({ success:false, error:'Manager lifestyle is available only to Agent or Bridger identities.' }, { status:403 })
  }

  const state = await getManagerEmploymentState(user.id)
  return NextResponse.json({
    success:true,
    state,
    terms:{
      positions:MANAGER_EMPLOYMENT_LIMIT,
      monthlySalaryNgn:MANAGER_MONTHLY_SALARY_NGN,
      probationTarget:MANAGER_PROBATION_TARGET,
      probationMonths:1,
      documentVersion:MANAGER_DOCUMENT_VERSION,
      continuanceNgn:MANAGER_CONTINUANCE_NGN,
      positionSubscriptionNgn:POSITION_MONTHLY_SUBSCRIPTION_NGN,
      subscriptionRule:'Manager is covered by the active Agent or Bridger monthly subscription. It has no second Manager-only subscription.',
      coreDuty:'Market WEAVE to prospective Agents and Bridgers and carry verified referral movement.',
    },
  }, { headers:{ 'Cache-Control':'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (!['agent','bridger'].includes(user.role)) {
    return NextResponse.json({ success:false, error:'Manager lifestyle is available only to an Agent or Bridger.' }, { status:403 })
  }

  const body = await request.json().catch(() => ({}))

  if (body?.action === 'subscribe_continuance') {
    const result=await subscribeManagerContinuance(user.id)
    if(!result.success){
      if(result.reason==='insufficient_balance') return NextResponse.json({...result,error:`Insufficient Flame Coin to renew the ${user.role === 'agent' ? 'Agent' : 'Bridger'} monthly subscription.`},{status:402})
      if(result.reason==='rate_unavailable') return NextResponse.json({success:false,error:'Position subscription rate is temporarily unavailable.'},{status:503})
      return NextResponse.json({success:false,error:'Position monthly subscription could not be activated.'},{status:500})
    }
    return NextResponse.json({success:true,result,state:await getManagerEmploymentState(user.id)})
  }

  if (body?.action !== 'accept_document' || body?.documentVersion !== MANAGER_DOCUMENT_VERSION || body?.accepted !== true) {
    return NextResponse.json({ success:false, error:'The current Manager lifestyle document must be accepted explicitly.' }, { status:400 })
  }

  const result = await acceptManagerEmploymentDocument(user.id, String(body?.signature || ''))
  if (!result.success) {
    if (result.reason === 'continuance_required') {
      return NextResponse.json({ success:false, error:`An active ${user.role === 'agent' ? 'Agent' : 'Bridger'} monthly subscription is required before Manager lifestyle can begin.` }, { status:403 })
    }
    if (result.reason === 'positions_full') {
      return NextResponse.json({ success:false, error:`All ${MANAGER_EMPLOYMENT_LIMIT} Manager positions are currently occupied.` }, { status:409 })
    }
    if (result.reason === 'signature_mismatch') {
      return NextResponse.json({ success:false, error:'The document signature must match the full name on the Agent/Bridger account.' }, { status:400 })
    }
    if (result.reason === 'error') {
      return NextResponse.json({ success:false, error:'Manager lifestyle could not be recorded.' }, { status:500 })
    }
    return NextResponse.json({ success:false, error:'This account is not eligible for Manager lifestyle.' }, { status:403 })
  }

  const state = await getManagerEmploymentState(user.id)
  return NextResponse.json({ success:true, created:result.created, state })
}
