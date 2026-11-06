import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getProActivationState,submitProBusinessPlan,submitProPayment,
  getReceivingWallet,publicHeaders,PRO_ACTIVATION_FEE_USDT,PRO_ACTIVATION_NETWORK } from '@/lib/pro-file-folder-activation'
export const dynamic='force-dynamic'
async function client(request:NextRequest){
  const user=await getAuthUser(request)
  return user?.role==='client'&&user.file_number?user:null
}
export async function GET(request:NextRequest){
  const user=await client(request)
  if(!user)return NextResponse.json({error:'Client account required'},{status:401,headers:publicHeaders})
  const activation=await getProActivationState(user.id,user.file_number!)
  if(!activation)return NextResponse.json({success:true,required:false},{headers:publicHeaders})
  const wallet=await getReceivingWallet()
  return NextResponse.json({success:true,required:true,activation:{
    ...activation,feeUSDT:PRO_ACTIVATION_FEE_USDT,network:PRO_ACTIVATION_NETWORK,
    walletAddress:activation.walletAddress||wallet,
  }},{headers:publicHeaders})
}
export async function POST(request:NextRequest){
  const user=await client(request)
  if(!user)return NextResponse.json({error:'Client account required'},{status:401,headers:publicHeaders})
  const activation=await getProActivationState(user.id,user.file_number!)
  if(!activation||activation.status==='awaiting_preparation')
    return NextResponse.json({error:'Administration must first prepare the signed Pro entitlement.'},{status:409,headers:publicHeaders})
  const body=await request.json().catch(()=>({}))
  try{
    let response
    if(body.action==='business_plan')response=await submitProBusinessPlan(user.id,user.file_number!,body.plan||{})
    else if(body.action==='submit_payment')response=await submitProPayment(user.id,user.file_number!,String(body.txHash||''),String(body.expectedWallet||''))
    else return NextResponse.json({error:'Unknown Pro activation action'},{status:400,headers:publicHeaders})
    return NextResponse.json(response,{headers:publicHeaders})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Action unavailable'},{status:409,headers:publicHeaders})}
}
