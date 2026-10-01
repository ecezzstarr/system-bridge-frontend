import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { runAdministrationEmailMovement } from '@/lib/prospect-email-engine'

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='admin')return NextResponse.json({error:'Administration access required'},{status:403})
  try{
    const body=await request.json().catch(()=>({}))
    const report=await runAdministrationEmailMovement({adminId:user.id,limit:Number(body.limit)||undefined})
    return NextResponse.json({success:true,report})
  }catch(error){
    console.error('[admin email movement] failed',error)
    return NextResponse.json({error:error instanceof Error?error.message:'Email movement failed'},{status:500})
  }
}
