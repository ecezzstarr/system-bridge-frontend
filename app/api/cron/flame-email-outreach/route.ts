import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { runAdministrationEmailMovement } from '@/lib/prospect-email-engine'
import { hasWeaveSchedulerAuthority } from '@/lib/weave-scheduler-auth'
import { ensureWeaveMailboxSchema } from '@/lib/weave-mailbox'

const WORKFLOW='.github/workflows/flame-email-outreach.yml'

function lagosDate(){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'Africa/Lagos',
    year:'numeric',
    month:'2-digit',
    day:'2-digit',
  }).formatToParts(new Date())
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export async function POST(request:NextRequest){
  const authorized=await hasWeaveSchedulerAuthority(request,{workflowPath:WORKFLOW})
  if(!authorized)return NextResponse.json({error:'Unauthorized'},{status:401})

  const date=lagosDate()
  if(date<'2026-10-01'||date>'2026-12-31'){
    return NextResponse.json({success:true,active:false,date,reason:'Flame Event email movement is outside Company Loop 1'})
  }

  try{
    await ensureWeaveMailboxSchema()
    const admins=await sql`
      SELECT u.id,m.email
      FROM users u
      JOIN weave_mailboxes m ON m.owner_user_id=u.id AND m.status='connected'
      WHERE u.role='admin' AND u.is_active=true
      ORDER BY m.verified_at DESC NULLS LAST,u.created_at ASC
      LIMIT 1
    `
    if(!admins[0]){
      return NextResponse.json({
        error:'No authenticated Administration Google mailbox is connected for Flame Event outreach',
        active:true,
        date,
      },{status:409})
    }

    const configured=Number(process.env.FLAME_EMAIL_DAILY_LIMIT||0)
    const limit=Number.isFinite(configured)&&configured>0?configured:50
    const report=await runAdministrationEmailMovement({adminId:admins[0].id,limit})
    return NextResponse.json({
      success:true,
      active:true,
      date,
      sender:admins[0].email,
      report,
    })
  }catch(error){
    console.error('[Flame email scheduler] failed',error)
    return NextResponse.json({error:error instanceof Error?error.message:'Scheduled email movement failed'},{status:500})
  }
}
