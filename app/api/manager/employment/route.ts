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
  DISTRIBUTION_MANAGER_CORE_DUTY,
} from '@/lib/manager-employment'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (!['agent','bridger'].includes(user.role)) {
    return NextResponse.json({ success:false, error:'Distribution Manager Lifestyle is available only to Agent or Bridger identities.' }, { status:403 })
  }

  const state = await getManagerEmploymentState(user.id)
  const agentFree = user.role === 'agent'
  return NextResponse.json({
    success:true,
    state,
    terms:{
      positions:MANAGER_EMPLOYMENT_LIMIT,
      monthlySalaryNgn:MANAGER_MONTHLY_SALARY_NGN,
      probationTarget:MANAGER_PROBATION_TARGET,
      monthlyReferralTarget:MANAGER_PROBATION_TARGET,
      referralTargetScope:'manager_and_two_assistants',
      probationMonths:1,
      documentVersion:MANAGER_DOCUMENT_VERSION,
      continuanceNgn:agentFree ? 0 : MANAGER_CONTINUANCE_NGN,
      positionSubscriptionNgn:agentFree ? 0 : POSITION_MONTHLY_SUBSCRIPTION_NGN,
      subscriptionRule:agentFree
        ? 'The active Agent position opens Distribution Manager Lifestyle without a monthly subscription.'
        : 'Distribution Manager is covered by active Bridger Continuance. It has no second Distribution Manager-only subscription.',
      coreDuty:DISTRIBUTION_MANAGER_CORE_DUTY,
    },
  }, { headers:{ 'Cache-Control':'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (!['agent','bridger'].includes(user.role)) {
    return NextResponse.json({ success:false, error:'Distribution Manager Lifestyle is available only to an Agent or Bridger.' }, { status:403 })
  }

  const body = await request.json().catch(() => ({}))

  if (body?.action === 'subscribe_continuance') {
    if (user.role === 'agent') {
      return NextResponse.json({
        success:true,
        result:{success:true,renewed:false,reason:'agent_position_free',flameCoinAmount:0},
        state:await getManagerEmploymentState(user.id),
      })
    }
    const result=await subscribeManagerContinuance(user.id)
    if(!result.success){
      if(result.reason==='insufficient_balance') return NextResponse.json({...result,error:'Insufficient Flame Coin to renew the Bridger monthly subscription.'},{status:402})
      if(result.reason==='rate_unavailable') return NextResponse.json({success:false,error:'Bridger Continuance rate is temporarily unavailable.'},{status:503})
      return NextResponse.json({success:false,error:'Bridger monthly subscription could not be activated.'},{status:500})
    }
    return NextResponse.json({success:true,result,state:await getManagerEmploymentState(user.id)})
  }

  if (body?.action !== 'accept_document' || body?.documentVersion !== MANAGER_DOCUMENT_VERSION || body?.accepted !== true) {
    return NextResponse.json({ success:false, error:'The current Distribution Manager Lifestyle document must be accepted explicitly.' }, { status:400 })
  }

  const result = await acceptManagerEmploymentDocument(user.id, String(body?.signature || ''))
  if (!result.success) {
    if (result.reason === 'continuance_required') {
      return NextResponse.json({
        success:false,
        error:user.role === 'agent'
          ? 'An active Agent account is required before Distribution Manager Lifestyle can begin.'
          : 'Active Bridger Continuance is required before Distribution Manager Lifestyle can begin.',
      }, { status:403 })
    }
    if (result.reason === 'positions_full') {
      return NextResponse.json({ success:false, error:`All ${MANAGER_EMPLOYMENT_LIMIT} Distribution Manager positions are currently occupied.` }, { status:409 })
    }
    if (result.reason === 'already_assistant') {
      return NextResponse.json({ success:false, error:'An appointed Assistant Distribution Manager cannot simultaneously accept a lead Distribution Manager position.' }, { status:409 })
    }
    if (result.reason === 'signature_mismatch') {
      return NextResponse.json({ success:false, error:'The document signature must match the full name on the Agent/Bridger account.' }, { status:400 })
    }
    if (result.reason === 'error') {
      return NextResponse.json({ success:false, error:'Distribution Manager Lifestyle could not be recorded.' }, { status:500 })
    }
    return NextResponse.json({ success:false, error:'This account is not eligible for Distribution Manager Lifestyle.' }, { status:403 })
  }

  const state = await getManagerEmploymentState(user.id)
  return NextResponse.json({ success:true, created:result.created, state })
}
