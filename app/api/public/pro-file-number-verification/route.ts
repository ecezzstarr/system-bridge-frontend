import {NextRequest,NextResponse} from 'next/server'
import {
 submitProFileNumberPlan,readProFileNumberVerification,submitProFileNumberPayment,
 proVerificationPublicHeaders
} from '@/lib/pro-file-number-verification'
export const dynamic='force-dynamic'

export async function GET(request:NextRequest){
 try{
  const ticket=request.nextUrl.searchParams.get('ticket')||''
  const row=await readProFileNumberVerification(ticket)
  if(!row)return NextResponse.json({error:'Verification reference unavailable. Open your own saved verification session.'},
   {status:404,headers:proVerificationPublicHeaders})
  return NextResponse.json({success:true,verification:row},{headers:proVerificationPublicHeaders})
 }catch(e){console.error('[Pro file number] read',e)
  return NextResponse.json({error:'Unable to load the private verification status.'},{status:500,headers:proVerificationPublicHeaders})
 }
}
export async function POST(request:NextRequest){
 if(Number(request.headers.get('content-length')||0)>25000)
  return NextResponse.json({error:'Verification form too large.'},{status:413,headers:proVerificationPublicHeaders})
 const body=await request.json().catch(()=>null)
 if(!body||typeof body!=='object')return NextResponse.json({error:'Complete the verification form.'},
  {status:400,headers:proVerificationPublicHeaders})
 try{
  if(body.action==='submit_plan'){
   const result=await submitProFileNumberPlan({
    fileNumber:body.fileNumber,businessName:body.businessName,
    plan:body.plan||{},signedName:body.signedName,termsAccepted:body.termsAccepted,
    operatingCountry:body.operatingCountry,operatingRegion:body.operatingRegion,
    operatingCity:body.operatingCity,contactAddress:body.contactAddress,
    postalCode:body.postalCode,
   })
   return NextResponse.json(result,{status:201,headers:proVerificationPublicHeaders})
  }
  if(body.action==='submit_payment'){
   const result=await submitProFileNumberPayment(
    String(body.ticket||''),String(body.txHash||''),String(body.expectedWallet||''))
   return NextResponse.json(result,{headers:proVerificationPublicHeaders})
  }
  return NextResponse.json({error:'Unknown verification action.'},{status:400,headers:proVerificationPublicHeaders})
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:'Verification unavailable.'},
   {status:409,headers:proVerificationPublicHeaders})
 }
}
