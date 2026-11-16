import { NextRequest,NextResponse } from 'next/server'
import { generateCurrentMonthSupportInstructions } from '@/lib/family-support'
export const dynamic='force-dynamic'
// Configure Cloud Scheduler to POST monthly with this independently stored secret.
// This generates instructions only, never wallet debits or bank payments.
export async function POST(request:NextRequest){
 const secret=process.env.WEAVE_INTERNAL_JOBS_SECRET
 if(!secret||request.headers.get('x-weave-job-secret')!==secret)
  return NextResponse.json({error:'Not authorized'},{status:403})
 try{
  const summary=await generateCurrentMonthSupportInstructions()
  return NextResponse.json({success:true,...summary,transferred:0})
 }catch(error){
  console.error('[Family support monthly scheduler]',error)
  return NextResponse.json({error:'Unable to generate scheduled family support instructions'},{status:500})
 }
}
