import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { syncEmailOutreachFeedback } from '@/lib/weave-mail-feedback'

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='admin')return NextResponse.json({error:'Administration access required'},{status:403})
  try{
    const body=await request.json().catch(()=>({}))
    const feedback=await syncEmailOutreachFeedback({limit:Number(body.limit)||250})
    return NextResponse.json({success:true,feedback})
  }catch(error){
    console.error('[Admin email feedback sync] failed',error)
    return NextResponse.json({error:error instanceof Error?error.message:'Email feedback sync failed'},{status:500})
  }
}
