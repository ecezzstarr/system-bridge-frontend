import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { sql } from '@/lib/db'
import { runAdministrationEmailMovement } from '@/lib/prospect-email-engine'

function safeEqual(a:string,b:string){
  const left=Buffer.from(a)
  const right=Buffer.from(b)
  return left.length===right.length&&crypto.timingSafeEqual(left,right)
}

export async function POST(request:NextRequest){
  const expected=String(process.env.WEAVE_CRON_SECRET||'')
  const supplied=String(request.headers.get('x-weave-cron-secret')||'')
  if(!expected||!supplied||!safeEqual(expected,supplied)){
    return NextResponse.json({error:'Unauthorized scheduler call'},{status:401})
  }

  try{
    const admins=await sql`
      SELECT id FROM users
      WHERE role='admin' AND is_active=true
      ORDER BY created_at ASC
      LIMIT 1
    `
    if(!admins[0])return NextResponse.json({error:'No active Administration account'},{status:503})
    const report=await runAdministrationEmailMovement({adminId:admins[0].id})
    return NextResponse.json({success:true,report})
  }catch(error){
    console.error('[Flame email scheduler] failed',error)
    return NextResponse.json({error:error instanceof Error?error.message:'Scheduled email movement failed'},{status:500})
  }
}
