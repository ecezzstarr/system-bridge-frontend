import {NextRequest,NextResponse} from 'next/server'
import {getProManagerApplicant,signProManagerTerms,submitProManagerPayment,
 PRO_MANAGER_ACTIVATION_FEE_USDT,PRO_MANAGER_NETWORK} from '@/lib/pro-regional-manager-activation'
import {getReceivingWallet} from '@/lib/pro-file-folder-activation'
import {proManagerApprovalState} from '@/lib/pro-regional-manager-profit-share'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}

export async function GET(request:NextRequest){
 try{
  const ctx=await getProManagerApplicant(request)
  if(!ctx)return NextResponse.json({error:'An active Agent or Bridger account with a Pro Regional Manager application is required.'},{status:403,headers})
  const r=ctx.row
  const agreement=proManagerApprovalState(r)
  const paymentReady=r.activation_status==='payment_required'||r.activation_status==='payment_rejected'
  const wallet=paymentReady&&agreement?await getReceivingWallet():null
  return NextResponse.json({success:true,positionType:'pro_regional_manager',
    department:r.source_role==='agent'?'Stability':'Hope',
    applicationStatus:r.application_status,
    businessName:r.business_name,companyRole:r.source_role,
    country:r.operating_country,region:r.operating_region,city:r.operating_city,
    fileNumber:r.file_number||null,
    activation:{status:r.activation_status||'awaiting_company_preparation',
      signedAt:r.signed_at||null,paymentSubmittedAt:r.payment_submitted_at||null,
      paymentVerifiedAt:r.payment_verified_at||null,rejectionReason:r.rejection_reason||null,
      activatedAt:r.activated_at||null},
    salary:{monthlyUSDT:agreement?.model==='legacy_salary'?r.agreed_monthly_salary_usdt:null,
      agreementReference:r.employment_terms_reference},
    compensationModel:agreement?.model||null,profitShareBps:agreement?.profitShareBps||0,
    approvedContinent:agreement?.continent||null,
    walletAddress:wallet,feeUSDT:agreement?.feeUSDT||null,network:PRO_MANAGER_NETWORK,
    notice:agreement?.model==='profit_share'
      ?'Your owned business serves WEAVE. The company receives 20% of independently verified monthly net profit under your accepted terms; no automatic salary or profit-share wallet debit. Only independently verified activation payment unlocks your Folder.'
      :'An existing signed company salary appointment remains separate from this verified activation.'},{headers})
 }catch(e){console.error('[Pro Manager activation GET]',e)
  return NextResponse.json({error:'Unable to load Pro Manager activation'},{status:503,headers})}
}

export async function POST(request:NextRequest){
 try{
  const ctx=await getProManagerApplicant(request)
  if(!ctx)return NextResponse.json({error:'Approved Agent or Bridger application required.'},{status:403,headers})
  if(ctx.row.application_status!=='approved_pending_verification')
   return NextResponse.json({error:'Administrations must approve and independently verify your agreed employment terms first.'},{status:409,headers})
  const body=await request.json().catch(()=>null)
  if(!body||typeof body!=='object')
   return NextResponse.json({error:'Complete the activation request.'},{status:400,headers})
  let result
  if(body.action==='sign_agreement')
   result=await signProManagerTerms(String(ctx.user.id),String(body.signedName||''),body.acceptedTerms===true)
  else if(body.action==='submit_payment')
   result=await submitProManagerPayment(String(ctx.user.id),String(body.txHash||''),String(body.expectedWallet||''))
  else return NextResponse.json({error:'Unknown Pro activation action.'},{status:400,headers})
  return NextResponse.json({success:true,result},{headers})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to update Pro activation'},{status:409,headers})}
}
