import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getProActivationState,signProActivationAgreement,submitProBusinessPlan,submitProPayment,
  getReceivingWallet,publicHeaders,PRO_ACTIVATION_FEE_USDT,PRO_ACTIVATION_NETWORK } from '@/lib/pro-file-folder-activation'
import {getCjSiblingsEvent} from '@/lib/client-siblings-event'
import {getPaidExternalProClientVerification} from '@/lib/pro-file-number-verification'
export const dynamic='force-dynamic'
async function client(request:NextRequest){
  const user=await getAuthUser(request)
  return user?.role==='client'&&user.file_number?user:null
}
export async function GET(request:NextRequest){
  const user=await client(request)
  if(!user)return NextResponse.json({error:'Client account required'},{status:401,headers:publicHeaders})
  const activation=await getProActivationState(user.id,user.file_number!)
  const externalPaid=await getPaidExternalProClientVerification(user.id,user.file_number!)
  const siblingsEvent=await getCjSiblingsEvent(user.id,user.file_number!)
  if(externalPaid&&activation?.status!=='active'){
    return NextResponse.json({success:true,required:true,
      activation:{...activation,status:'company_finalization_pending',fileNumber:user.file_number,
       feeUSDT:PRO_ACTIVATION_FEE_USDT,network:PRO_ACTIVATION_NETWORK,walletAddress:null},
      siblingsEvent},{headers:publicHeaders})
  }
  if(!activation)return NextResponse.json({success:true,required:false,siblingsEvent},{headers:publicHeaders})
  const wallet=await getReceivingWallet()
  return NextResponse.json({success:true,required:true,activation:{
    ...activation,feeUSDT:PRO_ACTIVATION_FEE_USDT,network:PRO_ACTIVATION_NETWORK,
    walletAddress:activation.walletAddress||wallet,
  },siblingsEvent},{headers:publicHeaders})
}
export async function POST(request:NextRequest){
  const user=await client(request)
  if(!user)return NextResponse.json({error:'Client account required'},{status:401,headers:publicHeaders})
  const activation=await getProActivationState(user.id,user.file_number!)
  // Never collect an additional Pro signature, business plan or 680 USDT
  // after external Forensics has verified the original application.
  const externalPaid=await getPaidExternalProClientVerification(user.id,user.file_number!)
  if(externalPaid)return NextResponse.json({
    error:'Your external Pro payment is already verified. Administrations must finalize your existing File Folder; no second payment is required.'
  },{status:409,headers:publicHeaders})
  if(!activation||activation.status==='awaiting_preparation')
    return NextResponse.json({error:'Administrations must first prepare the signed Pro entitlement.'},{status:409,headers:publicHeaders})
  const body=await request.json().catch(()=>({}))
  try{
    let response
    if(body.action==='sign_agreement')response=await signProActivationAgreement(user.id,user.file_number!,String(body.signedName||''),body.acceptedTerms===true)
    else if(body.action==='business_plan')response=await submitProBusinessPlan(user.id,user.file_number!,body.plan||{})
    else if(body.action==='submit_payment')response=await submitProPayment(user.id,user.file_number!,String(body.txHash||''),String(body.expectedWallet||''))
    else return NextResponse.json({error:'Unknown Pro activation action'},{status:400,headers:publicHeaders})
    return NextResponse.json(response,{headers:publicHeaders})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Action unavailable'},{status:409,headers:publicHeaders})}
}
