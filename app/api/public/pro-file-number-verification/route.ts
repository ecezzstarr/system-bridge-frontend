import {NextRequest,NextResponse} from 'next/server'
import {sendVerifiedProClientRegistrationInvite} from '@/lib/pro-client-registration-invitation'
import {notifyAdministrationsActivity} from '@/lib/administrations-activity-notifications'
import {
 submitProFileNumberPlan,readProFileNumberVerification,submitProFileNumberPayment,
 proVerificationPublicHeaders
} from '@/lib/pro-file-number-verification'
export const dynamic='force-dynamic'
const SAVED_VERIFICATION_COOKIE='weave_pro_staff_verification'
const SAVED_VERIFICATION_MAX_AGE=60*60*24*180

function rememberVerification(response:NextResponse,ticket:string){
 response.cookies.set(SAVED_VERIFICATION_COOKIE,ticket.toLowerCase(),{
  httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',
  path:'/api/public/pro-file-number-verification',maxAge:SAVED_VERIFICATION_MAX_AGE,
 })
 return response
}

export async function GET(request:NextRequest){
 try{
  const ticket=request.nextUrl.searchParams.get('ticket')||request.cookies.get(SAVED_VERIFICATION_COOKIE)?.value||''
  const row=await readProFileNumberVerification(ticket)
  if(!row)return NextResponse.json({error:'Verification reference unavailable. Open your own saved verification session.'},
   {status:404,headers:proVerificationPublicHeaders})
  return rememberVerification(NextResponse.json({success:true,verification:row},{headers:proVerificationPublicHeaders}),ticket)
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
   // An existing private browser session must resume its database stage, rather
   // than submit another signed application for the same File Number.
   const savedTicket=request.cookies.get(SAVED_VERIFICATION_COOKIE)?.value||''
   if(savedTicket){
    const existing=await readProFileNumberVerification(savedTicket)
    if(existing&&existing.fileNumber===String(body.fileNumber||'').trim().toUpperCase()){
     return rememberVerification(NextResponse.json({
      success:true,reference:existing.reference,ticket:savedTicket,
      status:existing.status,resumed:true,
     },{headers:proVerificationPublicHeaders}),savedTicket)
    }
   }
   const result=await submitProFileNumberPlan({
    fileNumber:body.fileNumber,businessName:body.businessName,
    plan:body.plan||{},signedName:body.signedName,termsAccepted:body.termsAccepted,
    operatingCountry:body.operatingCountry,operatingRegion:body.operatingRegion,
    operatingCity:body.operatingCity,contactAddress:body.contactAddress,
    postalCode:body.postalCode,
   })
   await notifyAdministrationsActivity({
    event:'pro_staff_verification_submitted',eventId:result.reference,
    title:'Pro File Number verification awaits Administrations',
    content:'A new signed Pro File Folder business application was submitted for review. Confirm the original File Number, business plan, identity and approved staff appointment before authorizing payment.',
    adminPath:'/admin/pro-file-number-verifications',
    actorName:'WEAVE Pro Verification',
   })
   return rememberVerification(NextResponse.json(result,{status:201,headers:proVerificationPublicHeaders}),result.ticket)
  }
  if(body.action==='send_registration_invite'){
   const result=await sendVerifiedProClientRegistrationInvite(
    String(body.ticket||request.cookies.get(SAVED_VERIFICATION_COOKIE)?.value||''),request.nextUrl.origin)
   return NextResponse.json(result,{headers:proVerificationPublicHeaders})
  }
  if(body.action==='submit_payment'){
   const result=await submitProFileNumberPayment(
    String(body.ticket||request.cookies.get(SAVED_VERIFICATION_COOKIE)?.value||''),String(body.txHash||''),String(body.expectedWallet||''))
   await notifyAdministrationsActivity({
    event:'pro_staff_payment_evidence',eventId:result.reference,
    title:'Pro File Folder payment evidence needs Forensics',
    content:'A Pro employee submitted blockchain payment evidence. Independently check network, exact receiving wallet, amount and transaction hash; this is not yet verified income.',
    adminPath:'/admin/pro-file-number-verifications',
    actorName:'WEAVE Pro Verification',
   })
   return NextResponse.json(result,{headers:proVerificationPublicHeaders})
  }
  return NextResponse.json({error:'Unknown verification action.'},{status:400,headers:proVerificationPublicHeaders})
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:'Verification unavailable.'},
   {status:409,headers:proVerificationPublicHeaders})
 }
}

/** Leave an earlier staff verification only when the person deliberately
 * chooses to use another File Number on this shared browser. */
export async function DELETE(){
 const response=NextResponse.json({success:true},{headers:proVerificationPublicHeaders})
 response.cookies.set(SAVED_VERIFICATION_COOKIE,'',{
  httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',
  path:'/api/public/pro-file-number-verification',maxAge:0,
 })
 return response
}
