import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import {
  acceptManagerEmploymentDocument,
  getManagerEmploymentState,
  MANAGER_EMPLOYMENT_LIMIT,
  MANAGER_MONTHLY_SALARY_NGN,
  MANAGER_PROBATION_TARGET,
  MANAGER_DOCUMENT_VERSION,
} from '@/lib/manager-employment'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (!['agent','bridger'].includes(user.role)) {
    return NextResponse.json({ success:false, error:'Manager employment is available only to Agent or Bridger identities.' }, { status:403 })
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
      coreDuty:'Market WEAVE to prospective Agents and Bridgers and carry verified referral movement.',
    },
  }, { headers:{ 'Cache-Control':'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ success:false, error:'Unauthorized' }, { status:401 })
  if (!['agent','bridger'].includes(user.role)) {
    return NextResponse.json({ success:false, error:'Only an existing Agent or Bridger can enter Manager probation.' }, { status:403 })
  }

  const body = await request.json().catch(() => ({}))
  if (body?.action !== 'accept_document' || body?.documentVersion !== MANAGER_DOCUMENT_VERSION || body?.accepted !== true) {
    return NextResponse.json({ success:false, error:'The current Manager employment document must be accepted explicitly.' }, { status:400 })
  }

  const result = await acceptManagerEmploymentDocument(user.id, String(body?.signature || ''))
  if (!result.success) {
    if (result.reason === 'positions_full') {
      return NextResponse.json({ success:false, error:`All ${MANAGER_EMPLOYMENT_LIMIT} Manager employment positions are currently occupied.` }, { status:409 })
    }
    if (result.reason === 'signature_mismatch') {
      return NextResponse.json({ success:false, error:'The employment signature must match the full name on the Agent/Bridger account.' }, { status:400 })
    }
    if (result.reason === 'error') {
      return NextResponse.json({ success:false, error:'Manager employment could not be recorded.' }, { status:500 })
    }
    return NextResponse.json({ success:false, error:'This account is not eligible for Manager employment.' }, { status:403 })
  }

  const state = await getManagerEmploymentState(user.id)
  return NextResponse.json({ success:true, created:result.created, state })
}
