import { NextRequest,NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { logAudit } from '@/lib/db'
import { runWeaveIntegrityEngine } from '@/lib/weave-integrity-engine'

export const dynamic='force-dynamic'

const INTEGRITY_API_TIMEOUT_MS=18000

async function runWithDeadline(mode:'scan'|'repair'){
  let timer:ReturnType<typeof setTimeout>|undefined
  try{
    return await Promise.race([
      runWeaveIntegrityEngine(mode),
      new Promise<never>((_,reject)=>{
        timer=setTimeout(()=>reject(new Error('Integrity Engine timed out while reading live system state')),INTEGRITY_API_TIMEOUT_MS)
      }),
    ])
  }finally{
    if(timer)clearTimeout(timer)
  }
}

export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  if(user.role!=='admin')return NextResponse.json({success:false,error:'Administration access required'},{status:403})

  try{
    const report=await runWithDeadline('scan')
    return NextResponse.json(report,{headers:{'Cache-Control':'private, no-store'}})
  }catch(error:any){
    console.error('[Integrity Engine scan]',error)
    return NextResponse.json({
      success:false,
      error:error?.message||'Integrity scan failed',
    },{status:500})
  }
}

export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  if(user.role!=='admin')return NextResponse.json({success:false,error:'Administration access required'},{status:403})

  const body=await request.json().catch(()=>({}))
  const action=String(body.action||'repair_safe')
  if(!['scan','repair_safe'].includes(action)){
    return NextResponse.json({success:false,error:'Unknown Integrity Engine action'},{status:400})
  }

  try{
    const report=await runWithDeadline(action==='scan'?'scan':'repair')
    await logAudit(user.id,action==='scan'?'integrity_engine.scan':'integrity_engine.repair_safe',{
      summary:report.summary,
      repairs:report.repairs,
      checks:report.checks.map(check=>({
        key:check.key,
        status:check.status,
        count:check.count,
      })),
    })
    return NextResponse.json(report,{headers:{'Cache-Control':'private, no-store'}})
  }catch(error:any){
    console.error('[Integrity Engine action]',error)
    return NextResponse.json({
      success:false,
      error:error?.message||'Integrity Engine action failed',
    },{status:500})
  }
}
