import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { syncEmailOutreachFeedback } from '@/lib/weave-mail-feedback'

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='bridger')return NextResponse.json({error:'Bridger access required'},{status:403})
  try{
    const feedback=await syncEmailOutreachFeedback({ownerUserId:user.id,limit:100})
    return NextResponse.json({success:true,feedback})
  }catch(error){
    console.error('[Bridger email feedback sync] failed',error)
    return NextResponse.json({error:error instanceof Error?error.message:'Email feedback sync failed'},{status:500})
  }
}
