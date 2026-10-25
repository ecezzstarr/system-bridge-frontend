import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { FOOD_DISTRIBUTION_MONTHLY_TARGET } from '@/lib/food-distribution'
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
    return NextResponse.json({ success:false, error:'Food Distribution Manager Lifestyle is available only to Agent or Bridger identities.' }, { status:403 })
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
      monthlyFoodDistributionTarget:FOOD_DISTRIBUTION_MONTHLY_TARGET,
      foodDistributionTargetScope:'manager_and_two_assistants',
      salaryPaymentRule:'Full monthly salary is provisionally eligible when the team completes 200 Administration-verified food distribution handoffs during the calendar month, subject to month-end payroll verification. Referral bonuses are separate and are not part of this job target.',
      salaryPaidAutomatically:false,
      probationMonths:1,
      administrationVerificationRequired:true,
      probationStartRule:'Probation begins only after Administration verifies a signed Food Distribution Manager appointment.',
      documentVersion:MANAGER_DOCUMENT_VERSION,
      continuanceNgn:agentFree ? 0 : MANAGER_CONTINUANCE_NGN,
      positionSubscriptionNgn:agentFree ? 0 : POSITION_MONTHLY_SUBSCRIPTION_NGN,
      subscriptionRule:agentFree
        ? 'The active Agent position opens Food Distribution Manager Lifestyle without a monthly subscription.'
        : 'A one-time payment of 11 Flame Coin attains Agentic-Bridger, which enables Lifestyle access and eligibility to apply for Food Distribution Manager employment. Appointment requires Administration verification. There is no monthly Bridger subscription.',
      coreDuty:DISTRIBUTION_MANAGER_CORE_DUTY,
    },
  }, { headers:{ 'Cache-Control':'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (!['agent','bridger'].includes(user.role)) {
    return NextResponse.json({ success:false, error:'Food Distribution Manager Lifestyle is available only to an Agent or Bridger.' }, { status:403 })
  }

  const body = await request.json().catch(() => ({}))

  if (body?.action === 'buy_agentic_bridger' || body?.action === 'subscribe_continuance') {
    if (user.role === 'agent') {
      return NextResponse.json({
        success:true,
        result:{success:true,renewed:false,reason:'agent_position_free',flameCoinAmount:0},
        state:await getManagerEmploymentState(user.id),
      })
    }
    const result=await subscribeManagerContinuance(user.id)
    if(!result.success){
      if(result.reason==='insufficient_balance') return NextResponse.json({...result,error:'You need 11 Flame Coin for one-time Agentic-Bridger attainment.'},{status:402})
      return NextResponse.json({success:false,error:'Agentic-Bridger could not be purchased.'},{status:500})
    }
    return NextResponse.json({success:true,result,state:await getManagerEmploymentState(user.id)})
  }

  if (body?.action !== 'accept_document' || body?.documentVersion !== MANAGER_DOCUMENT_VERSION || body?.accepted !== true) {
    return NextResponse.json({ success:false, error:'The current Food Distribution Manager Lifestyle document must be accepted explicitly.' }, { status:400 })
  }

  const result = await acceptManagerEmploymentDocument(user.id, String(body?.signature || ''))
  if (!result.success) {
    if (result.reason === 'continuance_required') {
      return NextResponse.json({
        success:false,
        error:user.role === 'agent'
          ? 'An active Agent account is required before Food Distribution Manager Lifestyle can begin.'
          : 'Attain Agentic-Bridger with one payment of 11 Flame Coin to enable Lifestyle and submit a Food Distribution Manager application.',
      }, { status:403 })
    }
    if (result.reason === 'already_applied') return NextResponse.json({success:false,error:'An application is already recorded. Refresh your verification status.'},{status:409})
    if (result.reason === 'positions_full') {
      return NextResponse.json({ success:false, error:`All ${MANAGER_EMPLOYMENT_LIMIT} Food Distribution Manager positions are currently occupied.` }, { status:409 })
    }
    if (result.reason === 'already_assistant') {
      return NextResponse.json({ success:false, error:'An appointed Assistant Food Distribution Manager cannot simultaneously accept a lead Food Distribution Manager position.' }, { status:409 })
    }
    if (result.reason === 'signature_mismatch') {
      return NextResponse.json({ success:false, error:'The document signature must match the full name on the Agent/Bridger account.' }, { status:400 })
    }
    if (result.reason === 'error') {
      return NextResponse.json({ success:false, error:'Food Distribution Manager Lifestyle could not be recorded.' }, { status:500 })
    }
    return NextResponse.json({ success:false, error:'This account is not eligible for Food Distribution Manager Lifestyle.' }, { status:403 })
  }

  const state = await getManagerEmploymentState(user.id)
  return NextResponse.json({ success:true, created:result.created, state })
}
