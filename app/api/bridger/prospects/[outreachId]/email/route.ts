import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sendEmailOutreach } from '@/lib/prospect-email-engine'

export async function POST(
  request:NextRequest,
  {params}:{params:Promise<{outreachId:string}>},
){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  if(user.role!=='bridger')return NextResponse.json({error:'Bridger access required'},{status:403})
  const {outreachId}=await params
  try{
    const result=await sendEmailOutreach({outreachId,senderUserId:user.id})
    return NextResponse.json({success:true,...result})
  }catch(error){
    console.error('[Bridger email outreach] failed',error)
    return NextResponse.json({error:error instanceof Error?error.message:'Email send failed'},{status:400})
  }
}
